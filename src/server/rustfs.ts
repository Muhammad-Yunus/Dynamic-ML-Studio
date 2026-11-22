import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

export interface RustFSObjectMeta {
  key: string;
  size: number;
  lastModified: string;
  backend: 'rustfs-s3' | 'rustfs-local';
}

const BUCKET = process.env.RUSTFS_BUCKET?.trim() || 'dynamic-ml-studio';
const LOCAL_ROOT = path.resolve(process.cwd(), '.rustfs-storage', BUCKET);

function getS3Client(): S3Client | null {
  const endpoint = process.env.RUSTFS_ENDPOINT?.trim();
  const accessKeyId = process.env.RUSTFS_ACCESS_KEY?.trim();
  const secretAccessKey = process.env.RUSTFS_SECRET_KEY?.trim();
  const region = process.env.RUSTFS_REGION?.trim() || 'us-east-1';

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

let s3Client: S3Client | null = null;
let bucketReady = false;

async function ensureS3Bucket(): Promise<S3Client | null> {
  if (!s3Client) {
    s3Client = getS3Client();
  }
  if (!s3Client) return null;
  if (bucketReady) return s3Client;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    bucketReady = true;
  } catch {
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET }));
      bucketReady = true;
    } catch (err: any) {
      console.warn('[RustFS] S3 bucket check/create failed, using local RustFS store:', err?.message || err);
      s3Client = null;
      return null;
    }
  }
  return s3Client;
}

function resolveSafeLocalPath(key: string): string {
  const cleanKey = key.replace(/^\/+/, '').replace(/\.\./g, '');
  if (!fs.existsSync(LOCAL_ROOT)) {
    fs.mkdirSync(LOCAL_ROOT, { recursive: true });
  }
  const resolved = path.resolve(LOCAL_ROOT, cleanKey);
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) {
    throw new Error('Invalid RustFS object key path');
  }
  return resolved;
}

export async function putRustFSObject(
  key: string,
  body: Buffer | string,
  contentType = 'application/octet-stream'
): Promise<{ key: string; sizeBytes: number; backend: 'rustfs-s3' | 'rustfs-local' }> {
  const buf = typeof body === 'string' ? Buffer.from(body, 'utf-8') : body;
  const client = await ensureS3Bucket();

  if (client) {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buf,
        ContentType: contentType,
      })
    );
    return { key, sizeBytes: buf.byteLength, backend: 'rustfs-s3' };
  }

  const target = resolveSafeLocalPath(key);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buf);
  return { key, sizeBytes: buf.byteLength, backend: 'rustfs-local' };
}

export async function getRustFSObject(key: string): Promise<Buffer | null> {
  const client = await ensureS3Bucket();
  if (client) {
    try {
      const resp = await client.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: key,
        })
      );
      if (!resp.Body) return null;
      const bytes = await resp.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  }

  const target = resolveSafeLocalPath(key);
  if (!fs.existsSync(target)) return null;
  return fs.readFileSync(target);
}

export async function deleteRustFSObject(key: string): Promise<void> {
  const client = await ensureS3Bucket();
  if (client) {
    await client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    return;
  }

  const target = resolveSafeLocalPath(key);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}

export async function listRustFSObjects(prefix = ''): Promise<RustFSObjectMeta[]> {
  const client = await ensureS3Bucket();
  if (client) {
    const resp = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
      })
    );
    return (resp.Contents || []).map((obj) => ({
      key: obj.Key || '',
      size: obj.Size || 0,
      lastModified: (obj.LastModified || new Date()).toISOString(),
      backend: 'rustfs-s3' as const,
    }));
  }

  const results: RustFSObjectMeta[] = [];
  if (!fs.existsSync(LOCAL_ROOT)) return results;

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const rel = path.relative(LOCAL_ROOT, full).replace(/\\/g, '/');
        if (!prefix || rel.startsWith(prefix)) {
          const stat = fs.statSync(full);
          results.push({
            key: rel,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            backend: 'rustfs-local',
          });
        }
      }
    }
  }

  walk(LOCAL_ROOT);
  return results;
}

export function getRustFSStatus() {
  const endpoint = process.env.RUSTFS_ENDPOINT?.trim();
  return {
    mode: endpoint ? 'rustfs-s3' : 'rustfs-local',
    bucket: BUCKET,
    endpoint: endpoint || 'local-bucket',
  };
}

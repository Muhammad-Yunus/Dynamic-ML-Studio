import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';
import { createServer as createViteServer } from 'vite';
import { initDatabase, isDbConnected } from './src/db/index';
import {
  attachOptionalAuth,
  AuthenticatedRequest,
  createSessionToken,
  hashPassword,
  requireAuth,
  verifyPassword,
} from './src/server/auth';
import { getRustFSObject, getRustFSStatus, putRustFSObject } from './src/server/rustfs';
import {
  createDatasetRecord,
  createUser,
  createWebServiceRecord,
  findUserByEmail,
  getDatasetById,
  getModelByIdUnscoped,
  getTrainedModelById,
  getWebServiceBySlug,
  incrementWebServiceCalls,
  listExperimentRuns,
  listExperiments,
  listTrainedModels,
  listUserDatasets,
  listWebServices,
  recordExperimentRun,
  upsertExperiment,
} from './src/server/store';
import {
  executeMLPipeline,
  predictWithSerializedModel,
  SerializedTorchModel,
} from './src/server/ml-engine';
import {
  BUILTIN_SAMPLE_DATASETS,
  inferDatasetColumns,
  SAMPLE_DATASET_MAP,
} from './src/shared/sampleDatasets';
import { PipelineGraph } from './src/shared/types';

async function bootstrap() {
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use(attachOptionalAuth);

  // Health & Infrastructure status
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      postgres: isDbConnected(),
      rustfs: getRustFSStatus(),
    });
  });

  // ---------------- AUTH ROUTES ----------------
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body || {};
      if (typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ error: 'Valid email address is required.' });
        return;
      }
      if (typeof password !== 'string' || password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }
      const existing = await findUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }
      const user = await createUser({
        email,
        displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : email.split('@')[0],
        passwordHash: hashPassword(password),
      });
      const token = createSessionToken(user);
      res.status(201).json({ token, user });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Registration failed.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }
      const existing = await findUserByEmail(email);
      if (!existing || !verifyPassword(password, existing.passwordHash)) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      const user = {
        id: existing.id,
        email: existing.email,
        displayName: existing.displayName,
        role: existing.role,
      };
      const token = createSessionToken(user);
      res.json({ token, user });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Sign in failed.' });
    }
  });

  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user || null });
  });

  // ---------------- EXPERIMENTS ----------------
  app.get('/api/experiments', async (req: AuthenticatedRequest, res) => {
    try {
      const list = await listExperiments(req.user?.id || null);
      res.json({ experiments: list });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load experiments.' });
    }
  });

  app.post('/api/experiments', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id, title, description, status, graphJson } = req.body || {};
      if (typeof title !== 'string' || !title.trim()) {
        res.status(400).json({ error: 'Experiment title is required.' });
        return;
      }
      if (!graphJson || !Array.isArray(graphJson.nodes) || !Array.isArray(graphJson.edges)) {
        res.status(400).json({ error: 'Valid pipeline graphJson is required.' });
        return;
      }
      const saved = await upsertExperiment({
        id: typeof id === 'string' ? id : undefined,
        userId: req.user!.id,
        title: title.trim(),
        description: typeof description === 'string' ? description : '',
        status: typeof status === 'string' ? status : 'Saved',
        graphJson: graphJson as PipelineGraph,
      });
      res.json({ experiment: saved });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save experiment.' });
    }
  });

  // ---------------- DATASETS (RustFS + Postgres) ----------------
  app.get('/api/datasets', async (req: AuthenticatedRequest, res) => {
    try {
      const userDatasets = await listUserDatasets(req.user?.id || null);
      const samples = BUILTIN_SAMPLE_DATASETS.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        format: 'csv',
        rowCount: s.rows.length,
        columnCount: Object.keys(s.rows[0] || {}).length,
        columns: inferDatasetColumns(s.rows),
        rustfsKey: `samples/${s.id}.csv`,
        sizeBytes: JSON.stringify(s.rows).length,
        isSample: true,
        createdAt: new Date().toISOString(),
      }));
      res.json({ datasets: [...userDatasets, ...samples] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to list datasets.' });
    }
  });

  app.get('/api/datasets/:id/preview', async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      if (SAMPLE_DATASET_MAP[id]) {
        const s = SAMPLE_DATASET_MAP[id];
        res.json({
          name: s.name,
          columns: inferDatasetColumns(s.rows),
          rows: s.rows.slice(0, 50),
          totalRows: s.rows.length,
        });
        return;
      }
      const ds = await getDatasetById(id, req.user?.id || null);
      if (!ds) {
        res.status(404).json({ error: 'Dataset not found.' });
        return;
      }
      const buf = await getRustFSObject(ds.rustfsKey);
      if (!buf) {
        res.status(404).json({ error: 'Dataset file not found in RustFS.' });
        return;
      }
      const parsed = Papa.parse<Record<string, any>>(buf.toString('utf-8'), {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      res.json({
        name: ds.name,
        columns: ds.columns,
        rows: parsed.data.slice(0, 50),
        totalRows: parsed.data.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to preview dataset.' });
    }
  });

  app.post('/api/datasets/upload', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, description, csvContent } = req.body || {};
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Dataset name is required.' });
        return;
      }
      if (typeof csvContent !== 'string' || !csvContent.trim()) {
        res.status(400).json({ error: 'CSV content is required.' });
        return;
      }
      const parsed = Papa.parse<Record<string, any>>(csvContent.trim(), {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      if (!parsed.data || parsed.data.length === 0) {
        res.status(400).json({ error: 'CSV parsed 0 rows. Ensure header row and data rows are present.' });
        return;
      }
      const columns = inferDatasetColumns(parsed.data);
      const safeName = name.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
      const rustfsKey = `datasets/${req.user!.id}/${Date.now()}_${safeName}.csv`;
      const stored = await putRustFSObject(rustfsKey, csvContent.trim(), 'text/csv');

      const record = await createDatasetRecord({
        userId: req.user!.id,
        name: name.trim(),
        description: typeof description === 'string' ? description : '',
        format: 'csv',
        rowCount: parsed.data.length,
        columnCount: columns.length,
        columns,
        rustfsKey: stored.key,
        sizeBytes: stored.sizeBytes,
      });
      res.status(201).json({ dataset: record, storageBackend: stored.backend });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Dataset upload failed.' });
    }
  });

  // ---------------- PIPELINE EXECUTION (TorchJS) ----------------
  app.post('/api/pipelines/run', async (req: AuthenticatedRequest, res) => {
    try {
      const { graphJson, experimentId } = req.body || {};
      if (!graphJson || !Array.isArray(graphJson.nodes) || !Array.isArray(graphJson.edges)) {
        res.status(400).json({ error: 'Valid pipeline graphJson is required.' });
        return;
      }
      const result = await executeMLPipeline({
        graph: graphJson as PipelineGraph,
        userId: req.user?.id || null,
        experimentId: typeof experimentId === 'string' ? experimentId : null,
      });
      if (req.user) {
        await recordExperimentRun({
          experimentId: typeof experimentId === 'string' ? experimentId : null,
          userId: req.user.id,
          status: result.status,
          durationMs: result.durationMs,
          nodeResultsJson: result.nodeResults,
          logsJson: result.logs,
        });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Pipeline execution failed.' });
    }
  });

  app.get('/api/runs', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const runs = await listExperimentRuns(req.user!.id);
      res.json({ runs });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch run history.' });
    }
  });

  // ---------------- TRAINED MODELS (RustFS) ----------------
  app.get('/api/models', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const models = await listTrainedModels(req.user!.id);
      res.json({ models });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch trained models.' });
    }
  });

  app.get('/api/models/:id/download', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const model = await getTrainedModelById(String(req.params.id), req.user!.id);
      if (!model) {
        res.status(404).json({ error: 'Trained model not found.' });
        return;
      }
      const buf = await getRustFSObject(model.rustfsKey);
      if (!buf) {
        res.status(404).json({ error: 'Model artifact missing in RustFS.' });
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${model.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.torchjs.json"`);
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Model download failed.' });
    }
  });

  // ---------------- WEB SERVICES (Inference Endpoints) ----------------
  app.get('/api/webservices', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const services = await listWebServices(req.user!.id);
      res.json({ webServices: services });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to list web services.' });
    }
  });

  app.post('/api/webservices', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { modelId, name } = req.body || {};
      if (typeof modelId !== 'string' || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'modelId and service name are required.' });
        return;
      }
      const model = await getTrainedModelById(modelId, req.user!.id);
      if (!model) {
        res.status(404).json({ error: 'Trained model not found in your workspace.' });
        return;
      }
      const slugBase = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const slug = `${slugBase || 'service'}-${crypto.randomBytes(3).toString('hex')}`;
      const inputSchema = (model.featureColumnsJson || []).map((col) => ({
        name: col,
        type: 'string|number',
        example: '',
      }));
      const service = await createWebServiceRecord({
        userId: req.user!.id,
        modelId: model.id,
        name: name.trim(),
        endpointSlug: slug,
        inputSchemaJson: inputSchema,
      });
      res.status(201).json({ webService: service });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to deploy web service.' });
    }
  });

  app.post('/api/predict/:slug', async (req, res) => {
    try {
      const service = await getWebServiceBySlug(String(req.params.slug));
      if (!service || !service.isActive) {
        res.status(404).json({ error: 'Web service endpoint not found or inactive.' });
        return;
      }
      const model = await getModelByIdUnscoped(service.modelId);
      if (!model) {
        res.status(404).json({ error: 'Backing trained model not found.' });
        return;
      }
      const buf = await getRustFSObject(model.rustfsKey);
      if (!buf) {
        res.status(404).json({ error: 'Model artifact missing in RustFS.' });
        return;
      }
      const serialized = JSON.parse(buf.toString('utf-8')) as SerializedTorchModel;
      const inputs = Array.isArray(req.body?.rows) ? req.body.rows : [req.body?.input || req.body || {}];
      const { scoredRows, predictions } = predictWithSerializedModel(serialized, inputs);
      await incrementWebServiceCalls(service.id);
      res.json({
        service: service.name,
        algorithm: serialized.algorithmId,
        predictions,
        scoredRows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Prediction failed.' });
    }
  });

  // ---------------- VITE / STATIC SERVING ----------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Dynamic ML Studio] Server listening on http://0.0.0.0:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

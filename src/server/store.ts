import crypto from 'crypto';
import { eq, desc, and, or } from 'drizzle-orm';
import { getDb, isDbConnected } from '../db/index';
import {
  users,
  experiments,
  datasets,
  trainedModels,
  experimentRuns,
  webServices,
} from '../db/schema';
import {
  AuthUser,
  DatasetColumnMeta,
  DatasetRecord,
  ExperimentSummary,
  PipelineGraph,
  TrainedModelRecord,
  WebServiceRecord,
} from '../shared/types';
import { DEFAULT_GETTING_STARTED_GRAPH } from '../shared/catalog';

// Fallback in-memory stores when DB env vars are not yet configured
const memUsers = new Map<string, { id: string; email: string; displayName: string; passwordHash: string; role: string; createdAt: Date }>();
const memExperiments = new Map<string, any>();
const memDatasets = new Map<string, any>();
const memModels = new Map<string, any>();
const memRuns = new Map<string, any>();
const memServices = new Map<string, any>();

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    return rows[0] || null;
  }
  for (const u of memUsers.values()) {
    if (u.email === normalized) return u;
  }
  return null;
}

export async function findUserById(id: string) {
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] || null;
  }
  return memUsers.get(id) || null;
}

export async function createUser(data: {
  email: string;
  displayName: string;
  passwordHash: string;
}): Promise<AuthUser> {
  const normalized = data.email.trim().toLowerCase();
  const db = getDb();
  if (db && isDbConnected()) {
    const [inserted] = await db
      .insert(users)
      .values({
        email: normalized,
        displayName: data.displayName.trim(),
        passwordHash: data.passwordHash,
        role: 'user',
      })
      .returning();
    return {
      id: inserted.id,
      email: inserted.email,
      displayName: inserted.displayName,
      role: inserted.role,
    };
  }
  const id = crypto.randomUUID();
  const record = {
    id,
    email: normalized,
    displayName: data.displayName.trim(),
    passwordHash: data.passwordHash,
    role: 'user',
    createdAt: new Date(),
  };
  memUsers.set(id, record);
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    role: record.role,
  };
}

export async function listExperiments(userId: string | null): Promise<ExperimentSummary[]> {
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = userId
      ? await db
          .select()
          .from(experiments)
          .where(or(eq(experiments.userId, userId), eq(experiments.isSample, true)))
          .orderBy(desc(experiments.updatedAt))
      : await db
          .select()
          .from(experiments)
          .where(eq(experiments.isSample, true))
          .orderBy(desc(experiments.updatedAt));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      isSample: r.isSample,
      graphJson: r.graphJson as PipelineGraph,
      updatedAt: r.updatedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  const list = Array.from(memExperiments.values())
    .filter((e) => e.isSample || (userId && e.userId === userId))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  if (list.length === 0) {
    return [
      {
        id: 'sample-getting-started',
        title: 'Getting Started with Dynamic ML Studio',
        description: 'Sample binary income classification pipeline using Clean Missing Data, Split Data, Two-Class Logistic Regression, Train Model, and Score Model.',
        status: 'In draft',
        isSample: true,
        graphJson: DEFAULT_GETTING_STARTED_GRAPH,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return list.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    isSample: r.isSample,
    graphJson: r.graphJson,
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function upsertExperiment(params: {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  status?: string;
  graphJson: PipelineGraph;
}): Promise<ExperimentSummary> {
  const db = getDb();
  if (db && isDbConnected()) {
    if (params.id && !params.id.startsWith('sample-')) {
      const existing = await db
        .select()
        .from(experiments)
        .where(and(eq(experiments.id, params.id), eq(experiments.userId, params.userId)))
        .limit(1);
      if (existing[0]) {
        const [updated] = await db
          .update(experiments)
          .set({
            title: params.title,
            description: params.description ?? existing[0].description,
            status: params.status ?? existing[0].status,
            graphJson: params.graphJson,
            updatedAt: new Date(),
          })
          .where(and(eq(experiments.id, params.id), eq(experiments.userId, params.userId)))
          .returning();
        return {
          id: updated.id,
          title: updated.title,
          description: updated.description,
          status: updated.status,
          isSample: updated.isSample,
          graphJson: updated.graphJson as PipelineGraph,
          updatedAt: updated.updatedAt.toISOString(),
          createdAt: updated.createdAt.toISOString(),
        };
      }
    }

    const [created] = await db
      .insert(experiments)
      .values({
        userId: params.userId,
        title: params.title,
        description: params.description || '',
        status: params.status || 'In draft',
        graphJson: params.graphJson,
        isSample: false,
      })
      .returning();
    return {
      id: created.id,
      title: created.title,
      description: created.description,
      status: created.status,
      isSample: created.isSample,
      graphJson: created.graphJson as PipelineGraph,
      updatedAt: created.updatedAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
    };
  }

  const id =
    params.id && !params.id.startsWith('sample-') && memExperiments.has(params.id)
      ? params.id
      : crypto.randomUUID();
  const existing = memExperiments.get(id);
  const now = new Date();
  const rec = {
    id,
    userId: params.userId,
    title: params.title,
    description: params.description || '',
    status: params.status || 'In draft',
    graphJson: params.graphJson,
    isSample: false,
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  };
  memExperiments.set(id, rec);
  return {
    ...rec,
    updatedAt: rec.updatedAt.toISOString(),
    createdAt: rec.createdAt.toISOString(),
  };
}

export async function createDatasetRecord(params: {
  userId: string;
  name: string;
  description?: string;
  format: string;
  rowCount: number;
  columnCount: number;
  columns: DatasetColumnMeta[];
  rustfsKey: string;
  sizeBytes: number;
}): Promise<DatasetRecord> {
  const db = getDb();
  if (db && isDbConnected()) {
    const [row] = await db
      .insert(datasets)
      .values({
        userId: params.userId,
        name: params.name,
        description: params.description || '',
        format: params.format,
        rowCount: params.rowCount,
        columnCount: params.columnCount,
        columnsJson: params.columns,
        rustfsKey: params.rustfsKey,
        sizeBytes: params.sizeBytes,
        isSample: false,
      })
      .returning();
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      format: row.format,
      rowCount: row.rowCount,
      columnCount: row.columnCount,
      columns: row.columnsJson as DatasetColumnMeta[],
      rustfsKey: row.rustfsKey,
      sizeBytes: row.sizeBytes,
      isSample: row.isSample,
      createdAt: row.createdAt.toISOString(),
    };
  }

  const id = crypto.randomUUID();
  const rec = {
    id,
    userId: params.userId,
    name: params.name,
    description: params.description || '',
    format: params.format,
    rowCount: params.rowCount,
    columnCount: params.columnCount,
    columns: params.columns,
    rustfsKey: params.rustfsKey,
    sizeBytes: params.sizeBytes,
    isSample: false,
    createdAt: new Date(),
  };
  memDatasets.set(id, rec);
  return { ...rec, createdAt: rec.createdAt.toISOString() };
}

export async function listUserDatasets(userId: string | null): Promise<DatasetRecord[]> {
  if (!userId) return [];
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = await db
      .select()
      .from(datasets)
      .where(eq(datasets.userId, userId))
      .orderBy(desc(datasets.createdAt));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      format: row.format,
      rowCount: row.rowCount,
      columnCount: row.columnCount,
      columns: row.columnsJson as DatasetColumnMeta[],
      rustfsKey: row.rustfsKey,
      sizeBytes: row.sizeBytes,
      isSample: row.isSample,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  return Array.from(memDatasets.values())
    .filter((d) => d.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }));
}

export async function getDatasetById(datasetId: string, userId: string | null): Promise<DatasetRecord | null> {
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = await db.select().from(datasets).where(eq(datasets.id, datasetId)).limit(1);
    const row = rows[0];
    if (!row) return null;
    if (!row.isSample && row.userId !== userId) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      format: row.format,
      rowCount: row.rowCount,
      columnCount: row.columnCount,
      columns: row.columnsJson as DatasetColumnMeta[],
      rustfsKey: row.rustfsKey,
      sizeBytes: row.sizeBytes,
      isSample: row.isSample,
      createdAt: row.createdAt.toISOString(),
    };
  }
  const d = memDatasets.get(datasetId);
  if (!d) return null;
  if (!d.isSample && d.userId !== userId) return null;
  return { ...d, createdAt: d.createdAt.toISOString() };
}

export async function createTrainedModelRecord(params: {
  userId: string;
  experimentId?: string | null;
  name: string;
  algorithm: string;
  taskType: string;
  metricsJson: Record<string, any>;
  hyperparamsJson: Record<string, any>;
  featureColumnsJson: string[];
  targetColumn: string | null;
  rustfsKey: string;
}): Promise<TrainedModelRecord> {
  const db = getDb();
  if (db && isDbConnected()) {
    const [row] = await db
      .insert(trainedModels)
      .values({
        userId: params.userId,
        experimentId: params.experimentId && !params.experimentId.startsWith('sample-') ? params.experimentId : null,
        name: params.name,
        algorithm: params.algorithm,
        taskType: params.taskType,
        metricsJson: params.metricsJson,
        hyperparamsJson: params.hyperparamsJson,
        featureColumnsJson: params.featureColumnsJson,
        targetColumn: params.targetColumn,
        rustfsKey: params.rustfsKey,
      })
      .returning();
    return {
      id: row.id,
      experimentId: row.experimentId,
      name: row.name,
      algorithm: row.algorithm,
      taskType: row.taskType,
      metricsJson: row.metricsJson as Record<string, any>,
      hyperparamsJson: row.hyperparamsJson as Record<string, any>,
      featureColumnsJson: row.featureColumnsJson as string[],
      targetColumn: row.targetColumn,
      rustfsKey: row.rustfsKey,
      createdAt: row.createdAt.toISOString(),
    };
  }

  const id = crypto.randomUUID();
  const rec = {
    id,
    userId: params.userId,
    experimentId: params.experimentId || null,
    name: params.name,
    algorithm: params.algorithm,
    taskType: params.taskType,
    metricsJson: params.metricsJson,
    hyperparamsJson: params.hyperparamsJson,
    featureColumnsJson: params.featureColumnsJson,
    targetColumn: params.targetColumn,
    rustfsKey: params.rustfsKey,
    createdAt: new Date(),
  };
  memModels.set(id, rec);
  return { ...rec, createdAt: rec.createdAt.toISOString() };
}

export async function listTrainedModels(userId: string | null): Promise<TrainedModelRecord[]> {
  if (!userId) return [];
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = await db
      .select()
      .from(trainedModels)
      .where(eq(trainedModels.userId, userId))
      .orderBy(desc(trainedModels.createdAt));
    return rows.map((row) => ({
      id: row.id,
      experimentId: row.experimentId,
      name: row.name,
      algorithm: row.algorithm,
      taskType: row.taskType,
      metricsJson: row.metricsJson as Record<string, any>,
      hyperparamsJson: row.hyperparamsJson as Record<string, any>,
      featureColumnsJson: row.featureColumnsJson as string[],
      targetColumn: row.targetColumn,
      rustfsKey: row.rustfsKey,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  return Array.from(memModels.values())
    .filter((m) => m.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
}

export async function getTrainedModelById(modelId: string, userId: string): Promise<TrainedModelRecord | null> {
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = await db
      .select()
      .from(trainedModels)
      .where(and(eq(trainedModels.id, modelId), eq(trainedModels.userId, userId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      experimentId: row.experimentId,
      name: row.name,
      algorithm: row.algorithm,
      taskType: row.taskType,
      metricsJson: row.metricsJson as Record<string, any>,
      hyperparamsJson: row.hyperparamsJson as Record<string, any>,
      featureColumnsJson: row.featureColumnsJson as string[],
      targetColumn: row.targetColumn,
      rustfsKey: row.rustfsKey,
      createdAt: row.createdAt.toISOString(),
    };
  }
  const m = memModels.get(modelId);
  if (!m || m.userId !== userId) return null;
  return { ...m, createdAt: m.createdAt.toISOString() };
}

export async function recordExperimentRun(params: {
  experimentId?: string | null;
  userId: string;
  status: string;
  durationMs: number;
  nodeResultsJson: any;
  logsJson: string[];
}) {
  const db = getDb();
  if (db && isDbConnected()) {
    const [row] = await db
      .insert(experimentRuns)
      .values({
        experimentId: params.experimentId && !params.experimentId.startsWith('sample-') ? params.experimentId : null,
        userId: params.userId,
        status: params.status,
        durationMs: params.durationMs,
        finishedAt: new Date(),
        nodeResultsJson: params.nodeResultsJson,
        logsJson: params.logsJson,
      })
      .returning();
    return row;
  }

  const id = crypto.randomUUID();
  const rec = {
    id,
    experimentId: params.experimentId || null,
    userId: params.userId,
    status: params.status,
    startedAt: new Date(),
    finishedAt: new Date(),
    durationMs: params.durationMs,
    nodeResultsJson: params.nodeResultsJson,
    logsJson: params.logsJson,
  };
  memRuns.set(id, rec);
  return rec;
}

export async function listExperimentRuns(userId: string | null) {
  if (!userId) return [];
  const db = getDb();
  if (db && isDbConnected()) {
    return db
      .select()
      .from(experimentRuns)
      .where(eq(experimentRuns.userId, userId))
      .orderBy(desc(experimentRuns.startedAt))
      .limit(30);
  }
  return Array.from(memRuns.values())
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, 30);
}

export async function createWebServiceRecord(params: {
  userId: string;
  modelId: string;
  name: string;
  endpointSlug: string;
  inputSchemaJson: { name: string; type: string; example: any }[];
}): Promise<WebServiceRecord> {
  const db = getDb();
  if (db && isDbConnected()) {
    const [row] = await db
      .insert(webServices)
      .values({
        userId: params.userId,
        modelId: params.modelId,
        name: params.name,
        endpointSlug: params.endpointSlug,
        inputSchemaJson: params.inputSchemaJson,
        isActive: true,
      })
      .returning();
    return {
      id: row.id,
      modelId: row.modelId,
      name: row.name,
      endpointSlug: row.endpointSlug,
      inputSchemaJson: row.inputSchemaJson as any[],
      isActive: row.isActive,
      callCount: row.callCount,
      createdAt: row.createdAt.toISOString(),
    };
  }
  const id = crypto.randomUUID();
  const rec = {
    id,
    userId: params.userId,
    modelId: params.modelId,
    name: params.name,
    endpointSlug: params.endpointSlug,
    inputSchemaJson: params.inputSchemaJson,
    isActive: true,
    callCount: 0,
    createdAt: new Date(),
  };
  memServices.set(id, rec);
  return { ...rec, createdAt: rec.createdAt.toISOString() };
}

export async function listWebServices(userId: string | null): Promise<WebServiceRecord[]> {
  if (!userId) return [];
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = await db
      .select()
      .from(webServices)
      .where(eq(webServices.userId, userId))
      .orderBy(desc(webServices.createdAt));
    return rows.map((row) => ({
      id: row.id,
      modelId: row.modelId,
      name: row.name,
      endpointSlug: row.endpointSlug,
      inputSchemaJson: row.inputSchemaJson as any[],
      isActive: row.isActive,
      callCount: row.callCount,
      createdAt: row.createdAt.toISOString(),
    }));
  }
  return Array.from(memServices.values())
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
}

export async function getWebServiceBySlug(slug: string) {
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = await db.select().from(webServices).where(eq(webServices.endpointSlug, slug)).limit(1);
    return rows[0] || null;
  }
  for (const s of memServices.values()) {
    if (s.endpointSlug === slug) return s;
  }
  return null;
}

export async function getModelByIdUnscoped(modelId: string) {
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = await db.select().from(trainedModels).where(eq(trainedModels.id, modelId)).limit(1);
    return rows[0] || null;
  }
  return memModels.get(modelId) || null;
}

export async function incrementWebServiceCalls(serviceId: string) {
  const db = getDb();
  if (db && isDbConnected()) {
    const rows = await db.select().from(webServices).where(eq(webServices.id, serviceId)).limit(1);
    if (rows[0]) {
      await db
        .update(webServices)
        .set({ callCount: rows[0].callCount + 1 })
        .where(eq(webServices.id, serviceId));
    }
    return;
  }
  const s = memServices.get(serviceId);
  if (s) s.callCount += 1;
}

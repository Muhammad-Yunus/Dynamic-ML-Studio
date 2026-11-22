import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const experiments = pgTable('experiments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('In draft'),
  graphJson: jsonb('graph_json').notNull(),
  isSample: boolean('is_sample').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const datasets = pgTable('datasets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  format: text('format').notNull().default('csv'),
  rowCount: integer('row_count').notNull().default(0),
  columnCount: integer('column_count').notNull().default(0),
  columnsJson: jsonb('columns_json').notNull(),
  rustfsKey: text('rustfs_key').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const trainedModels = pgTable('trained_models', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  experimentId: uuid('experiment_id').references(() => experiments.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  algorithm: text('algorithm').notNull(),
  taskType: text('task_type').notNull(),
  metricsJson: jsonb('metrics_json').notNull(),
  hyperparamsJson: jsonb('hyperparams_json').notNull(),
  featureColumnsJson: jsonb('feature_columns_json').notNull(),
  targetColumn: text('target_column'),
  rustfsKey: text('rustfs_key').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const experimentRuns = pgTable('experiment_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  experimentId: uuid('experiment_id').references(() => experiments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
  durationMs: integer('duration_ms').notNull().default(0),
  nodeResultsJson: jsonb('node_results_json').notNull(),
  logsJson: jsonb('logs_json').notNull(),
});

export const webServices = pgTable('web_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  modelId: uuid('model_id')
    .references(() => trainedModels.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  endpointSlug: text('endpoint_slug').notNull().unique(),
  inputSchemaJson: jsonb('input_schema_json').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  callCount: integer('call_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

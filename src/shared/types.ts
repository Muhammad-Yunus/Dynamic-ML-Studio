export type PortKind = 'dataset' | 'model' | 'trained-model' | 'evaluation' | 'transform' | 'any';

export interface NodePort {
  id: string;
  label: string;
  kind: PortKind;
  required?: boolean;
}

export type ParamControlType = 'select' | 'number' | 'text' | 'boolean' | 'columns' | 'textarea';

export interface NodeParamDef {
  key: string;
  label: string;
  type: ParamControlType;
  defaultValue: string | number | boolean | string[];
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  helpText?: string;
}

export type ModuleCategoryPath = string[];

export interface ModuleDefinition {
  typeId: string;
  name: string;
  categoryPath: ModuleCategoryPath;
  iconType:
    | 'dataset'
    | 'clean'
    | 'split'
    | 'transform'
    | 'feature'
    | 'model-class'
    | 'model-reg'
    | 'model-cluster'
    | 'model-anomaly'
    | 'train'
    | 'score'
    | 'evaluate'
    | 'stats'
    | 'text'
    | 'io'
    | 'format'
    | 'python'
    | 'r'
    | 'webservice';
  inputPorts: NodePort[];
  outputPorts: NodePort[];
  params: NodeParamDef[];
  quickHelp: string;
  algorithmId?: string;
  taskType?: 'binary' | 'multiclass' | 'regression' | 'clustering' | 'anomaly' | 'recommender';
}

export type NodeRunStatus = 'idle' | 'queued' | 'running' | 'completed' | 'error';

export interface PipelineNode {
  id: string;
  typeId: string;
  label: string;
  x: number;
  y: number;
  params: Record<string, any>;
  sweptParams?: Record<string, boolean>;
  comment?: string;
  commentExpanded?: boolean;
  status?: NodeRunStatus;
  errorMessage?: string;
  outputBadge?: string;
}

export interface PipelineEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface PipelineGraph {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
  };
  selectedNodeId: string | null;
}

export interface DatasetColumnMeta {
  name: string;
  type: 'numeric' | 'categorical' | 'text' | 'boolean';
  missingCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
}

export interface DatasetRecord {
  id: string;
  name: string;
  description: string;
  format: string;
  rowCount: number;
  columnCount: number;
  columns: DatasetColumnMeta[];
  rustfsKey: string;
  sizeBytes: number;
  isSample: boolean;
  createdAt: string;
}

export interface NodeExecutionSummary {
  nodeId: string;
  status: 'completed' | 'error';
  durationMs: number;
  rowCount?: number;
  columnCount?: number;
  columns?: string[];
  previewRows?: Record<string, any>[];
  summaryStats?: Record<string, any>;
  trainingHistory?: { epoch: number; loss: number; accuracy?: number }[];
  metrics?: Record<string, any>;
  confusionMatrix?: {
    labels: string[];
    matrix: number[][];
  };
  featureImportance?: { feature: string; importance: number }[];
  modelArtifact?: {
    modelId?: string;
    rustfsKey?: string;
    algorithm: string;
    taskType: string;
    targetColumn: string;
    featureColumns: string[];
  };
  errorMessage?: string;
}

export interface RunPipelineResponse {
  runId: string;
  status: 'finished' | 'failed';
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  nodeResults: Record<string, NodeExecutionSummary>;
  logs: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export interface ExperimentSummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  isSample: boolean;
  graphJson: PipelineGraph;
  updatedAt: string;
  createdAt: string;
}

export interface TrainedModelRecord {
  id: string;
  experimentId: string | null;
  name: string;
  algorithm: string;
  taskType: string;
  metricsJson: Record<string, any>;
  hyperparamsJson: Record<string, any>;
  featureColumnsJson: string[];
  targetColumn: string | null;
  rustfsKey: string;
  createdAt: string;
}

export interface WebServiceRecord {
  id: string;
  modelId: string;
  name: string;
  endpointSlug: string;
  inputSchemaJson: { name: string; type: string; example: any }[];
  isActive: boolean;
  callCount: number;
  createdAt: string;
}

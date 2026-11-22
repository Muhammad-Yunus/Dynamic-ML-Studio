import {
  AuthUser,
  DatasetRecord,
  ExperimentSummary,
  PipelineGraph,
  RunPipelineResponse,
  TrainedModelRecord,
  WebServiceRecord,
} from '../shared/types';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data as T;
  }

  health() {
    return this.request<{ ok: boolean; postgres: boolean; rustfs: { mode: string; bucket: string } }>('/api/health');
  }

  register(payload: { email: string; displayName: string; password: string }) {
    return this.request<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  login(payload: { email: string; password: string }) {
    return this.request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  me() {
    return this.request<{ user: AuthUser | null }>('/api/auth/me');
  }

  listExperiments() {
    return this.request<{ experiments: ExperimentSummary[] }>('/api/experiments');
  }

  saveExperiment(payload: {
    id?: string;
    title: string;
    description?: string;
    status?: string;
    graphJson: PipelineGraph;
  }) {
    return this.request<{ experiment: ExperimentSummary }>('/api/experiments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  listDatasets() {
    return this.request<{ datasets: DatasetRecord[] }>('/api/datasets');
  }

  previewDataset(id: string) {
    return this.request<{ name: string; columns: any[]; rows: Record<string, any>[]; totalRows: number }>(
      `/api/datasets/${encodeURIComponent(id)}/preview`
    );
  }

  uploadDataset(payload: { name: string; description?: string; csvContent: string }) {
    return this.request<{ dataset: DatasetRecord; storageBackend: string }>('/api/datasets/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  runPipeline(payload: { graphJson: PipelineGraph; experimentId?: string }) {
    return this.request<RunPipelineResponse>('/api/pipelines/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  listRuns() {
    return this.request<{ runs: any[] }>('/api/runs');
  }

  listModels() {
    return this.request<{ models: TrainedModelRecord[] }>('/api/models');
  }

  listWebServices() {
    return this.request<{ webServices: WebServiceRecord[] }>('/api/webservices');
  }

  deployWebService(payload: { modelId: string; name: string }) {
    return this.request<{ webService: WebServiceRecord }>('/api/webservices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  invokeWebService(slug: string, input: Record<string, any>) {
    return this.request<{
      service: string;
      algorithm: string;
      predictions: { label: any; probability?: number }[];
      scoredRows: Record<string, any>[];
    }>(`/api/predict/${encodeURIComponent(slug)}`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    });
  }

  async downloadModelArtifact(modelId: string, filename = 'model.torchjs.json') {
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`/api/models/${encodeURIComponent(modelId)}/download`, { headers });
    if (!res.ok) throw new Error('Failed to download model artifact');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

export const api = new ApiClient();

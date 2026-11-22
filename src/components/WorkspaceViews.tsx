import React, { useState } from 'react';
import { Download, Eye, Globe, Play, Plus, Upload } from 'lucide-react';
import { api } from '../lib/api';
import {
  AuthUser,
  DatasetRecord,
  ExperimentSummary,
  TrainedModelRecord,
  WebServiceRecord,
} from '../shared/types';

interface WorkspaceViewsProps {
  activeSection: 'projects' | 'webservices' | 'datasets' | 'models' | 'settings';
  user: AuthUser | null;
  experiments: ExperimentSummary[];
  datasets: DatasetRecord[];
  models: TrainedModelRecord[];
  webServices: WebServiceRecord[];
  infraHealth: { postgres: boolean; rustfs: { mode: string; bucket: string } } | null;
  onOpenExperiment: (exp: ExperimentSummary) => void;
  onCreateExperiment: () => void;
  onOpenUploadDataset: () => void;
  onOpenDeployService: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const WorkspaceViews: React.FC<WorkspaceViewsProps> = ({
  activeSection,
  user,
  experiments,
  datasets,
  models,
  webServices,
  infraHealth,
  onOpenExperiment,
  onCreateExperiment,
  onOpenUploadDataset,
  onOpenDeployService,
  onOpenAuth,
  onSignOut,
}) => {
  const [previewData, setPreviewData] = useState<{
    name: string;
    rows: Record<string, any>[];
    totalRows: number;
  } | null>(null);
  const [testingService, setTestingService] = useState<WebServiceRecord | null>(null);
  const [testPayload, setTestPayload] = useState('{}');
  const [testOutput, setTestOutput] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const loadPreview = async (id: string) => {
    try {
      const res = await api.previewDataset(id);
      setPreviewData({ name: res.name, rows: res.rows, totalRows: res.totalRows });
    } catch {
      // ignore
    }
  };

  const handleTestEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testingService) return;
    setTestError(null);
    setTestOutput(null);
    try {
      const parsed = JSON.parse(testPayload);
      const res = await api.invokeWebService(testingService.endpointSlug, parsed);
      setTestOutput(res);
    } catch (err: any) {
      setTestError(err.message || 'Invalid JSON or prediction failure.');
    }
  };

  return (
    <div className="flex-1 h-full bg-[#F4F4F4] overflow-y-auto studio-scroll p-6">
      <div className="max-w-[1120px] mx-auto space-y-5">
        {activeSection === 'projects' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-light text-[#333333]">Experiments & Projects</h1>
                <p className="text-[12.5px] text-[#666666]">
                  Open a saved ML pipeline or start a new experiment canvas.
                </p>
              </div>
              <button
                type="button"
                onClick={onCreateExperiment}
                className="h-[32px] px-4 bg-[#0078D7] hover:bg-[#0066B8] text-white text-[12.5px] font-medium flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Experiment</span>
              </button>
            </div>

            <div className="bg-white border border-[#D9D9D9] overflow-x-auto">
              <table className="w-full text-[12.5px] border-collapse">
                <thead className="bg-[#F2F2F2] text-[#555555]">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">Experiment</th>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium border-b border-[#D9D9D9]">Modules</th>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">Updated</th>
                    <th className="px-4 py-2.5 text-right font-medium border-b border-[#D9D9D9]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {experiments.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#F7FAFC] border-b border-[#EFEFEF]">
                      <td className="px-4 py-2.5 font-medium text-[#222222]">{exp.title}</td>
                      <td className="px-4 py-2.5 text-[#555555]">{exp.status}</td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular text-[#555555]">
                        {exp.graphJson?.nodes?.length || 0}
                      </td>
                      <td className="px-4 py-2.5 font-mono-tabular text-[#666666]">
                        {new Date(exp.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenExperiment(exp)}
                          className="text-[#0066CC] hover:underline font-medium"
                        >
                          Open in Studio
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSection === 'datasets' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-light text-[#333333]">Datasets (RustFS Object Store)</h1>
                <p className="text-[12.5px] text-[#666666]">
                  Upload CSV datasets to RustFS or inspect built-in benchmark datasets.
                </p>
              </div>
              <button
                type="button"
                onClick={user ? onOpenUploadDataset : onOpenAuth}
                className="h-[32px] px-4 bg-[#0078D7] hover:bg-[#0066B8] text-white text-[12.5px] font-medium flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>{user ? 'Upload CSV to RustFS' : 'Sign In to Upload CSV'}</span>
              </button>
            </div>

            <div className="bg-white border border-[#D9D9D9] overflow-x-auto">
              <table className="w-full text-[12.5px] border-collapse">
                <thead className="bg-[#F2F2F2] text-[#555555]">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">Dataset Name</th>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">Source</th>
                    <th className="px-4 py-2.5 text-right font-medium border-b border-[#D9D9D9]">Rows</th>
                    <th className="px-4 py-2.5 text-right font-medium border-b border-[#D9D9D9]">Columns</th>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">RustFS Key</th>
                    <th className="px-4 py-2.5 text-right font-medium border-b border-[#D9D9D9]">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((ds) => (
                    <tr key={ds.id} className="hover:bg-[#F7FAFC] border-b border-[#EFEFEF]">
                      <td className="px-4 py-2.5 font-medium text-[#222222]">{ds.name}</td>
                      <td className="px-4 py-2.5 text-[#555555]">{ds.isSample ? 'Sample' : 'My RustFS'}</td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular text-[#555555]">{ds.rowCount}</td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular text-[#555555]">{ds.columnCount}</td>
                      <td className="px-4 py-2.5 font-mono-tabular text-[11.5px] text-[#666666]">{ds.rustfsKey}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => loadPreview(ds.id)}
                          className="inline-flex items-center gap-1 text-[#0066CC] hover:underline font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewData && (
              <div className="bg-white border border-[#D9D9D9] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#22649B]">
                    {previewData.name} ({previewData.totalRows} total rows)
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewData(null)}
                    className="text-[12px] text-[#666666] hover:text-[#222222]"
                  >
                    Close Preview
                  </button>
                </div>
                <div className="overflow-x-auto border border-[#E5E5E5] max-h-[280px]">
                  <table className="w-full text-[11.5px] border-collapse font-mono-tabular">
                    <thead className="bg-[#F5F5F5]">
                      <tr>
                        {Object.keys(previewData.rows[0] || {}).map((c) => (
                          <th key={c} className="px-2.5 py-1.5 text-left border-b border-[#E5E5E5]">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.slice(0, 15).map((r, i) => (
                        <tr key={i} className="border-b border-[#F2F2F2]">
                          {Object.keys(previewData.rows[0] || {}).map((c) => (
                            <td key={c} className="px-2.5 py-1 text-[#444444]">
                              {r[c] === null || r[c] === undefined ? 'null' : String(r[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeSection === 'models' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-light text-[#333333]">Trained TorchJS Models (RustFS)</h1>
                <p className="text-[12.5px] text-[#666666]">
                  Models trained on the backend with TorchJS and stored in RustFS.
                </p>
              </div>
              {!user && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="h-[32px] px-4 bg-[#0078D7] text-white text-[12.5px] font-medium"
                >
                  Sign In to View Saved Models
                </button>
              )}
            </div>

            <div className="bg-white border border-[#D9D9D9] overflow-x-auto">
              <table className="w-full text-[12.5px] border-collapse">
                <thead className="bg-[#F2F2F2] text-[#555555]">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">Model Name</th>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">Algorithm</th>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">Target</th>
                    <th className="px-4 py-2.5 text-right font-medium border-b border-[#D9D9D9]">Loss</th>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">RustFS Key</th>
                    <th className="px-4 py-2.5 text-right font-medium border-b border-[#D9D9D9]">Artifact</th>
                  </tr>
                </thead>
                <tbody>
                  {models.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#777777]">
                        No trained models saved yet. Run a pipeline with Train Model while signed in.
                      </td>
                    </tr>
                  ) : (
                    models.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F7FAFC] border-b border-[#EFEFEF]">
                        <td className="px-4 py-2.5 font-medium text-[#222222]">{m.name}</td>
                        <td className="px-4 py-2.5 text-[#555555]">{m.algorithm}</td>
                        <td className="px-4 py-2.5 font-mono-tabular text-[#555555]">{m.targetColumn || '-'}</td>
                        <td className="px-4 py-2.5 text-right font-mono-tabular text-[#333333]">
                          {m.metricsJson?.finalLoss ?? '-'}
                        </td>
                        <td className="px-4 py-2.5 font-mono-tabular text-[11.5px] text-[#666666]">{m.rustfsKey}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              api.downloadModelArtifact(m.id, `${m.name}.torchjs.json`)
                            }
                            className="inline-flex items-center gap-1 text-[#0066CC] hover:underline font-medium"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>JSON</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSection === 'webservices' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-light text-[#333333]">Predictive Web Services</h1>
                <p className="text-[12.5px] text-[#666666]">
                  Live REST scoring endpoints backed by RustFS TorchJS models.
                </p>
              </div>
              <button
                type="button"
                onClick={user ? onOpenDeployService : onOpenAuth}
                className="h-[32px] px-4 bg-[#0078D7] hover:bg-[#0066B8] text-white text-[12.5px] font-medium flex items-center gap-1.5"
              >
                <Globe className="w-4 h-4" />
                <span>Deploy Web Service</span>
              </button>
            </div>

            <div className="bg-white border border-[#D9D9D9] overflow-x-auto">
              <table className="w-full text-[12.5px] border-collapse">
                <thead className="bg-[#F2F2F2] text-[#555555]">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">Service Name</th>
                    <th className="px-4 py-2.5 text-left font-medium border-b border-[#D9D9D9]">Endpoint Path</th>
                    <th className="px-4 py-2.5 text-right font-medium border-b border-[#D9D9D9]">Calls</th>
                    <th className="px-4 py-2.5 text-right font-medium border-b border-[#D9D9D9]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {webServices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[#777777]">
                        No web services deployed yet.
                      </td>
                    </tr>
                  ) : (
                    webServices.map((svc) => (
                      <tr key={svc.id} className="hover:bg-[#F7FAFC] border-b border-[#EFEFEF]">
                        <td className="px-4 py-2.5 font-medium text-[#222222]">{svc.name}</td>
                        <td className="px-4 py-2.5 font-mono-tabular text-[#0066B8]">
                          POST /api/predict/{svc.endpointSlug}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono-tabular text-[#555555]">
                          {svc.callCount}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setTestingService(svc);
                              const sampleObj: Record<string, any> = {};
                              for (const field of svc.inputSchemaJson || []) {
                                sampleObj[field.name] = '';
                              }
                              setTestPayload(JSON.stringify(sampleObj, null, 2));
                              setTestOutput(null);
                              setTestError(null);
                            }}
                            className="inline-flex items-center gap-1 text-[#0066CC] hover:underline font-medium"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Test Request</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {testingService && (
              <form onSubmit={handleTestEndpoint} className="bg-white border border-[#D9D9D9] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#22649B]">
                    Test Endpoint: POST /api/predict/{testingService.endpointSlug}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTestingService(null)}
                    className="text-[12px] text-[#666666]"
                  >
                    Close
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="w-full p-2.5 font-mono-tabular text-[12px] border border-[#C8C8C8]"
                />
                {testError && <div className="text-[12px] text-[#9E2A2B]">{testError}</div>}
                {testOutput && (
                  <pre className="p-3 bg-[#1F1F1F] text-[#E6E6E6] text-[11.5px] font-mono-tabular overflow-x-auto">
                    {JSON.stringify(testOutput, null, 2)}
                  </pre>
                )}
                <button
                  type="submit"
                  className="h-[30px] px-4 bg-[#0078D7] text-white text-[12px] font-medium"
                >
                  Send Scoring Request
                </button>
              </form>
            )}
          </>
        )}

        {activeSection === 'settings' && (
          <div className="space-y-4">
            <h1 className="text-[22px] font-light text-[#333333]">Workspace Settings</h1>
            <div className="bg-white border border-[#D9D9D9] p-5 space-y-4 max-w-[640px]">
              <div>
                <div className="text-[12px] text-[#666666]">Signed-in Account</div>
                {user ? (
                  <div className="mt-1 flex items-center justify-between">
                    <div>
                      <div className="text-[14px] font-medium text-[#222222]">{user.displayName}</div>
                      <div className="text-[12px] text-[#666666]">{user.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="h-[30px] px-3 border border-[#C8C8C8] text-[12px] text-[#333333] hover:bg-[#F2F2F2]"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[13px] text-[#555555]">Guest Preview Mode (not signed in)</span>
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="h-[30px] px-3 bg-[#0078D7] text-white text-[12px]"
                    >
                      Sign In / Register
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#EEEEEE] space-y-2 text-[12.5px]">
                <div className="font-semibold text-[#22649B]">Backend Infrastructure</div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">PostgreSQL (Drizzle ORM)</span>
                  <span className="font-mono-tabular">
                    {infraHealth?.postgres ? 'Connected' : 'Configure PGHOST / PGUSER / PGPASSWORD in Secrets'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Object Store (RustFS)</span>
                  <span className="font-mono-tabular">
                    {infraHealth?.rustfs.mode === 'rustfs-s3'
                      ? `Connected (${infraHealth.rustfs.bucket})`
                      : `Local RustFS Bucket (${infraHealth?.rustfs.bucket || 'dynamic-ml-studio'})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">ML Training Engine</span>
                  <span className="font-mono-tabular">TorchJS (js-pytorch)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

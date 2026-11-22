import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle, Play, Download } from 'lucide-react';
import { api } from '../lib/api';
import { MODULE_MAP } from '../shared/catalog';
import {
  AuthUser,
  DatasetRecord,
  NodeExecutionSummary,
  PipelineNode,
  TrainedModelRecord,
  WebServiceRecord,
} from '../shared/types';

// ================= AUTH MODAL =================
export const AuthModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser, token: string) => void;
  initialMode?: 'login' | 'register';
}> = ({ open, onClose, onSuccess, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'register'
          ? await api.register({ email, displayName, password })
          : await api.login({ email, password });
      api.setToken(res.token);
      onSuccess(res.user, res.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white border border-[#C8C8C8] shadow-xl w-full max-w-[400px]">
        <div className="bg-[#333333] text-white px-5 py-3 flex items-center justify-between">
          <span className="text-[15px] font-normal">
            {mode === 'login' ? 'Sign in to Dynamic ML Studio' : 'Create Studio Account'}
          </span>
          <button type="button" onClick={onClose} className="text-[#CCCCCC] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-[#FDECEC] border border-[#F5C2C2] text-[#9E2A2B] text-[12px]">
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-[12px] text-[#555555] mb-1">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Data Scientist"
                className="w-full h-[32px] px-2.5 text-[13px] border border-[#C8C8C8] focus:border-[#0078D7] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-[12px] text-[#555555] mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full h-[32px] px-2.5 text-[13px] border border-[#C8C8C8] focus:border-[#0078D7] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] text-[#555555] mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full h-[32px] px-2.5 text-[13px] border border-[#C8C8C8] focus:border-[#0078D7] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[34px] bg-[#0078D7] hover:bg-[#0066B8] disabled:opacity-60 text-white text-[13px] font-medium transition-colors"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div className="pt-2 border-t border-[#EEEEEE] text-[12px] text-[#666666] flex items-center justify-between">
            <span>{mode === 'login' ? 'New to Dynamic ML Studio?' : 'Already have an account?'}</span>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === 'login' ? 'register' : 'login');
              }}
              className="text-[#0066CC] hover:underline font-medium"
            >
              {mode === 'login' ? 'Register Workspace' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================= DATASET UPLOAD MODAL (RustFS) =================
export const DatasetUploadModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onUploaded: (dataset: DatasetRecord) => void;
}> = ({ open, onClose, onUploaded }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleFile = (file: File) => {
    if (!name) setName(file.name.replace(/\.(csv|tsv|txt)$/i, ''));
    const reader = new FileReader();
    reader.onload = () => {
      setCsvContent(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.uploadDataset({ name, description, csvContent });
      onUploaded(res.dataset);
      setName('');
      setDescription('');
      setCsvContent('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white border border-[#C8C8C8] shadow-xl w-full max-w-[520px]">
        <div className="bg-[#333333] text-white px-5 py-3 flex items-center justify-between">
          <span className="text-[15px] font-normal">Upload Dataset to RustFS</span>
          <button type="button" onClick={onClose} className="text-[#CCCCCC] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-[#FDECEC] border border-[#F5C2C2] text-[#9E2A2B] text-[12px]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] text-[#555555] mb-1">Dataset Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer_Purchase_History"
              className="w-full h-[30px] px-2.5 text-[13px] border border-[#C8C8C8] focus:border-[#0078D7] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] text-[#555555] mb-1">Select CSV File</label>
            <label className="flex items-center justify-center gap-2 h-[64px] border border-dashed border-[#A8A8A8] bg-[#FAFAFA] hover:bg-[#F2F7FB] cursor-pointer text-[12.5px] text-[#444444]">
              <Upload className="w-4 h-4 text-[#0078D7]" />
              <span>Choose a .csv file from disk</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </div>

          <div>
            <label className="block text-[12px] text-[#555555] mb-1">
              Or Paste CSV Content (header row required)
            </label>
            <textarea
              rows={5}
              required
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="feature_a,feature_b,label&#10;1.5,2.3,1&#10;0.4,1.1,0"
              className="w-full p-2.5 text-[12px] font-mono-tabular border border-[#C8C8C8] focus:border-[#0078D7] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[32px] px-4 border border-[#C8C8C8] text-[12.5px] text-[#333333] hover:bg-[#F3F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-[32px] px-4 bg-[#0078D7] hover:bg-[#0066B8] text-white text-[12.5px] font-medium disabled:opacity-60"
            >
              {loading ? 'Uploading to RustFS...' : 'Upload Dataset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================= VISUALIZE NODE RESULTS / TORCHJS METRICS MODAL =================
export const VisualizeResultsModal: React.FC<{
  node: PipelineNode | null;
  result: NodeExecutionSummary | null;
  onClose: () => void;
}> = ({ node, result, onClose }) => {
  if (!node || !result) return null;

  const history = result.trainingHistory || [];
  const maxLoss = Math.max(...history.map((h) => h.loss), 0.01);

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white border border-[#C8C8C8] shadow-xl w-full max-w-[920px] max-h-[86vh] flex flex-col">
        <div className="bg-[#333333] text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#66B300]" />
            <span className="text-[15px] font-normal">{node.label} — Output Visualization</span>
          </div>
          <button type="button" onClick={onClose} className="text-[#CCCCCC] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto studio-scroll p-5 space-y-5">
          {/* Metrics Strip */}
          {result.metrics && Object.keys(result.metrics).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(result.metrics).map(([k, v]) => (
                <div key={k} className="border border-[#DFDFDF] bg-[#FAFAFA] px-3 py-2.5">
                  <div className="text-[11px] text-[#666666] truncate">{k}</div>
                  <div className="text-[16px] font-semibold font-mono-tabular text-[#222222] mt-0.5">
                    {String(v)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TorchJS Training Loss Curve */}
          {history.length > 0 && (
            <div className="border border-[#DFDFDF] p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-[#22649B]">
                  TorchJS Training Loss Curve ({history[history.length - 1].epoch} Epochs)
                </h3>
                <span className="text-[11.5px] font-mono-tabular text-[#666666]">
                  Final Loss: {history[history.length - 1].loss}
                  {history[history.length - 1].accuracy !== undefined
                    ? ` · Train Acc: ${(history[history.length - 1].accuracy! * 100).toFixed(1)}%`
                    : ''}
                </span>
              </div>
              <svg viewBox="0 0 600 140" className="w-full h-[140px] bg-[#FAFAFA] border border-[#EEEEEE]">
                <line x1="40" y1="115" x2="580" y2="115" stroke="#CCCCCC" strokeWidth="1" />
                <line x1="40" y1="15" x2="40" y2="115" stroke="#CCCCCC" strokeWidth="1" />
                {history.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#0078D7"
                    strokeWidth="2.2"
                    points={history
                      .map((pt, i) => {
                        const x = 45 + (i / (history.length - 1)) * 530;
                        const y = 112 - (pt.loss / maxLoss) * 90;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                )}
                {history.map((pt, i) => {
                  const x = history.length > 1 ? 45 + (i / (history.length - 1)) * 530 : 300;
                  const y = 112 - (pt.loss / maxLoss) * 90;
                  return <circle key={i} cx={x} cy={y} r="3.2" fill="#0078D7" />;
                })}
                <text x="45" y="132" fontSize="10" fill="#777">
                  Epoch {history[0].epoch}
                </text>
                <text x="530" y="132" fontSize="10" fill="#777">
                  Epoch {history[history.length - 1].epoch}
                </text>
              </svg>
            </div>
          )}

          {/* Confusion Matrix & Feature Importance */}
          {(result.confusionMatrix || result.featureImportance) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.confusionMatrix && (
                <div className="border border-[#DFDFDF] p-4">
                  <h3 className="text-[13px] font-semibold text-[#22649B] mb-2.5">
                    Confusion Matrix
                  </h3>
                  <table className="w-full text-[12px] border-collapse font-mono-tabular">
                    <thead>
                      <tr>
                        <th className="p-1.5 text-left text-[#666666] border-b border-[#E5E5E5]">
                          Actual \ Pred
                        </th>
                        {result.confusionMatrix.labels.map((lbl) => (
                          <th key={lbl} className="p-1.5 text-right text-[#333333] border-b border-[#E5E5E5]">
                            {lbl}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.confusionMatrix.matrix.map((row, ri) => (
                        <tr key={ri}>
                          <td className="p-1.5 font-medium text-[#333333] border-b border-[#F0F0F0]">
                            {result.confusionMatrix!.labels[ri]}
                          </td>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className={`p-1.5 text-right border-b border-[#F0F0F0] ${
                                ri === ci ? 'bg-[#E8F4FD] font-semibold text-[#005A9E]' : 'text-[#555555]'
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {result.featureImportance && result.featureImportance.length > 0 && (
                <div className="border border-[#DFDFDF] p-4">
                  <h3 className="text-[13px] font-semibold text-[#22649B] mb-2.5">
                    Feature Weights / Importance
                  </h3>
                  <div className="space-y-2">
                    {result.featureImportance.slice(0, 6).map((fi) => (
                      <div key={fi.feature} className="space-y-0.5">
                        <div className="flex justify-between text-[11.5px]">
                          <span className="text-[#333333] truncate">{fi.feature}</span>
                          <span className="font-mono-tabular text-[#555555]">{fi.importance}</span>
                        </div>
                        <div className="w-full h-2 bg-[#ECECEC]">
                          <div
                            className="h-full bg-[#3A8AC1]"
                            style={{ width: `${Math.min(100, Math.round(fi.importance * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RustFS Artifact Banner */}
          {result.modelArtifact?.rustfsKey && (
            <div className="p-3 bg-[#F4F8FB] border border-[#CBE0F0] text-[12px] flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-[#22649B]">RustFS Model Artifact: </span>
                <span className="font-mono-tabular text-[#333333]">{result.modelArtifact.rustfsKey}</span>
              </div>
              {result.modelArtifact.modelId && (
                <button
                  type="button"
                  onClick={() =>
                    api.downloadModelArtifact(
                      result.modelArtifact!.modelId!,
                      `${result.modelArtifact!.algorithm}.torchjs.json`
                    )
                  }
                  className="inline-flex items-center gap-1 text-[#0066CC] hover:underline font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Weights</span>
                </button>
              )}
            </div>
          )}

          {/* Data Rows Preview Table */}
          {result.previewRows && result.previewRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-[#22649B]">
                  Dataset Output ({result.rowCount ?? result.previewRows.length} rows ×{' '}
                  {result.columnCount ?? Object.keys(result.previewRows[0]).length} columns)
                </h3>
                <span className="text-[11px] text-[#777777]">Showing top {result.previewRows.length} rows</span>
              </div>
              <div className="overflow-x-auto border border-[#D9D9D9]">
                <table className="w-full text-[12px] border-collapse">
                  <thead className="bg-[#F2F2F2]">
                    <tr>
                      {Object.keys(result.previewRows[0]).map((col) => (
                        <th
                          key={col}
                          className={`px-2.5 py-2 text-left font-medium border-b border-[#D9D9D9] whitespace-nowrap ${
                            col.startsWith('Scored ') ? 'text-[#0066B8] bg-[#E8F4FD]' : 'text-[#333333]'
                          }`}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F7FAFC] border-b border-[#EFEFEF]">
                        {Object.keys(result.previewRows![0]).map((col) => (
                          <td
                            key={col}
                            className={`px-2.5 py-1.5 whitespace-nowrap font-mono-tabular ${
                              col.startsWith('Scored ') ? 'font-medium text-[#005A9E] bg-[#F5FAFE]' : 'text-[#444444]'
                            }`}
                          >
                            {row[col] === null || row[col] === undefined ? (
                              <span className="text-[#AAAAAA] italic">null</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ================= RUN HISTORY MODAL =================
export const RunHistoryModal: React.FC<{
  open: boolean;
  runs: any[];
  latestLogs: string[];
  onClose: () => void;
}> = ({ open, runs, latestLogs, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white border border-[#C8C8C8] shadow-xl w-full max-w-[700px] max-h-[82vh] flex flex-col">
        <div className="bg-[#333333] text-white px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-[15px] font-normal">Experiment Run History & TorchJS Logs</span>
          <button type="button" onClick={onClose} className="text-[#CCCCCC] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto studio-scroll p-5 space-y-4">
          {latestLogs.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-[#22649B] mb-2">Latest Run Execution Log</h3>
              <div className="bg-[#1F1F1F] text-[#E6E6E6] p-3 font-mono-tabular text-[11.5px] space-y-1 max-h-[200px] overflow-y-auto">
                {latestLogs.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-[13px] font-semibold text-[#22649B] mb-2">Saved Runs</h3>
            {runs.length === 0 ? (
              <p className="text-[12.5px] text-[#777777]">
                No saved runs recorded yet. Sign in and click RUN to persist execution history to PostgreSQL.
              </p>
            ) : (
              <table className="w-full text-[12px] border border-[#E0E0E0] border-collapse">
                <thead className="bg-[#F5F5F5]">
                  <tr>
                    <th className="p-2 text-left border-b border-[#E0E0E0]">Status</th>
                    <th className="p-2 text-left border-b border-[#E0E0E0]">Started</th>
                    <th className="p-2 text-right border-b border-[#E0E0E0]">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b border-[#EFEFEF]">
                      <td className="p-2 font-medium text-[#333333]">{r.status}</td>
                      <td className="p-2 font-mono-tabular text-[#555555]">
                        {new Date(r.startedAt).toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-mono-tabular text-[#555555]">{r.durationMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ================= DEPLOY WEB SERVICE MODAL =================
export const DeployWebServiceModal: React.FC<{
  open: boolean;
  models: TrainedModelRecord[];
  onClose: () => void;
  onDeployed: (svc: WebServiceRecord) => void;
}> = ({ open, models, onClose, onDeployed }) => {
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || '');
  const [name, setName] = useState('Dynamic ML Scoring Endpoint');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.deployWebService({
        modelId: selectedModelId || models[0]?.id,
        name,
      });
      onDeployed(res.webService);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Deployment failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white border border-[#C8C8C8] shadow-xl w-full max-w-[460px]">
        <div className="bg-[#333333] text-white px-5 py-3 flex items-center justify-between">
          <span className="text-[15px] font-normal">Set Up Predictive Web Service</span>
          <button type="button" onClick={onClose} className="text-[#CCCCCC] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-[#FDECEC] border border-[#F5C2C2] text-[#9E2A2B] text-[12px]">
              {error}
            </div>
          )}

          {models.length === 0 ? (
            <div className="p-3 bg-[#FFF8E6] border border-[#F0D999] text-[12.5px] text-[#7A5901] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                No trained models found yet. Sign in and click <strong>RUN</strong> on a pipeline with a{' '}
                <strong>Train Model</strong> module first to store weights in RustFS.
              </span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[12px] text-[#555555] mb-1">Web Service Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-[30px] px-2.5 text-[13px] border border-[#C8C8C8] focus:border-[#0078D7] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#555555] mb-1">Trained Model (RustFS)</label>
                <select
                  value={selectedModelId || models[0]?.id}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full h-[30px] px-2 text-[12.5px] border border-[#C8C8C8] focus:border-[#0078D7] focus:outline-none"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.algorithm})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[32px] px-4 border border-[#C8C8C8] text-[12.5px] text-[#333333]"
            >
              Close
            </button>
            {models.length > 0 && (
              <button
                type="submit"
                disabled={loading}
                className="h-[32px] px-4 bg-[#0078D7] hover:bg-[#0066B8] text-white text-[12.5px] font-medium flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{loading ? 'Deploying...' : 'Deploy Endpoint'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// ================= QUICK HELP / MODULE DOCUMENTATION MODAL =================
export const ModuleHelpModal: React.FC<{
  node: PipelineNode | null;
  onClose: () => void;
}> = ({ node, onClose }) => {
  if (!node) return null;
  const def = MODULE_MAP[node.typeId];
  if (!def) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white border border-[#C8C8C8] shadow-xl w-full max-w-[520px]">
        <div className="bg-[#333333] text-white px-5 py-3 flex items-center justify-between">
          <span className="text-[15px] font-normal">{def.name} — Module Reference</span>
          <button type="button" onClick={onClose} className="text-[#CCCCCC] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 text-[12.5px] text-[#333333]">
          <div>
            <div className="text-[11px] text-[#777777] mb-0.5">Category</div>
            <div className="font-medium text-[#22649B]">{def.categoryPath.join(' › ')}</div>
          </div>
          <p className="leading-relaxed text-[#444444]">{def.quickHelp}</p>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#EEEEEE]">
            <div>
              <div className="text-[11.5px] font-semibold text-[#555555] mb-1">Input Ports</div>
              {def.inputPorts.length === 0 ? (
                <div className="text-[#888888]">None (Source Node)</div>
              ) : (
                <ul className="space-y-1">
                  {def.inputPorts.map((p) => (
                    <li key={p.id} className="font-mono-tabular text-[11.5px]">
                      • {p.label} ({p.kind})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="text-[11.5px] font-semibold text-[#555555] mb-1">Output Ports</div>
              {def.outputPorts.length === 0 ? (
                <div className="text-[#888888]">None</div>
              ) : (
                <ul className="space-y-1">
                  {def.outputPorts.map((p) => (
                    <li key={p.id} className="font-mono-tabular text-[11.5px]">
                      • {p.label} ({p.kind})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

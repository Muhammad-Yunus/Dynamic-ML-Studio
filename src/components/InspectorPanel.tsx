import React, { useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronRight, ChevronUp, HelpCircle, Trash2 } from 'lucide-react';
import { MODULE_MAP } from '../shared/catalog';
import { BUILTIN_SAMPLE_DATASETS } from '../shared/sampleDatasets';
import { NodeExecutionSummary, PipelineGraph, PipelineNode } from '../shared/types';

interface InspectorPanelProps {
  graph: PipelineGraph;
  selectedNode: PipelineNode | null;
  nodeResult: NodeExecutionSummary | null;
  experimentTitle: string;
  experimentStatus: string;
  infraHealth: { postgres: boolean; rustfs: { mode: string; bucket: string } } | null;
  onUpdateParam: (nodeId: string, key: string, value: any) => void;
  onToggleSweptParam: (nodeId: string, key: string) => void;
  onUpdateComment: (nodeId: string, comment: string, expanded?: boolean) => void;
  onDeleteNode: (nodeId: string) => void;
  onOpenVisualize: (nodeId: string) => void;
  onOpenHelp: (node: PipelineNode | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function ParamGripIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 14 12" className="w-3.5 h-3 shrink-0" fill="none">
      <path
        d="M1 2.5H13M1 6H13M1 9.5H13"
        stroke={active ? '#0078D7' : '#BDBDBD'}
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  graph,
  selectedNode,
  nodeResult,
  experimentTitle,
  experimentStatus,
  infraHealth,
  onUpdateParam,
  onToggleSweptParam,
  onUpdateComment,
  onDeleteNode,
  onOpenVisualize,
  onOpenHelp,
  collapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'project'>('properties');
  const [sectionOpen, setSectionOpen] = useState(true);
  const [quickHelpOpen, setQuickHelpOpen] = useState(true);
  const [colPickerParam, setColPickerParam] = useState<string | null>(null);

  const availableColumns = useMemo(() => {
    if (nodeResult?.columns && nodeResult.columns.length > 0) return nodeResult.columns;
    const sample = BUILTIN_SAMPLE_DATASETS[0];
    return sample?.rows[0] ? Object.keys(sample.rows[0]) : ['age', 'workclass', 'education', 'income'];
  }, [nodeResult]);

  if (collapsed) {
    return null;
  }

  const def = selectedNode ? MODULE_MAP[selectedNode.typeId] : null;

  return (
    <aside
      aria-label="Properties and Project Inspector"
      className="w-[264px] shrink-0 h-full bg-white border-l border-[#D9D9D9] flex flex-col select-none"
    >
      {/* Top Tabs + Collapse Chevron (>) matching image_289b89cf.png */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#EFEFEF]">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setActiveTab('properties')}
            className={`text-[15px] font-light transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'properties'
                ? 'text-[#333333] font-normal'
                : 'text-[#8C8C8C] hover:text-[#444444]'
            }`}
          >
            Properties
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('project')}
            className={`text-[15px] font-light transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'project'
                ? 'text-[#333333] font-normal'
                : 'text-[#8C8C8C] hover:text-[#444444]'
            }`}
          >
            Project
          </button>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Collapse properties panel"
          className="p-1 text-[#444444] hover:text-[#0078D7] hover:bg-[#F2F2F2] rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Inspector Body */}
      <div className="flex-1 overflow-y-auto studio-scroll px-3.5 py-3">
        {activeTab === 'properties' ? (
          selectedNode && def ? (
            <div>
              {/* Collapsible Blue Triangle Header matching image_289b89cf.png */}
              <button
                type="button"
                onClick={() => setSectionOpen(!sectionOpen)}
                className="w-full flex items-center gap-1.5 text-left py-1 mb-2.5 focus-visible:outline-none"
              >
                <span className="text-[9px] text-[#2B7AB8] shrink-0">{sectionOpen ? '◢' : '▶'}</span>
                <span className="text-[12.5px] font-medium text-[#22649B] truncate">
                  {selectedNode.label}
                </span>
              </button>

              {sectionOpen && (
                <div className="pl-2 space-y-2.5">
                  {def.params.length === 0 ? (
                    <p className="text-[12px] text-[#777777]">
                      This module has no configurable parameters.
                    </p>
                  ) : (
                    def.params.map((p) => {
                      const val = selectedNode.params[p.key] ?? p.defaultValue;
                      const isSwept = Boolean(selectedNode.sweptParams?.[p.key]);

                      if (p.type === 'boolean') {
                        return (
                          <div
                            key={p.key}
                            className="flex items-center justify-between gap-2 pt-0.5"
                          >
                            <label className="flex items-start gap-2 cursor-pointer group min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={(e) => onUpdateParam(selectedNode.id, p.key, e.target.checked)}
                                className="mt-0.5 h-3.5 w-3.5 accent-[#0078D7] border-[#888888] rounded-none shrink-0"
                              />
                              <span
                                title={p.label}
                                className="text-[12px] text-[#333333] leading-snug truncate group-hover:text-[#000000]"
                              >
                                {p.label}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => onToggleSweptParam(selectedNode.id, p.key)}
                              title="Toggle parameter sweep option"
                              className="p-0.5 hover:bg-[#F0F0F0] shrink-0"
                            >
                              <ParamGripIcon active={isSwept} />
                            </button>
                          </div>
                        );
                      }

                      if (p.type === 'select') {
                        return (
                          <div key={p.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <label title={p.label} className="text-[12px] text-[#333333] truncate">
                                {p.label}
                              </label>
                            </div>
                            <select
                              value={String(val)}
                              onChange={(e) => onUpdateParam(selectedNode.id, p.key, e.target.value)}
                              className="w-full h-[26px] px-1.5 text-[12px] text-[#333333] bg-white border border-[#BDBDBD] focus:border-[#0078D7] focus:outline-none"
                            >
                              {p.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      if (p.type === 'columns') {
                        const selectedCols = String(val || '')
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        return (
                          <div key={p.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <label title={p.label} className="text-[12px] text-[#333333] truncate">
                                {p.label}
                              </label>
                              <button
                                type="button"
                                onClick={() => onToggleSweptParam(selectedNode.id, p.key)}
                                title="Column options"
                                className="p-0.5 hover:bg-[#F0F0F0] shrink-0"
                              >
                                <ParamGripIcon active={isSwept} />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={String(val)}
                              onChange={(e) => onUpdateParam(selectedNode.id, p.key, e.target.value)}
                              placeholder="e.g. age, income or *"
                              className="w-full h-[25px] px-1.5 text-[12px] font-mono-tabular text-[#222222] bg-white border-[1.5px] border-[#333333] focus:border-[#0078D7] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setColPickerParam(colPickerParam === p.key ? null : p.key)
                              }
                              className="w-full h-[25px] bg-[#F2F2F2] hover:bg-[#E5E5E5] border border-[#C0C0C0] text-[11.5px] text-[#333333] font-medium transition-colors"
                            >
                              Launch column selector
                            </button>
                            {colPickerParam === p.key && (
                              <div className="border border-[#C8C8C8] bg-[#FAFAFA] p-2 space-y-1 max-h-[140px] overflow-y-auto studio-scroll">
                                <div className="text-[10.5px] text-[#666666] mb-1">
                                  Click columns to toggle:
                                </div>
                                {availableColumns.map((col) => {
                                  const checked = selectedCols.includes(col);
                                  return (
                                    <label
                                      key={col}
                                      className="flex items-center gap-1.5 text-[11.5px] cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          const base = selectedCols.filter((c) => c !== '*');
                                          const next = checked
                                            ? base.filter((c) => c !== col)
                                            : [...base, col];
                                          onUpdateParam(
                                            selectedNode.id,
                                            p.key,
                                            next.length > 0 ? next.join(', ') : '*'
                                          );
                                        }}
                                        className="h-3 w-3 accent-[#0078D7]"
                                      />
                                      <span className="truncate font-mono-tabular">{col}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (p.type === 'textarea') {
                        return (
                          <div key={p.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <label title={p.label} className="text-[12px] text-[#333333] truncate">
                                {p.label}
                              </label>
                            </div>
                            <textarea
                              rows={4}
                              value={String(val)}
                              placeholder={p.placeholder}
                              onChange={(e) => onUpdateParam(selectedNode.id, p.key, e.target.value)}
                              className="w-full p-2 text-[11.5px] font-mono-tabular text-[#222222] bg-white border-[1.5px] border-[#333333] focus:border-[#0078D7] focus:outline-none"
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={p.key} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <label title={p.label} className="text-[12px] text-[#333333] truncate">
                              {p.label}
                            </label>
                            <button
                              type="button"
                              onClick={() => onToggleSweptParam(selectedNode.id, p.key)}
                              title={
                                isSwept
                                  ? 'Parameter Sweep active (click for Single Value)'
                                  : 'Click to toggle Parameter Range mode'
                              }
                              className="p-0.5 hover:bg-[#F0F0F0] shrink-0"
                            >
                              <ParamGripIcon active={isSwept} />
                            </button>
                          </div>
                          <input
                            type={p.type === 'number' && !isSwept ? 'number' : 'text'}
                            value={val}
                            min={p.min}
                            max={p.max}
                            step={p.step}
                            placeholder={isSwept ? 'e.g. 0.05, 0.1, 0.2' : p.placeholder}
                            onChange={(e) =>
                              onUpdateParam(
                                selectedNode.id,
                                p.key,
                                p.type === 'number' && !isSwept
                                  ? Number(e.target.value)
                                  : e.target.value
                              )
                            }
                            className={`w-full h-[25px] px-1.5 text-[12px] tabular-nums text-[#222222] bg-white border-[1.5px] focus:outline-none ${
                              isSwept
                                ? 'border-[#0078D7] bg-[#F5FAFE]'
                                : 'border-[#333333] focus:border-[#0078D7]'
                            }`}
                          />
                        </div>
                      );
                    })
                  )}

                  {/* Inline Node Comment Editor */}
                  <div className="pt-2.5 mt-2 border-t border-[#EEEEEE] space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11.5px] text-[#555555]">Module Comment</label>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateComment(
                            selectedNode.id,
                            selectedNode.comment || '',
                            !selectedNode.commentExpanded
                          )
                        }
                        className="text-[11px] text-[#0066CC] hover:underline"
                      >
                        {selectedNode.commentExpanded ? 'Collapse on canvas' : 'Show on canvas'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={selectedNode.comment || ''}
                      placeholder="Add annotation note..."
                      onChange={(e) =>
                        onUpdateComment(
                          selectedNode.id,
                          e.target.value,
                          selectedNode.commentExpanded
                        )
                      }
                      className="w-full h-[25px] px-1.5 text-[11.5px] text-[#333333] bg-white border border-[#C8C8C8] focus:border-[#0078D7] focus:outline-none"
                    />
                  </div>

                  {/* Execution Output Actions */}
                  {nodeResult && (
                    <div className="pt-2.5 mt-2 border-t border-[#EAEAEA] space-y-2">
                      <div className="text-[11.5px] font-medium text-[#22649B]">
                        Execution Output
                      </div>
                      {nodeResult.metrics && (
                        <div className="space-y-1 text-[11.5px]">
                          {Object.entries(nodeResult.metrics)
                            .slice(0, 4)
                            .map(([k, v]) => (
                              <div key={k} className="flex items-center justify-between gap-2">
                                <span className="text-[#666666] truncate">{k}</span>
                                <span className="font-mono-tabular text-[#222222] font-medium shrink-0">
                                  {String(v)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenVisualize(selectedNode.id)}
                        className="w-full h-[27px] flex items-center justify-center gap-1.5 text-[12px] font-medium text-white bg-[#0078D7] hover:bg-[#0066B8] transition-colors"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Visualize Results</span>
                      </button>
                    </div>
                  )}

                  {/* Delete node button */}
                  <div className="pt-2.5 border-t border-[#F0F0F0]">
                    <button
                      type="button"
                      onClick={() => onDeleteNode(selectedNode.id)}
                      className="flex items-center gap-1.5 text-[11.5px] text-[#9E2A2B] hover:text-[#780000] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete module from canvas</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-[12px] text-[#777777]">
              Select a module on the canvas to view or edit its properties.
            </div>
          )
        ) : (
          <div className="space-y-4 text-[12px] text-[#444444]">
            <div>
              <div className="text-[11.5px] text-[#777777] mb-0.5">Experiment Name</div>
              <div className="font-medium text-[#222222]">{experimentTitle}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 py-2 border-y border-[#EEEEEE]">
              <div>
                <div className="text-[11px] text-[#777777]">Modules</div>
                <div className="text-[15px] font-medium tabular-nums">{graph.nodes.length}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#777777]">Connections</div>
                <div className="text-[15px] font-medium tabular-nums">{graph.edges.length}</div>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#777777] mb-1">Execution State</div>
              <div className="text-[#333333]">{experimentStatus}</div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-[#EEEEEE]">
              <div className="text-[11.5px] font-medium text-[#22649B]">Backend Storage & ML</div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-[#666666]">Database</span>
                <span className="font-mono-tabular text-[#333333]">
                  {infraHealth?.postgres ? 'PostgreSQL (Drizzle)' : 'Runtime Store'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-[#666666]">Object Store</span>
                <span className="font-mono-tabular text-[#333333]">
                  RustFS ({infraHealth?.rustfs.bucket || 'dynamic-ml-studio'})
                </span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-[#666666]">Compute</span>
                <span className="font-mono-tabular text-[#333333]">TorchJS Engine</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Docked Bottom Quick Help Panel with Collapse Chevron matching image_289b89cf.png */}
      <div className="border-t border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setQuickHelpOpen((o) => !o)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#A6A6A6]" />
            <span className="text-[13.5px] font-normal text-[#666666]">Quick Help</span>
          </div>
          {quickHelpOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#555555]" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-[#555555]" />
          )}
        </button>

        {quickHelpOpen && (
          <div className="mt-2">
            <p className="text-[12px] text-[#444444] leading-relaxed line-clamp-3">
              {def
                ? def.quickHelp
                : 'Drag modules from the left palette onto the canvas and connect ports to build an ML pipeline.'}
            </p>
            <button
              type="button"
              onClick={() => onOpenHelp(selectedNode)}
              className="mt-1 text-[12px] text-[#0066CC] hover:underline focus-visible:outline-none"
            >
              (more help...)
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, Loader2, Search, X } from 'lucide-react';
import { MODULE_MAP } from '../shared/catalog';
import {
  NodeExecutionSummary,
  PipelineEdge,
  PipelineGraph,
  PipelineNode,
} from '../shared/types';
import { ModuleIcon } from './StudioIcons';

interface PipelineCanvasProps {
  graph: PipelineGraph;
  title: string;
  statusText: string;
  savedAtText: string;
  isRunning: boolean;
  nodeResults: Record<string, NodeExecutionSummary>;
  onTitleChange: (nextTitle: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onToggleComment: (nodeId: string) => void;
  onUpdateComment: (nodeId: string, comment: string, expanded?: boolean) => void;
  onDropNewModule: (typeId: string, x: number, y: number, customLabel?: string, customParams?: Record<string, any>) => void;
  onConnectPorts: (sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onUpdateViewport: (viewport: PipelineGraph['viewport']) => void;
  onVisualizeNode: (nodeId: string) => void;
}

export function getNodeWidth(node: PipelineNode): number {
  const est = node.label.length * 7.2 + 86;
  return Math.max(198, Math.min(264, Math.round(est)));
}

export function getNodeHeight(node: PipelineNode): number {
  return node.commentExpanded ? 78 : 44;
}

function getPortOffset(index: number, count: number, width: number): number {
  if (count <= 1) return width * 0.5;
  if (count === 2) return index === 0 ? width * 0.34 : width * 0.66;
  const pad = 40;
  const usable = Math.max(40, width - pad * 2);
  return pad + (usable * index) / (count - 1);
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  graph,
  title,
  statusText,
  savedAtText,
  isRunning,
  nodeResults,
  onTitleChange,
  onSelectNode,
  onMoveNode,
  onToggleComment,
  onUpdateComment,
  onDropNewModule,
  onConnectPorts,
  onDeleteEdge,
  onUpdateViewport,
  onVisualizeNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [panMode, setPanMode] = useState(false);
  const [showCanvasSearch, setShowCanvasSearch] = useState(false);
  const [canvasSearch, setCanvasSearch] = useState('');

  // Node drag state
  const [draggingNode, setDraggingNode] = useState<{
    nodeId: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Viewport pan drag state
  const [panning, setPanning] = useState<{
    startClientX: number;
    startClientY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);

  // Port wiring drag state
  const [connecting, setConnecting] = useState<{
    sourceNodeId: string;
    sourcePortId: string;
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

  useEffect(() => {
    setTitleDraft(title);
  }, [title]);

  const toCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const { panX, panY, zoom } = graph.viewport;
      return {
        x: (clientX - rect.left - panX) / zoom,
        y: (clientY - rect.top - panY) / zoom,
      };
    },
    [graph.viewport]
  );

  // Global pointer listeners for smooth node dragging, wiring, and panning
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (draggingNode) {
        const dx = (e.clientX - draggingNode.startClientX) / graph.viewport.zoom;
        const dy = (e.clientY - draggingNode.startClientY) / graph.viewport.zoom;
        onMoveNode(
          draggingNode.nodeId,
          Math.round(draggingNode.origX + dx),
          Math.round(draggingNode.origY + dy)
        );
      } else if (panning) {
        const dx = e.clientX - panning.startClientX;
        const dy = e.clientY - panning.startClientY;
        onUpdateViewport({
          ...graph.viewport,
          panX: Math.round(panning.origPanX + dx),
          panY: Math.round(panning.origPanY + dy),
        });
      } else if (connecting) {
        const pt = toCanvasCoords(e.clientX, e.clientY);
        setConnecting((prev) => (prev ? { ...prev, currX: pt.x, currY: pt.y } : null));
      }
    };

    const handleUp = () => {
      setDraggingNode(null);
      setPanning(null);
      setConnecting(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [draggingNode, panning, connecting, graph.viewport, onMoveNode, onUpdateViewport, toCanvasCoords]);

  // Keyboard delete for selected edge
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdgeId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        onDeleteEdge(selectedEdgeId);
        setSelectedEdgeId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedEdgeId, onDeleteEdge]);

  const nodePositions = useMemo(() => {
    const map = new Map<string, { node: PipelineNode; width: number; height: number }>();
    for (const n of graph.nodes) {
      map.set(n.id, { node: n, width: getNodeWidth(n), height: getNodeHeight(n) });
    }
    return map;
  }, [graph.nodes]);

  const connectedPorts = useMemo(() => {
    const set = new Set<string>();
    for (const e of graph.edges) {
      set.add(`${e.sourceNodeId}:${e.sourcePortId}`);
      set.add(`${e.targetNodeId}:${e.targetPortId}`);
    }
    return set;
  }, [graph.edges]);

  const handleFitView = () => {
    if (graph.nodes.length === 0 || !containerRef.current) {
      onUpdateViewport({ panX: 0, panY: 0, zoom: 1 });
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of graph.nodes) {
      const w = getNodeWidth(n);
      const h = getNodeHeight(n);
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    }
    const contentW = maxX - minX + 80;
    const contentH = maxY - minY + 120;
    const zoom = Math.max(0.45, Math.min(1.15, Math.min(rect.width / contentW, rect.height / contentH)));
    const panX = Math.round((rect.width - (maxX - minX) * zoom) / 2 - minX * zoom);
    const panY = Math.round((rect.height - (maxY - minY) * zoom) / 2 - minY * zoom);
    onUpdateViewport({ panX, panY, zoom: +zoom.toFixed(2) });
  };

  const handleZoomStep = (delta: number) => {
    const next = Math.max(0.4, Math.min(1.8, +(graph.viewport.zoom + delta).toFixed(2)));
    onUpdateViewport({ ...graph.viewport, zoom: next });
  };

  const matchingNodeIds = useMemo(() => {
    const q = canvasSearch.trim().toLowerCase();
    if (!q) return null;
    return new Set(graph.nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id));
  }, [canvasSearch, graph.nodes]);

  const renderEdgePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dy = Math.max(28, Math.abs(y2 - y1) * 0.55);
    return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
  };

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('application/dynamic-ml-node');
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          const pt = toCanvasCoords(e.clientX, e.clientY);
          onDropNewModule(
            parsed.typeId,
            Math.round(pt.x - 105),
            Math.round(pt.y - 22),
            parsed.customLabel,
            parsed.customParams
          );
        } catch {
          // ignore malformed drop
        }
      }}
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-canvas-ui]')) return;
        setSelectedEdgeId(null);
        onSelectNode(null);
        if (panMode || e.button === 1) {
          setPanning({
            startClientX: e.clientX,
            startClientY: e.clientY,
            origPanX: graph.viewport.panX,
            origPanY: graph.viewport.panY,
          });
        }
      }}
      className={`relative flex-1 h-full bg-[#F4F4F4] overflow-hidden select-none ${
        panMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    >
      {/* Top Canvas Header Overlay (Title + Draft Status + Search) matching mockup */}
      <div
        data-canvas-ui
        className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between px-5 pt-3 pointer-events-none"
      >
        <div className="pointer-events-auto max-w-[65%]">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                if (titleDraft.trim()) onTitleChange(titleDraft.trim());
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingTitle(false);
                  if (titleDraft.trim()) onTitleChange(titleDraft.trim());
                }
              }}
              className="text-[20px] sm:text-[22px] font-light text-[#444444] bg-white border border-[#0078D7] px-2 py-0.5 focus:outline-none w-[360px] max-w-full"
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              title="Click to rename experiment"
              className="text-[19px] sm:text-[22px] font-light text-[#555555] hover:text-[#222222] cursor-text truncate tracking-[-0.01em]"
            >
              {title}
            </h1>
          )}
        </div>

        <div className="pointer-events-auto flex flex-col items-end text-right shrink-0">
          <div className="text-[12px] text-[#8A8A8A] leading-tight">
            {isRunning ? 'Running...' : statusText}
          </div>
          <div className="text-[11px] text-[#8A8A8A] mt-3 tabular-nums leading-tight">
            {savedAtText}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {showCanvasSearch && (
              <div className="flex items-center bg-white border border-[#C8C8C8] h-[24px] px-1.5">
                <input
                  autoFocus
                  value={canvasSearch}
                  onChange={(e) => setCanvasSearch(e.target.value)}
                  placeholder="Find node..."
                  className="w-28 text-[11px] text-[#333333] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCanvasSearch('');
                    setShowCanvasSearch(false);
                  }}
                  className="text-[#777777] hover:text-[#222222]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowCanvasSearch(!showCanvasSearch)}
              title="Find module on canvas"
              className="p-1 text-[#777777] hover:text-[#0078D7] transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transformed Canvas Layer */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${graph.viewport.panX}px, ${graph.viewport.panY}px) scale(${graph.viewport.zoom})`,
        }}
      >
        {/* SVG Edges Layer */}
        <svg className="overflow-visible absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker
              id="arrow-gray"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#7A7A7A" />
            </marker>
            <marker
              id="arrow-blue"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#0078D7" />
            </marker>
          </defs>

          {graph.edges.map((edge: PipelineEdge) => {
            const src = nodePositions.get(edge.sourceNodeId);
            const dst = nodePositions.get(edge.targetNodeId);
            if (!src || !dst) return null;
            const srcDef = MODULE_MAP[src.node.typeId];
            const dstDef = MODULE_MAP[dst.node.typeId];
            const srcPorts = srcDef?.outputPorts || [];
            const dstPorts = dstDef?.inputPorts || [];
            const srcIdx = Math.max(0, srcPorts.findIndex((p) => p.id === edge.sourcePortId));
            const dstIdx = Math.max(0, dstPorts.findIndex((p) => p.id === edge.targetPortId));

            const x1 = src.node.x + getPortOffset(srcIdx, srcPorts.length, src.width);
            const y1 = src.node.y + src.height;
            const x2 = dst.node.x + getPortOffset(dstIdx, dstPorts.length, dst.width);
            const y2 = dst.node.y - 3;
            const d = renderEdgePath(x1, y1, x2, y2);
            const isSel = selectedEdgeId === edge.id;

            return (
              <g key={edge.id} className="pointer-events-auto cursor-pointer">
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    onSelectNode(null);
                  }}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={isSel ? '#0078D7' : '#7A7A7A'}
                  strokeWidth={isSel ? 2.2 : 1.7}
                  markerEnd={isSel ? 'url(#arrow-blue)' : 'url(#arrow-gray)'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    onSelectNode(null);
                  }}
                />
              </g>
            );
          })}

          {connecting && (
            <path
              d={renderEdgePath(
                connecting.startX,
                connecting.startY,
                connecting.currX,
                connecting.currY
              )}
              fill="none"
              stroke="#0078D7"
              strokeWidth={1.8}
              strokeDasharray="4 3"
            />
          )}
        </svg>

        {/* Nodes Layer */}
        {graph.nodes.map((node) => {
          const def = MODULE_MAP[node.typeId];
          const width = getNodeWidth(node);
          const height = getNodeHeight(node);
          const isSelected = graph.selectedNodeId === node.id;
          const result = nodeResults[node.id];
          const effectiveStatus = isRunning
            ? 'running'
            : result?.status === 'error'
            ? 'error'
            : result?.status === 'completed'
            ? 'completed'
            : node.status || 'idle';

          const dimmed = matchingNodeIds !== null && !matchingNodeIds.has(node.id);
          const inPorts = def?.inputPorts || [];
          const outPorts = def?.outputPorts || [];
          const showBadge = Boolean(node.outputBadge || (result && (result.previewRows || result.metrics)));

          return (
            <div
              key={node.id}
              data-canvas-ui
              style={{
                left: node.x,
                top: node.y,
                width,
                height,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                setSelectedEdgeId(null);
                onSelectNode(node.id);
                if (!panMode && !(e.target as HTMLElement).closest('input')) {
                  setDraggingNode({
                    nodeId: node.id,
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    origX: node.x,
                    origY: node.y,
                  });
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (result) onVisualizeNode(node.id);
              }}
              className={`group absolute bg-white rounded-[6px] flex flex-col justify-start px-3 pt-2.5 transition-opacity ${
                dimmed ? 'opacity-30' : 'opacity-100'
              } ${
                isSelected
                  ? 'border-[1.5px] border-[#0078D7] shadow-[0_2px_6px_rgba(0,120,215,0.16)] z-10'
                  : 'border border-[#C8C8C8] shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:border-[#9E9E9E]'
              } ${panMode ? 'cursor-grab' : 'cursor-move'}`}
            >
              {/* Top Input Ports */}
              {inPorts.map((port, idx) => {
                const px = getPortOffset(idx, inPorts.length, width);
                const isConn = connectedPorts.has(`${node.id}:${port.id}`);
                return (
                  <button
                    key={port.id}
                    type="button"
                    title={`Input: ${port.label}`}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      if (connecting && connecting.sourceNodeId !== node.id) {
                        onConnectPorts(
                          connecting.sourceNodeId,
                          connecting.sourcePortId,
                          node.id,
                          port.id
                        );
                        setConnecting(null);
                      }
                    }}
                    style={{ left: px - 4.5, top: -4.5 }}
                    className={`absolute w-[9px] h-[9px] rounded-full border transition-colors ${
                      connecting
                        ? 'bg-[#E6F2FB] border-[#0078D7] scale-125'
                        : isConn
                        ? 'bg-[#8A8A8A] border-[#8A8A8A]'
                        : 'bg-white border-[#8A8A8A] hover:border-[#0078D7]'
                    }`}
                  />
                );
              })}

              {/* Primary Node Header Row */}
              <div className="flex items-center gap-2 min-w-0">
                <ModuleIcon iconType={def?.iconType || 'model-class'} className="w-[20px] h-[20px] shrink-0" />
                <span className="flex-1 text-[12.5px] font-normal text-[#333333] whitespace-nowrap truncate">
                  {node.label}
                </span>

                {/* Comment Expand/Collapse Chevron matching Metadata Editor / Project Columns in image_289b89cf.png */}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComment(node.id);
                  }}
                  title={node.commentExpanded ? 'Collapse comment' : 'Expand module comment'}
                  className={`p-0.5 text-[#555555] hover:text-[#0078D7] transition-opacity shrink-0 ${
                    node.commentExpanded || node.comment ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {node.commentExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Status Indicator */}
                {effectiveStatus === 'completed' && (
                  <Check className="w-[16px] h-[16px] text-[#66B300] shrink-0" strokeWidth={2.6} />
                )}
                {effectiveStatus === 'running' && (
                  <Loader2 className="w-[15px] h-[15px] text-[#0078D7] animate-spin shrink-0" />
                )}
                {effectiveStatus === 'error' && (
                  <span title={result?.errorMessage || node.errorMessage || 'Execution error'}>
                    <AlertCircle className="w-[16px] h-[16px] text-[#C62828] shrink-0" />
                  </span>
                )}
              </div>

              {/* Expanded Inline Comment Row matching image_289b89cf.png */}
              {node.commentExpanded && (
                <div className="mt-1.5 pl-[28px] pr-1">
                  <input
                    type="text"
                    value={node.comment || ''}
                    placeholder="Add module note..."
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateComment(node.id, e.target.value, true)}
                    className="w-full text-[11px] text-[#666666] bg-transparent border-b border-transparent focus:border-[#C8C8C8] focus:outline-none truncate"
                  />
                </div>
              )}

              {/* Bottom Output Ports */}
              {outPorts.map((port, idx) => {
                const px = getPortOffset(idx, outPorts.length, width);
                const isConn = connectedPorts.has(`${node.id}:${port.id}`);
                return (
                  <button
                    key={port.id}
                    type="button"
                    title={`Output: ${port.label} (drag to connect)`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setConnecting({
                        sourceNodeId: node.id,
                        sourcePortId: port.id,
                        startX: node.x + px,
                        startY: node.y + height,
                        currX: node.x + px,
                        currY: node.y + height,
                      });
                    }}
                    style={{ left: px - 4.5, bottom: -4.5 }}
                    className={`absolute w-[9px] h-[9px] rounded-full border cursor-crosshair transition-transform hover:scale-125 ${
                      isConn
                        ? 'bg-[#8A8A8A] border-[#8A8A8A]'
                        : 'bg-white border-[#8A8A8A] hover:border-[#0078D7]'
                    }`}
                  />
                );
              })}

              {/* Output / Selection Number Badge */}
              {showBadge && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVisualizeNode(node.id);
                  }}
                  title="Visualize node output and TorchJS metrics"
                  style={{ left: width * 0.5 - 10.5, bottom: -15 }}
                  className="absolute w-[21px] h-[21px] rounded-full bg-white border border-[#7A7A7A] hover:border-[#0078D7] text-[11px] font-medium text-[#444444] flex items-center justify-center shadow-xs tabular-nums"
                >
                  {node.outputBadge || '1'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Edge Delete Action */}
      {selectedEdgeId && (
        <div
          data-canvas-ui
          className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-white border border-[#C8C8C8] shadow-sm px-3 py-1.5 flex items-center gap-3 text-[12px]"
        >
          <span className="text-[#444444]">Connection selected</span>
          <button
            type="button"
            onClick={() => {
              onDeleteEdge(selectedEdgeId);
              setSelectedEdgeId(null);
            }}
            className="text-[#B91C1C] font-medium hover:underline"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Bottom-Left Zoom & Pan Controls */}
      <div
        data-canvas-ui
        className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-[#F4F4F4]/90 px-2 py-1"
      >
        <button
          type="button"
          onClick={handleFitView}
          title="Fit pipeline to viewport"
          className="w-7 h-7 flex items-center justify-center text-[#666666] hover:text-[#0078D7] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <path d="M4 8V4H8M16 4H20V8M20 16V20H16M8 20H4V16" stroke="currentColor" strokeWidth="1.8" />
            <rect x="8.5" y="8.5" width="7" height="7" fill="currentColor" opacity="0.55" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => handleZoomStep(-0.1)}
          title="Zoom out"
          className="w-6 h-6 rounded-full border-[1.6px] border-[#666666] hover:border-[#0078D7] text-[#666666] hover:text-[#0078D7] flex items-center justify-center text-[15px] leading-none font-medium"
        >
          −
        </button>

        <input
          type="range"
          min={40}
          max={180}
          value={Math.round(graph.viewport.zoom * 100)}
          onChange={(e) =>
            onUpdateViewport({ ...graph.viewport, zoom: Number(e.target.value) / 100 })
          }
          aria-label="Canvas zoom level"
          className="studio-zoom-slider w-[96px] sm:w-[116px]"
        />

        <button
          type="button"
          onClick={() => handleZoomStep(0.1)}
          title="Zoom in"
          className="w-6 h-6 rounded-full border-[1.6px] border-[#666666] hover:border-[#0078D7] text-[#666666] hover:text-[#0078D7] flex items-center justify-center text-[14px] leading-none font-medium"
        >
          +
        </button>

        <button
          type="button"
          onClick={() => onUpdateViewport({ panX: 0, panY: 0, zoom: 1 })}
          title="Reset zoom to 100% (1:1)"
          className="h-6 px-1.5 border-[1.5px] border-[#666666] hover:border-[#0078D7] text-[11px] font-semibold text-[#555555] hover:text-[#0078D7] tabular-nums"
        >
          1:1
        </button>

        <button
          type="button"
          onClick={handleFitView}
          title="Zoom to fit all modules"
          className="w-6 h-6 flex items-center justify-center text-[#666666] hover:text-[#0078D7]"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <path d="M4 9V4H9M15 4H20V9M20 15V20H15M9 20H4V15" stroke="currentColor" strokeWidth="1.7" />
            <path d="M9 9L4 4M15 9L20 4M15 15L20 20M9 15L4 20" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setPanMode(!panMode)}
          title={panMode ? 'Disable Pan Mode' : 'Enable Canvas Pan Mode'}
          className={`w-6 h-6 flex items-center justify-center transition-colors ${
            panMode ? 'text-[#0078D7] bg-[#E5F1FA] rounded' : 'text-[#666666] hover:text-[#0078D7]'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <path
              d="M12 3V21M3 12H21M12 3L9.5 5.5M12 3L14.5 5.5M12 21L9.5 18.5M12 21L14.5 18.5M3 12L5.5 9.5M3 12L5.5 14.5M21 12L18.5 9.5M21 12L18.5 14.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Scrollbars */}
      <div aria-hidden="true" className="hidden sm:block absolute top-8 bottom-3 right-1 w-[8px] bg-[#E6E6E6]">
        <div className="w-full h-[46%] mt-[32px] bg-[#AEAEAE]" />
      </div>
      <div aria-hidden="true" className="hidden sm:block absolute bottom-1 left-[38%] right-4 h-[8px] bg-[#E6E6E6]">
        <div className="h-full w-[45%] bg-[#AEAEAE]" />
      </div>
    </div>
  );
};

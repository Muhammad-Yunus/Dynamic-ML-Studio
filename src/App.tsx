import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CopyPlus,
  FlaskConical,
  HelpCircle,
  History,
  Menu,
  Play,
  Plus,
  Save,
  SlidersHorizontal,
  Smile,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';
import { api } from './lib/api';
import { DEFAULT_GETTING_STARTED_GRAPH, MODULE_MAP } from './shared/catalog';
import {
  AuthUser,
  DatasetRecord,
  ExperimentSummary,
  NodeExecutionSummary,
  PipelineGraph,
  PipelineNode,
  TrainedModelRecord,
  WebServiceRecord,
} from './shared/types';
import { RailIcon } from './components/StudioIcons';
import { PaletteSidebar } from './components/PaletteSidebar';
import { PipelineCanvas } from './components/PipelineCanvas';
import { InspectorPanel } from './components/InspectorPanel';
import { WorkspaceViews } from './components/WorkspaceViews';
import {
  AuthModal,
  DatasetUploadModal,
  DeployWebServiceModal,
  ModuleHelpModal,
  RunHistoryModal,
  VisualizeResultsModal,
} from './components/StudioModals';

type RailSection = 'projects' | 'experiments' | 'webservices' | 'datasets' | 'models' | 'settings';

function formatDraftTime(date: Date) {
  return `Draft saved at ${date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })}`;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<RailSection>('experiments');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [infraHealth, setInfraHealth] = useState<{
    postgres: boolean;
    rustfs: { mode: string; bucket: string };
  } | null>(null);

  // Studio Experiment State
  const [experimentId, setExperimentId] = useState<string>('sample-getting-started');
  const [title, setTitle] = useState('Getting Started with Dynamic ML Studio');
  const [statusText, setStatusText] = useState('In draft');
  const [savedAtText, setSavedAtText] = useState(() => formatDraftTime(new Date()));
  const [graph, setGraph] = useState<PipelineGraph>(() =>
    JSON.parse(JSON.stringify(DEFAULT_GETTING_STARTED_GRAPH))
  );
  const [savedSnapshot, setSavedSnapshot] = useState<PipelineGraph>(() =>
    JSON.parse(JSON.stringify(DEFAULT_GETTING_STARTED_GRAPH))
  );

  // Backend Data Collections
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [models, setModels] = useState<TrainedModelRecord[]>([]);
  const [webServices, setWebServices] = useState<WebServiceRecord[]>([]);
  const [runs, setRuns] = useState<any[]>([]);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [nodeResults, setNodeResults] = useState<Record<string, NodeExecutionSummary>>({});
  const [latestLogs, setLatestLogs] = useState<string[]>([]);

  // Responsive Sidebars
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'palette' | 'inspector'>('none');

  // Modals & Notifications
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [runHistoryOpen, setRunHistoryOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [visualizeNodeId, setVisualizeNodeId] = useState<string | null>(null);
  const [helpNode, setHelpNode] = useState<PipelineNode | null>(null);
  const [toast, setToast] = useState<{ type: 'info' | 'error'; message: string } | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4200);
  }, []);

  const refreshWorkspaceData = useCallback(async (signedInUser: AuthUser | null) => {
    try {
      const [expRes, dsRes] = await Promise.all([api.listExperiments(), api.listDatasets()]);
      setExperiments(expRes.experiments);
      setDatasets(dsRes.datasets);

      if (signedInUser) {
        const [mRes, wRes, rRes] = await Promise.all([
          api.listModels(),
          api.listWebServices(),
          api.listRuns(),
        ]);
        setModels(mRes.models);
        setWebServices(wRes.webServices);
        setRuns(rRes.runs);
      } else {
        setModels([]);
        setWebServices([]);
        setRuns([]);
      }
    } catch {
      // ignore initial transient errors
    }
  }, []);

  useEffect(() => {
    api.health().then(setInfraHealth).catch(() => null);
    refreshWorkspaceData(null);
  }, [refreshWorkspaceData]);

  // Responsive auto-collapse drawers on narrow viewports
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) {
        setPaletteCollapsed(true);
        setInspectorCollapsed(true);
      } else {
        setPaletteCollapsed(false);
        setInspectorCollapsed(false);
        setMobileDrawer('none');
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const userDatasets = useMemo(() => datasets.filter((d) => !d.isSample), [datasets]);

  const selectedNode = useMemo(
    () => graph.nodes.find((n) => n.id === graph.selectedNodeId) || null,
    [graph.nodes, graph.selectedNodeId]
  );

  // Graph Mutators
  const handleSelectNode = useCallback((nodeId: string | null) => {
    setGraph((prev) => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  const handleMoveNode = useCallback((nodeId: string, x: number, y: number) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
    }));
    setStatusText('In draft');
  }, []);

  const addModuleToCanvas = useCallback(
    (typeId: string, x?: number, y?: number, customLabel?: string, customParams?: Record<string, any>) => {
      const def = MODULE_MAP[typeId];
      if (!def) return;
      const defaultParams: Record<string, any> = {};
      for (const p of def.params) defaultParams[p.key] = p.defaultValue;

      const newNode: PipelineNode = {
        id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        typeId,
        label: customLabel || def.name,
        x: x ?? 260 + (graph.nodes.length % 5) * 32,
        y: y ?? 110 + (graph.nodes.length % 5) * 48,
        params: { ...defaultParams, ...(customParams || {}) },
        status: 'idle',
      };

      setGraph((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
        selectedNodeId: newNode.id,
      }));
      setStatusText('In draft');
      setMobileDrawer('none');
    },
    [graph.nodes.length]
  );

  const handleConnectPorts = useCallback(
    (sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string) => {
      if (sourceNodeId === targetNodeId) return;
      setGraph((prev) => {
        const filtered = prev.edges.filter(
          (e) => !(e.targetNodeId === targetNodeId && e.targetPortId === targetPortId)
        );
        return {
          ...prev,
          edges: [
            ...filtered,
            {
              id: `edge-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              sourceNodeId,
              sourcePortId,
              targetNodeId,
              targetPortId,
            },
          ],
        };
      });
      setStatusText('In draft');
    },
    []
  );

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setGraph((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => e.id !== edgeId),
    }));
    setStatusText('In draft');
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId),
      selectedNodeId: prev.selectedNodeId === nodeId ? null : prev.selectedNodeId,
    }));
    setStatusText('In draft');
  }, []);

  const handleUpdateParam = useCallback((nodeId: string, key: string, value: any) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, params: { ...n.params, [key]: value } } : n
      ),
    }));
    setStatusText('In draft');
  }, []);

  // Pipeline Actions
  const handleSave = async (asNew = false) => {
    if (!user) {
      setAuthModalOpen(true);
      showToast('Sign in to save experiments to PostgreSQL.');
      return;
    }
    try {
      const nextTitle = asNew ? `${title} (Copy)` : title;
      const res = await api.saveExperiment({
        id: asNew ? undefined : experimentId,
        title: nextTitle,
        status: 'Saved',
        graphJson: graph,
      });
      setExperimentId(res.experiment.id);
      setTitle(res.experiment.title);
      setSavedSnapshot(JSON.parse(JSON.stringify(graph)));
      setStatusText('Saved');
      setSavedAtText(formatDraftTime(new Date()));
      showToast(`Saved "${res.experiment.title}" to PostgreSQL.`);
      refreshWorkspaceData(user);
    } catch (err: any) {
      showToast(err.message || 'Save failed.', 'error');
    }
  };

  const handleDiscardChanges = () => {
    setGraph(JSON.parse(JSON.stringify(savedSnapshot)));
    setNodeResults({});
    setStatusText('In draft');
    showToast('Discarded unsaved canvas changes.');
  };

  const handleRunPipeline = async () => {
    if (graph.nodes.length === 0) {
      showToast('Add modules to the canvas before running.', 'error');
      return;
    }
    setIsRunning(true);
    setStatusText('Running...');
    try {
      const res = await api.runPipeline({
        graphJson: graph,
        experimentId,
      });
      setNodeResults(res.nodeResults);
      setLatestLogs(res.logs);
      setStatusText(res.status === 'finished' ? 'Finished' : 'Run Failed');
      setSavedAtText(formatDraftTime(new Date()));

      // Update node statuses
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => ({
          ...n,
          status: res.nodeResults[n.id]?.status || 'idle',
        })),
      }));

      if (res.status === 'finished') {
        showToast(`Pipeline completed in ${res.durationMs} ms (TorchJS Engine).`);
        if (user) refreshWorkspaceData(user);
      } else {
        const failed = Object.values(res.nodeResults).find((r) => r.status === 'error');
        showToast(failed?.errorMessage || 'Pipeline execution failed.', 'error');
      }
    } catch (err: any) {
      setStatusText('Run Failed');
      showToast(err.message || 'Failed to execute pipeline.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleNewBlankExperiment = () => {
    const empty: PipelineGraph = {
      nodes: [],
      edges: [],
      viewport: { panX: 0, panY: 0, zoom: 1 },
      selectedNodeId: null,
    };
    setExperimentId(`draft-${Date.now()}`);
    setTitle('Untitled Experiment');
    setGraph(empty);
    setSavedSnapshot(empty);
    setNodeResults({});
    setStatusText('In draft');
    setActiveSection('experiments');
    setNewMenuOpen(false);
  };

  const handleOpenExperiment = (exp: ExperimentSummary) => {
    setExperimentId(exp.id);
    setTitle(exp.title);
    setGraph(JSON.parse(JSON.stringify(exp.graphJson)));
    setSavedSnapshot(JSON.parse(JSON.stringify(exp.graphJson)));
    setStatusText(exp.status);
    setNodeResults({});
    setActiveSection('experiments');
  };

  const railItems: { id: RailSection; label: string }[] = [
    { id: 'projects', label: 'Projects' },
    { id: 'experiments', label: 'Experiments' },
    { id: 'webservices', label: 'Web Services' },
    { id: 'datasets', label: 'Datasets' },
    { id: 'models', label: 'Trained Models' },
    { id: 'settings', label: 'Settings' },
  ];

  const visualizeNode = useMemo(
    () => graph.nodes.find((n) => n.id === visualizeNodeId) || null,
    [graph.nodes, visualizeNodeId]
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#F4F4F4]">
      {/* ================= TOP DARK HEADER BAR ================= */}
      <header className="h-[46px] shrink-0 bg-[#323232] text-white flex items-center justify-between px-3 select-none z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileDrawer((d) => (d === 'palette' ? 'none' : 'palette'));
              } else {
                setPaletteCollapsed((c) => !c);
              }
            }}
            aria-label="Toggle module palette"
            className="p-1.5 text-[#E0E0E0] hover:text-white hover:bg-[#444444] transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <span className="text-[16px] sm:text-[17px] font-light tracking-[-0.01em] text-white whitespace-nowrap truncate">
            Dynamic ML Studio
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Responsive Inspector Toggle on mobile/tablet */}
          {activeSection === 'experiments' && (
            <button
              type="button"
              onClick={() => setMobileDrawer((d) => (d === 'inspector' ? 'none' : 'inspector'))}
              title="Toggle Properties Inspector"
              className="lg:hidden p-1.5 text-[#E0E0E0] hover:text-white hover:bg-[#444444]"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}

          {/* Account / Workspace Selector */}
          <button
            type="button"
            onClick={() => (user ? setActiveSection('settings') : setAuthModalOpen(true))}
            className="hidden sm:flex items-center gap-1.5 text-[12px] text-[#E2E2E2] hover:text-white px-2 py-1 hover:bg-[#444444] transition-colors max-w-[200px]"
          >
            <span className="truncate">
              {user ? `${user.displayName}-Workspace` : 'Sign In - Free Workspace'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
          </button>

          {/* Help Icon */}
          <button
            type="button"
            onClick={() => setHelpNode(selectedNode || graph.nodes[0] || null)}
            title="Module & Studio Help"
            className="p-1 text-[#E2E2E2] hover:text-white"
          >
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>

          {/* Projects / Gallery Icon */}
          <button
            type="button"
            onClick={() => setActiveSection('projects')}
            title="Experiments & Gallery"
            className="hidden sm:inline-flex p-1 text-[#E2E2E2] hover:text-white"
          >
            <Users className="w-[18px] h-[18px]" />
          </button>

          {/* User Profile Smile / Auth Button */}
          <button
            type="button"
            onClick={() => (user ? setActiveSection('settings') : setAuthModalOpen(true))}
            title={user ? `Signed in as ${user.email}` : 'Sign In / Create Account'}
            className="p-1 text-[#E2E2E2] hover:text-white"
          >
            <Smile className="w-[19px] h-[19px]" />
          </button>
        </div>
      </header>

      {/* ================= MAIN WORKSPACE BODY ================= */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Left Cerulean Vertical Icon Rail */}
        <nav
          aria-label="Workspace Navigation"
          className="w-[52px] sm:w-[56px] shrink-0 bg-[#4E99C3] flex flex-col items-center select-none z-20"
        >
          {railItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => setActiveSection(item.id)}
                className={`w-full h-[52px] flex items-center justify-center transition-colors ${
                  active ? 'bg-[#38769B]' : 'hover:bg-[#4389B0]'
                }`}
              >
                <RailIcon type={item.id} />
              </button>
            );
          })}
        </nav>

        {/* Active Section Content */}
        {activeSection === 'experiments' ? (
          <div className="flex-1 flex min-w-0 relative overflow-hidden">
            {/* Collapsed Palette Re-open Pill-Free Tab */}
            {paletteCollapsed && (
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 1024) setMobileDrawer('palette');
                  else setPaletteCollapsed(false);
                }}
                title="Expand module palette"
                className="hidden lg:flex items-center justify-center w-6 bg-white border-r border-[#D9D9D9] text-[#444444] hover:text-[#0078D7] hover:bg-[#F5F8FA] shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Desktop Palette Sidebar */}
            <div className="hidden lg:flex h-full">
              <PaletteSidebar
                onAddModule={(id, lbl, params) => addModuleToCanvas(id, undefined, undefined, lbl, params)}
                userDatasets={userDatasets}
                collapsed={paletteCollapsed}
                onToggleCollapse={() => setPaletteCollapsed(true)}
              />
            </div>

            {/* Mobile/Tablet Slide-Over Palette Drawer */}
            {mobileDrawer === 'palette' && (
              <div className="lg:hidden absolute inset-y-0 left-0 z-30 shadow-xl flex">
                <PaletteSidebar
                  onAddModule={(id, lbl, params) => addModuleToCanvas(id, undefined, undefined, lbl, params)}
                  userDatasets={userDatasets}
                  collapsed={false}
                  onToggleCollapse={() => setMobileDrawer('none')}
                />
              </div>
            )}

            {/* Center Visual Node Canvas */}
            <PipelineCanvas
              graph={graph}
              title={title}
              statusText={statusText}
              savedAtText={savedAtText}
              isRunning={isRunning}
              nodeResults={nodeResults}
              onTitleChange={(t) => {
                setTitle(t);
                setStatusText('In draft');
              }}
              onSelectNode={handleSelectNode}
              onMoveNode={handleMoveNode}
              onDropNewModule={(id, x, y, lbl, params) => addModuleToCanvas(id, x, y, lbl, params)}
              onConnectPorts={handleConnectPorts}
              onDeleteEdge={handleDeleteEdge}
              onUpdateViewport={(vp) => setGraph((prev) => ({ ...prev, viewport: vp }))}
              onVisualizeNode={(nodeId) => {
                if (nodeResults[nodeId]) {
                  setVisualizeNodeId(nodeId);
                } else {
                  showToast('Click RUN at the bottom to compute TorchJS outputs for this module.');
                }
              }}
            />

            {/* Desktop Right Properties & Quick Help Inspector */}
            <div className="hidden lg:flex h-full">
              <InspectorPanel
                graph={graph}
                selectedNode={selectedNode}
                nodeResult={selectedNode ? nodeResults[selectedNode.id] || null : null}
                experimentTitle={title}
                experimentStatus={statusText}
                infraHealth={infraHealth}
                onUpdateParam={handleUpdateParam}
                onDeleteNode={handleDeleteNode}
                onOpenVisualize={(id) => setVisualizeNodeId(id)}
                onOpenHelp={(node) => setHelpNode(node)}
                collapsed={inspectorCollapsed}
                onToggleCollapse={() => setInspectorCollapsed(true)}
              />
            </div>

            {/* Mobile/Tablet Slide-Over Inspector Drawer */}
            {mobileDrawer === 'inspector' && (
              <div className="lg:hidden absolute inset-y-0 right-0 z-30 shadow-xl flex">
                <InspectorPanel
                  graph={graph}
                  selectedNode={selectedNode}
                  nodeResult={selectedNode ? nodeResults[selectedNode.id] || null : null}
                  experimentTitle={title}
                  experimentStatus={statusText}
                  infraHealth={infraHealth}
                  onUpdateParam={handleUpdateParam}
                  onDeleteNode={handleDeleteNode}
                  onOpenVisualize={(id) => setVisualizeNodeId(id)}
                  onOpenHelp={(node) => setHelpNode(node)}
                  collapsed={false}
                  onToggleCollapse={() => setMobileDrawer('none')}
                />
              </div>
            )}
          </div>
        ) : (
          <WorkspaceViews
            activeSection={activeSection}
            user={user}
            experiments={experiments}
            datasets={datasets}
            models={models}
            webServices={webServices}
            infraHealth={infraHealth}
            onOpenExperiment={handleOpenExperiment}
            onCreateExperiment={handleNewBlankExperiment}
            onOpenUploadDataset={() => setUploadModalOpen(true)}
            onOpenDeployService={() => setDeployModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
            onSignOut={() => {
              api.setToken(null);
              setUser(null);
              refreshWorkspaceData(null);
              showToast('Signed out of workspace.');
            }}
          />
        )}
      </div>

      {/* ================= BOTTOM DARK ACTION BAR ================= */}
      <footer className="h-[54px] shrink-0 bg-[#323232] text-white flex items-center justify-between px-3 sm:px-4 select-none z-30 relative">
        {/* Left: + NEW */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setNewMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#444444] transition-colors"
          >
            <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
            <span className="text-[12px] font-medium tracking-wide">NEW</span>
          </button>

          {newMenuOpen && (
            <div className="absolute bottom-[54px] left-0 bg-[#3A3A3A] border border-[#555555] shadow-lg w-[210px] py-1 z-40 text-[12.5px]">
              <button
                type="button"
                onClick={handleNewBlankExperiment}
                className="w-full px-3.5 py-2 text-left hover:bg-[#0078D7] text-white"
              >
                Blank Experiment
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewMenuOpen(false);
                  if (user) setUploadModalOpen(true);
                  else setAuthModalOpen(true);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-[#0078D7] text-white"
              >
                Upload Dataset (RustFS)
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewMenuOpen(false);
                  setGraph(JSON.parse(JSON.stringify(DEFAULT_GETTING_STARTED_GRAPH)));
                  setTitle('Getting Started with Dynamic ML Studio');
                  setActiveSection('experiments');
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-[#0078D7] text-white"
              >
                Load Getting Started Sample
              </button>
            </div>
          )}
        </div>

        {/* Center/Right Studio Toolbar Actions matching mockup */}
        <div className="flex items-center gap-1 sm:gap-3 md:gap-5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setRunHistoryOpen(true)}
            className="flex flex-col items-center justify-center px-2 py-1 text-[#E6E6E6] hover:text-white hover:bg-[#444444] transition-colors shrink-0"
          >
            <History className="w-[17px] h-[17px] mb-1" />
            <span className="text-[9px] tracking-[0.04em] uppercase whitespace-nowrap">RUN HISTORY</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="flex flex-col items-center justify-center px-2 py-1 text-[#E6E6E6] hover:text-white hover:bg-[#444444] transition-colors shrink-0"
          >
            <Save className="w-[17px] h-[17px] mb-1" />
            <span className="text-[9px] tracking-[0.04em] uppercase whitespace-nowrap">SAVE</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            className="flex flex-col items-center justify-center px-2 py-1 text-[#E6E6E6] hover:text-white hover:bg-[#444444] transition-colors shrink-0"
          >
            <CopyPlus className="w-[17px] h-[17px] mb-1" />
            <span className="text-[9px] tracking-[0.04em] uppercase whitespace-nowrap">SAVE AS</span>
          </button>

          <button
            type="button"
            onClick={handleDiscardChanges}
            className="flex flex-col items-center justify-center px-2 py-1 text-[#E6E6E6] hover:text-white hover:bg-[#444444] transition-colors shrink-0"
          >
            <Trash2 className="w-[17px] h-[17px] mb-1" />
            <span className="text-[9px] tracking-[0.04em] uppercase whitespace-nowrap">DISCARD CHANGES</span>
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunPipeline}
            className="flex flex-col items-center justify-center px-2.5 py-1 text-white hover:bg-[#0078D7] disabled:opacity-60 transition-colors shrink-0"
          >
            <Play className="w-[17px] h-[17px] mb-1 fill-white" />
            <span className="text-[9px] tracking-[0.04em] uppercase font-medium whitespace-nowrap">
              {isRunning ? 'RUNNING' : 'RUN'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!user) {
                setAuthModalOpen(true);
                showToast('Sign in to deploy a trained model as a Web Service.');
              } else {
                setDeployModalOpen(true);
              }
            }}
            className="flex flex-col items-center justify-center px-2 py-1 text-[#B8B8B8] hover:text-white hover:bg-[#444444] transition-colors shrink-0"
          >
            <Wrench className="w-[17px] h-[17px] mb-1" />
            <span className="text-[9px] tracking-[0.03em] uppercase whitespace-nowrap leading-[1.05] text-center">
              SET UP WEB
              <br />
              SERVICE
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="hidden sm:flex flex-col items-center justify-center px-2 py-1 text-[#E6E6E6] hover:text-white hover:bg-[#444444] transition-colors shrink-0"
          >
            <FlaskConical className="w-[17px] h-[17px] mb-1" />
            <span className="text-[9px] tracking-[0.03em] uppercase whitespace-nowrap leading-[1.05] text-center">
              PUBLISH TO
              <br />
              GALLERY
            </span>
          </button>
        </div>

        {/* Right spacer to balance + NEW on desktop */}
        <div className="hidden lg:block w-[72px] shrink-0" />
      </footer>

      {/* ================= TOAST FEEDBACK ================= */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-16 right-5 z-50 px-4 py-2.5 shadow-lg border text-[12.5px] max-w-[380px] ${
            toast.type === 'error'
              ? 'bg-[#FDECEC] border-[#D9534F] text-[#9E2A2B]'
              : 'bg-[#333333] border-[#555555] text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ================= MODALS ================= */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(signedInUser) => {
          setUser(signedInUser);
          refreshWorkspaceData(signedInUser);
          showToast(`Signed in as ${signedInUser.displayName}`);
        }}
      />

      <DatasetUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={(ds) => {
          setDatasets((prev) => [ds, ...prev]);
          showToast(`Uploaded "${ds.name}" (${ds.rowCount} rows) to RustFS.`);
        }}
      />

      <VisualizeResultsModal
        node={visualizeNode}
        result={visualizeNodeId ? nodeResults[visualizeNodeId] || null : null}
        onClose={() => setVisualizeNodeId(null)}
      />

      <RunHistoryModal
        open={runHistoryOpen}
        runs={runs}
        latestLogs={latestLogs}
        onClose={() => setRunHistoryOpen(false)}
      />

      <DeployWebServiceModal
        open={deployModalOpen}
        models={models}
        onClose={() => setDeployModalOpen(false)}
        onDeployed={(svc) => {
          setWebServices((prev) => [svc, ...prev]);
          setActiveSection('webservices');
          showToast(`Deployed live endpoint /api/predict/${svc.endpointSlug}`);
        }}
      />

      <ModuleHelpModal node={helpNode} onClose={() => setHelpNode(null)} />
    </div>
  );
}

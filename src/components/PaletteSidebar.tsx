import React, { useMemo, useState } from 'react';
import { ChevronLeft, Search, X } from 'lucide-react';
import { MODULE_CATALOG } from '../shared/catalog';
import { DatasetRecord, ModuleDefinition } from '../shared/types';
import { ModuleIcon } from './StudioIcons';

interface PaletteSidebarProps {
  onAddModule: (typeId: string, customLabel?: string, customParams?: Record<string, any>) => void;
  userDatasets: DatasetRecord[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface TreeGroup {
  name: string;
  iconType: ModuleDefinition['iconType'];
  items: ModuleDefinition[];
  children: TreeGroup[];
}

function buildTree(modules: ModuleDefinition[]): TreeGroup[] {
  const roots = new Map<string, TreeGroup>();

  for (const mod of modules) {
    const [top, sub1, sub2] = mod.categoryPath;
    if (!roots.has(top)) {
      roots.set(top, {
        name: top,
        iconType: mod.iconType,
        items: [],
        children: [],
      });
    }
    const root = roots.get(top)!;
    if (!sub1) {
      root.items.push(mod);
      continue;
    }
    let child1 = root.children.find((c) => c.name === sub1);
    if (!child1) {
      child1 = { name: sub1, iconType: mod.iconType, items: [], children: [] };
      root.children.push(child1);
    }
    if (!sub2) {
      child1.items.push(mod);
      continue;
    }
    let child2 = child1.children.find((c) => c.name === sub2);
    if (!child2) {
      child2 = { name: sub2, iconType: mod.iconType, items: [], children: [] };
      child1.children.push(child2);
    }
    child2.items.push(mod);
  }

  // Order top-level categories to match Azure/Dynamic ML Studio hierarchy
  const preferredOrder = [
    'Saved Datasets',
    'Data Format Conversions',
    'Data Input and Output',
    'Data Transformation',
    'Feature Selection',
    'Machine Learning',
    'Python Language Modules',
    'R Language Modules',
    'Statistical Functions',
    'Text Analytics',
    'Web Service',
  ];
  return Array.from(roots.values()).sort((a, b) => {
    const ia = preferredOrder.indexOf(a.name);
    const ib = preferredOrder.indexOf(b.name);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export const PaletteSidebar: React.FC<PaletteSidebarProps> = ({
  onAddModule,
  userDatasets,
  collapsed,
  onToggleCollapse,
}) => {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'Saved Datasets': true,
    'Saved Datasets/My Datasets': true,
    'Data Transformation': true,
    'Data Transformation/Manipulation': true,
    'Data Transformation/Sample and Split': true,
    'Feature Selection': true,
    'Machine Learning': true,
    'Machine Learning/Initialize Model': true,
    'Machine Learning/Initialize Model/Classification': true,
    'Machine Learning/Train': true,
    'Machine Learning/Score': true,
    'Machine Learning/Evaluate': true,
    'Text Analytics': true,
  });

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MODULE_CATALOG;
    return MODULE_CATALOG.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.categoryPath.some((p) => p.toLowerCase().includes(q))
    );
  }, [search]);

  const tree = useMemo(() => buildTree(filteredModules), [filteredModules]);

  const togglePath = (pathKey: string) => {
    setExpanded((prev) => ({ ...prev, [pathKey]: !prev[pathKey] }));
  };

  if (collapsed) {
    return null;
  }

  const renderLeafItem = (
    name: string,
    typeId: string,
    customLabel?: string,
    customParams?: Record<string, any>
  ) => (
    <div
      key={`${typeId}-${customLabel || name}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'application/dynamic-ml-node',
          JSON.stringify({ typeId, customLabel, customParams })
        );
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onAddModule(typeId, customLabel, customParams)}
      title={`Drag onto canvas or click to add "${customLabel || name}"`}
      className="group flex items-center justify-between h-[28px] bg-[#EAEAEA] hover:bg-[#DFDFDF] border border-[#DCDCDC] px-2.5 mb-[3px] cursor-grab active:cursor-grabbing select-none transition-colors"
    >
      <span className="text-[12px] text-[#333333] truncate pr-2">{customLabel || name}</span>
      <span
        aria-hidden="true"
        className="flex items-center gap-[1.5px] opacity-40 group-hover:opacity-75 shrink-0"
      >
        <span className="w-[1.5px] h-[11px] bg-[#666666]" />
        <span className="w-[1.5px] h-[11px] bg-[#666666]" />
        <span className="w-[1.5px] h-[11px] bg-[#666666]" />
      </span>
    </div>
  );

  const renderGroup = (group: TreeGroup, parentKey = '', depth = 0) => {
    const pathKey = parentKey ? `${parentKey}/${group.name}` : group.name;
    const isSearching = search.trim().length > 0;
    const isOpen = isSearching || !!expanded[pathKey];

    return (
      <div key={pathKey} className="select-none">
        <button
          type="button"
          onClick={() => togglePath(pathKey)}
          className="w-full flex items-center gap-1.5 py-1 text-left hover:bg-[#F5F8FA] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0078D7]"
          style={{ paddingLeft: `${depth * 14 + 4}px` }}
        >
          <span className="w-3 text-[9px] text-[#2B7AB8] flex items-center justify-center shrink-0">
            {isOpen ? '▼' : '▶'}
          </span>
          {depth === 0 && <ModuleIcon iconType={group.iconType} className="w-[18px] h-[18px] shrink-0" />}
          <span
            className={`truncate ${
              depth === 0
                ? 'text-[12.5px] font-medium text-[#22649B]'
                : 'text-[12px] font-normal text-[#333333]'
            }`}
          >
            {group.name}
          </span>
        </button>

        {isOpen && (
          <div className="mt-0.5">
            {/* Inject My RustFS Datasets under Saved Datasets */}
            {pathKey === 'Saved Datasets' && userDatasets.length > 0 && (
              <div className="mb-1">
                <button
                  type="button"
                  onClick={() => togglePath('Saved Datasets/My Datasets')}
                  className="w-full flex items-center gap-1.5 py-1 text-left hover:bg-[#F5F8FA]"
                  style={{ paddingLeft: '18px' }}
                >
                  <span className="w-3 text-[9px] text-[#2B7AB8] flex items-center justify-center shrink-0">
                    {isSearching || expanded['Saved Datasets/My Datasets'] ? '▼' : '▶'}
                  </span>
                  <span className="text-[12px] text-[#333333] truncate">My Datasets (RustFS)</span>
                </button>
                {(isSearching || expanded['Saved Datasets/My Datasets']) && (
                  <div className="pl-[32px] pr-2">
                    {userDatasets
                      .filter((d) => !search.trim() || d.name.toLowerCase().includes(search.toLowerCase()))
                      .map((ds) =>
                        renderLeafItem(ds.name, 'import-data', ds.name, {
                          sourceType: 'rustfs',
                          datasetId: ds.id,
                        })
                      )}
                  </div>
                )}
              </div>
            )}

            {group.children.map((child) => renderGroup(child, pathKey, depth + 1))}

            {group.items.length > 0 && (
              <div style={{ paddingLeft: `${(depth + 1) * 14 + 14}px` }} className="pr-2 pt-0.5 pb-1">
                {group.items.map((mod) => renderLeafItem(mod.name, mod.typeId))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      aria-label="ML Module Palette"
      className="w-[248px] shrink-0 h-full bg-white border-r border-[#D9D9D9] flex flex-col select-none"
    >
      {/* Top Collapse Chevron */}
      <div className="h-[26px] flex items-center justify-end px-2 pt-1">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Collapse module palette"
          className="p-1 text-[#444444] hover:text-[#0078D7] hover:bg-[#F2F2F2] rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search Box */}
      <div className="px-3 pb-2.5">
        <div className="relative flex items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search experiment items"
            aria-label="Search experiment items"
            className="w-full h-[28px] pl-2 pr-7 text-[12px] text-[#333333] placeholder-[#8C8C8C] bg-white border border-[#C8C8C8] focus:border-[#0078D7] focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 text-[#777777] hover:text-[#333333]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-4 h-4 text-[#8A8A8A] absolute right-2 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Tree Hierarchy */}
      <div className="flex-1 overflow-y-auto studio-scroll px-1 pb-4">
        {tree.length === 0 ? (
          <div className="px-4 py-6 text-[12px] text-[#777777] text-center">
            No modules match "{search}".
          </div>
        ) : (
          tree.map((grp) => renderGroup(grp))
        )}
      </div>
    </aside>
  );
};

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Entry, Relationship, StoryLink } from '../types';
import { relationshipType } from '../relationshipTypes';
import { storyLinkType } from '../storyLinkTypes';
import { findCharacter } from '../nameMatch';
import { categoryColor } from '../theme';

// ── Layout constants ───────────────────────────────────────────────────
// Column-based layout: each category is a vertical column, scrollable.
const NODE_R = 14;
const PICKER_KEY = 'hmw-web-hidden-categories';

// Column layout
const COL_PAD_LEFT = 20;
const COL_WIDTH = 140;       // width per category column
const NODE_ROW_H = 46;       // vertical space per node
const COL_HEADER_H = 30;
const COL_PAD_Y = 8;
const COL_GAP = 16;          // gap between columns
const EDGE_CURVE = 0.25;     // edge curvature strength

// Category ordering
const CATEGORY_ORDER = [
  'Realms', 'Locations', 'Characters', 'Plot',
  'Angels', 'Demons', 'Humans', 'Classes',
  'Magic Systems', 'Rules & Notes', 'Items', 'Artifacts',
  'Artifact Skills', 'Angel Skills', 'Demon Skills', 'Character Forms',
  'Monsters', 'Beings', 'Hidden Realm', 'Organizations',
  'Economy', 'Military', 'Calendar', 'Laws & Justice',
  'Medical', 'Travel', 'Architecture', 'Combat Mechanics',
  'Combat Training', 'Culture', 'Daily Life', 'Equipment',
  'Intelligence', 'Lore & Myths', 'Nature', 'Politics',
  'Resources', 'Skill Mechanics', 'Social Classes', 'Academy',
  'Clan', 'Other',
];

interface Pos { x: number; y: number }
type Positions = Record<string, Pos>;

interface WebEdge {
  id: string; kind: 'story' | 'relationship';
  source: string; target: string; type: string;
  label: string; description: string; color: string; dashed: boolean;
}

interface Geom {
  ax: number; ay: number; bx: number; by: number;
  mx: number; my: number; curvedPath: string;
}

interface ColInfo {
  category: string; x: number; y: number;
  width: number; height: number; color: string; nodeCount: number;
}

interface StoryWebProps {
  entries: Entry[]; relationships: Relationship[]; storyLinks: StoryLink[];
  onNodeClick: (entry: Entry) => void; onAdd: () => void;
  onEditStory: (link: StoryLink) => void; onDeleteStory: (link: StoryLink) => void;
  onEditRel: (rel: Relationship) => void; onDeleteRel: (rel: Relationship) => void;
}

// ── Column-based layout ────────────────────────────────────────────────
// Each category = one vertical column. Columns flow left-to-right.
// Nodes stack vertically within each column. Wide = scrollable.
function columnLayout(
  displayNodes: { name: string; category: string }[],
): { positions: Positions; size: { width: number; height: number }; columns: ColInfo[] } {
  const groups = new Map<string, { name: string; category: string }[]>();
  for (const n of displayNodes) {
    const list = groups.get(n.category) ?? [];
    list.push(n);
    groups.set(n.category, list);
  }

  const known = CATEGORY_ORDER.filter((c) => groups.has(c));
  const extra = [...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
  const catOrder = [...known, ...extra];

  const positions: Positions = {};
  const columns: ColInfo[] = [];
  let curX = COL_PAD_LEFT;
  let maxHeight = 0;

  for (const cat of catOrder) {
    const nodes = groups.get(cat) ?? [];
    if (nodes.length === 0) continue;

    const rows = nodes.length;
    const colH = COL_HEADER_H + COL_PAD_Y * 2 + rows * NODE_ROW_H;

    columns.push({
      category: cat, x: curX, y: 0,
      width: COL_WIDTH, height: colH,
      color: categoryColor(cat), nodeCount: nodes.length,
    });

    // Place nodes vertically in column
    const startY = COL_HEADER_H + COL_PAD_Y;
    for (let i = 0; i < nodes.length; i++) {
      positions[nodes[i].name] = {
        x: curX + COL_WIDTH / 2,
        y: startY + i * NODE_ROW_H + NODE_R + 2,
      };
    }

    maxHeight = Math.max(maxHeight, colH);
    curX += COL_WIDTH + COL_GAP;
  }

  const totalWidth = curX + COL_PAD_LEFT;
  const totalHeight = maxHeight + 60; // bottom padding

  return { positions, size: { width: totalWidth, height: totalHeight }, columns };
}

function truncate(name: string, max = 18): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function edgeLabelText(e: WebEdge): string {
  return e.label || (e.kind === 'story' ? storyLinkType(e.type).label : relationshipType(e.type).label);
}

function loadHiddenFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(PICKER_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr);
  } catch { /* ignore */ }
  return new Set();
}

// ── Memoized SVG node ─────────────────────────────────────────────────
interface WebNodeProps {
  name: string; category: string; x: number; y: number;
  opacity: number; active: boolean; focused: boolean; hovered: boolean;
  focusMode: boolean; hasEntry: boolean; showLabel: boolean;
  onPointerEnter: (name: string) => void; onPointerLeave: () => void;
  onPointerDown: (e: React.PointerEvent, name: string) => void;
  onClick: (e: React.MouseEvent, name: string) => void;
  onLabelClick: (e: React.MouseEvent, name: string) => void;
}

const WebNode = memo(function WebNode({
  name, category, x, y, opacity, active, focused, hovered, focusMode,
  hasEntry, showLabel, onPointerEnter, onPointerLeave, onPointerDown, onClick, onLabelClick,
}: WebNodeProps) {
  const isChar = category === 'Characters';
  const isOther = category === 'Other';
  const stroke = isOther ? '#7f8fa3' : categoryColor(category);
  const fill = isOther ? '#101420' : `${stroke}2b`;

  return (
    <g
      className={`map-node${active ? ' active' : ''}`}
      opacity={opacity}
      style={{ cursor: focusMode ? 'pointer' : hasEntry ? 'pointer' : 'default' }}
      onPointerEnter={() => onPointerEnter(name)}
      onPointerLeave={onPointerLeave}
      onPointerDown={(e) => onPointerDown(e, name)}
      onClick={(e) => onClick(e, name)}
    >
      {hovered && !focused && (
        <circle cx={x} cy={y} r={NODE_R + 5} fill="transparent" stroke={stroke} strokeWidth="1.5" strokeDasharray="3 3" />
      )}
      {focused && (
        <circle cx={x} cy={y} r={NODE_R + 8} fill="transparent" stroke={stroke} strokeWidth="2" opacity="0.9" />
      )}
      <circle
        cx={x} cy={y} r={NODE_R} fill={fill} stroke={stroke}
        strokeWidth={focused ? 2.5 : isChar ? 2 : isOther ? 1 : 1.5}
        strokeDasharray={isOther ? '3 3' : undefined}
        style={{ filter: active ? `drop-shadow(0 0 6px ${stroke}88)` : undefined }}
      />
      <text x={x} y={y + 4.5} textAnchor="middle" className="map-node-initial" fill={isOther ? '#7f8fa3' : stroke} style={{ fontSize: 11 }}>
        {name.charAt(0).toUpperCase()}
      </text>
      {showLabel && (
        <text
          x={x} y={y + NODE_R + 14} textAnchor="middle" className="map-node-label"
          style={{ fontSize: 10, cursor: name.length > 18 ? 'help' : 'default' }}
          onPointerDown={(e) => { e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); onLabelClick(e, name); }}
        >
          {truncate(name)}
        </text>
      )}
    </g>
  );
});

// ── Memoized SVG edge (curved bezier) ─────────────────────────────────
interface WebEdgeProps {
  id: string; active: boolean;
  path: string;
  color: string; dashed: boolean; strokeWidth: number; opacity: number;
  showLabel: boolean; labelX: number; labelY: number; labelText: string; labelWidth: number;
  onPointerEnter: (id: string) => void; onPointerLeave: () => void; onClick: (id: string) => void;
}

const WebEdge = memo(function WebEdge({
  id, active, path, color, dashed, strokeWidth, opacity,
  showLabel, labelX, labelY, labelText, labelWidth,
  onPointerEnter, onPointerLeave, onClick,
}: WebEdgeProps) {
  return (
    <g
      className={`map-edge${active ? ' active' : ''}`}
      opacity={opacity}
      onPointerEnter={() => onPointerEnter(id)}
      onPointerLeave={onPointerLeave}
      onClick={(ev) => { ev.stopPropagation(); onClick(id); }}
    >
      <path
        d={path}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={dashed ? '6 5' : undefined}
        markerEnd={`url(#warrow-${color.replace('#', '')})`}
      />
      <path d={path} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: 'pointer' }} />
      {showLabel && (
        <g pointerEvents="none">
          <rect x={labelX - labelWidth / 2} y={labelY - 24} width={labelWidth} height={18} rx={9}
            fill="rgba(7, 11, 22, 0.93)" stroke={color} strokeOpacity={0.6} />
          <text x={labelX} y={labelY - 11} textAnchor="middle" className="map-edge-label" fill={color} style={{ fontSize: 10 }}>
            {labelText}
          </text>
        </g>
      )}
    </g>
  );
});

// ── Column header ──────────────────────────────────────────────────────
const ColHeader = memo(function ColHeader({ col }: { col: ColInfo }) {
  return (
    <g>
      <rect
        x={col.x + 2} y={0} width={col.width - 4} height={col.height}
        rx={6} fill={`${col.color}08`} stroke={`${col.color}20`} strokeWidth={1}
      />
      <rect
        x={col.x + 2} y={0} width={col.width - 4} height={COL_HEADER_H}
        rx={6} fill={`${col.color}18`} stroke={`${col.color}30`} strokeWidth={1}
      />
      <text
        x={col.x + col.width / 2} y={COL_HEADER_H - 9}
        textAnchor="middle" fill={col.color}
        style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}
      >
        {col.category}
      </text>
      <text
        x={col.x + col.width / 2} y={COL_HEADER_H - 1}
        textAnchor="middle" fill={`${col.color}88`}
        style={{ fontSize: 8, fontWeight: 400 }}
      >
        {col.nodeCount} nodes
      </text>
    </g>
  );
});

// ── Name popup (positioned absolutely over the SVG) ────────────────────
function NamePopup({ name, x, y, onClose }: { name: string; x: number; y: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: x, top: y - 36,
        background: 'rgba(10, 16, 32, 0.96)',
        border: '1px solid rgba(200, 168, 118, 0.3)',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: '#e8f1ff',
        whiteSpace: 'nowrap',
        pointerEvents: 'auto',
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        fontFamily: 'var(--font-head)',
        letterSpacing: '0.3px',
      }}
    >
      {name}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export function StoryWeb({
  entries, relationships, storyLinks, onNodeClick, onAdd,
  onEditStory, onDeleteStory, onEditRel, onDeleteRel,
}: StoryWebProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean; startX: number; startY: number } | null>(null);
  const positionsRef = useRef<Positions>({});

  const [positions, setPositions] = useState<Positions>({});
  const [mapSize, setMapSize] = useState({ width: 3200, height: 1200 });
  const [columns, setColumns] = useState<ColInfo[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<WebEdge | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(loadHiddenFromStorage);
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
  const [initDone, setInitDone] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusNode, setFocusNode] = useState<string | null>(null);
  const [focusDepth, setFocusDepth] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ name: string; x: number; y: number } | null>(null);

  // Keyboard: Esc exits focus or popup
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (popup) { setPopup(null); return; }
        if (focusMode) { setFocusNode(null); setFocusMode(false); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, popup]);

  // Convert client coords to SVG coords
  const toSvg = useCallback((clientX: number, clientY: number): Pos => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const entryByName = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const e of entries) map.set(e.name.toLowerCase(), e);
    return map;
  }, [entries]);

  const resolve = (name: string): string => {
    const exact = entryByName.get(name.toLowerCase());
    if (exact) return exact.name;
    const ch = findCharacter(entries, name);
    if (ch) return ch.name;
    return name;
  };

  // ---- build normalized nodes + edges ----
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, string>();
    for (const e of entries) nodeMap.set(e.name, e.category === 'Characters' ? 'Characters' : e.category);

    const rawEdges: WebEdge[] = [];
    for (const s of storyLinks) {
      const type = storyLinkType(s.type);
      rawEdges.push({
        id: s.id, kind: 'story', source: resolve(s.source), target: resolve(s.target),
        type: s.type, label: s.label, description: s.description,
        color: s.color || type.color, dashed: !!type.dashed,
      });
    }
    for (const r of relationships) {
      const type = relationshipType(r.type);
      rawEdges.push({
        id: r.id, kind: 'relationship', source: resolve(r.source), target: resolve(r.target),
        type: r.type, label: r.label, description: r.description,
        color: r.color || type.color, dashed: !!type.dashed,
      });
    }

    for (const edge of rawEdges) {
      if (!nodeMap.has(edge.source)) nodeMap.set(edge.source, 'Other');
      if (!nodeMap.has(edge.target)) nodeMap.set(edge.target, 'Other');
    }

    return {
      nodes: [...nodeMap.entries()].map(([name, category]) => ({ name, category })),
      edges: rawEdges,
    };
  }, [entries, relationships, storyLinks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- filtering ----
  const visibleNodes = useMemo(() =>
    nodes.filter((n) => !hiddenCategories.has(n.category) && !hiddenNodes.has(n.name)),
    [nodes, hiddenCategories, hiddenNodes]);

  const visibleNames = useMemo(() => new Set(visibleNodes.map((n) => n.name)), [visibleNodes]);

  const visibleEdges = useMemo(
    () => edges.filter((e) => visibleNames.has(e.source) && visibleNames.has(e.target)),
    [edges, visibleNames]);

  // ---- focus mode ----
  const focusSet = useMemo(() => {
    const set = new Set<string>();
    if (!focusNode) return set;
    set.add(focusNode);
    let frontier = [focusNode];
    for (let hop = 0; hop < focusDepth; hop += 1) {
      const next: string[] = [];
      for (const name of frontier) {
        for (const e of edges) {
          const other = e.source === name ? e.target : e.target === name ? e.source : null;
          if (other && !set.has(other)) { set.add(other); next.push(other); }
        }
      }
      frontier = next;
      if (!frontier.length) break;
    }
    return set;
  }, [focusNode, focusDepth, edges]);

  const displayNodes = useMemo(() => {
    if (focusMode && focusNode) return nodes.filter((n) => focusSet.has(n.name));
    return visibleNodes;
  }, [focusMode, focusNode, focusSet, nodes, visibleNodes]);

  const displayNames = useMemo(() => new Set(displayNodes.map((n) => n.name)), [displayNodes]);

  const displayEdges = useMemo(
    () => edges.filter((e) => displayNames.has(e.source) && displayNames.has(e.target)),
    [edges, displayNames]);

  // ---- node degree: how many edges each node has (for edge filtering) ----
  const nodeDegree = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of displayEdges) {
      map.set(e.source, (map.get(e.source) ?? 0) + 1);
      map.set(e.target, (map.get(e.target) ?? 0) + 1);
    }
    return map;
  }, [displayEdges]);

  // ---- column layout ----
  useEffect(() => {
    const { positions: newPos, size, columns: newCols } = columnLayout(displayNodes);
    setPositions(newPos);
    setMapSize(size);
    setColumns(newCols);
  }, [displayNodes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setSelectedEdge(null); }, [relationships, storyLinks]);

  useEffect(() => {
    try { localStorage.setItem(PICKER_KEY, JSON.stringify([...hiddenCategories])); } catch { /* */ }
  }, [hiddenCategories]);

  useEffect(() => {
    if (initDone) return;
    setInitDone(true);
    const linked = new Set<string>();
    for (const e of edges) { linked.add(e.source); linked.add(e.target); }
    const isolated = nodes.filter((n) => !linked.has(n.name)).map((n) => n.name);
    if (isolated.length) setHiddenNodes(new Set(isolated));
  }, [edges, nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focusNode && !nodes.some((n) => n.name === focusNode)) setFocusNode(null);
  }, [nodes, focusNode]);

  // ---- node dragging ----
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = toSvg(e.clientX, e.clientY);
      if (!drag.moved && Math.hypot(p.x - drag.startX, p.y - drag.startY) > 4) {
        drag.moved = true;
      }
      setPositions((prev) => ({
        ...prev,
        [drag.id]: { x: p.x - drag.dx, y: p.y - drag.dy },
      }));
    };
    const onUp = () => setDragging(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [dragging, toSvg]);

  const startDrag = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      const p = toSvg(e.clientX, e.clientY);
      const cur = positionsRef.current[id] ?? { x: mapSize.width / 2, y: mapSize.height / 2 };
      dragRef.current = { id, dx: p.x - cur.x, dy: p.y - cur.y, moved: false, startX: p.x, startY: p.y };
      setSelectedEdge(null);
      setDragging(id);
    },
    [toSvg, mapSize],
  );

  useEffect(() => { positionsRef.current = positions; }, [positions]);

  // ---- handlers ----
  const handleEdgePointerEnter = useCallback((id: string) => setHoverEdge(id), []);
  const handleEdgePointerLeave = useCallback(() => setHoverEdge(null), []);
  const handleEdgeClick = useCallback((id: string) => {
    setSelectedEdge((cur) => {
      if (cur?.id === id) return null;
      return displayEdges.find((e) => e.id === id) ?? cur;
    });
  }, [displayEdges]);

  const handleNodePointerEnter = useCallback((name: string) => setHoverId(name), []);
  const handleNodePointerLeave = useCallback(() => setHoverId(null), []);

  const handleNodeClick = useCallback((e: React.MouseEvent, name: string) => {
    if (dragRef.current?.moved) { dragRef.current = null; return; }
    dragRef.current = null;
    e.stopPropagation();
    if (focusMode) { setFocusNode(name); setSelectedEdge(null); return; }
    const entry = entryByName.get(name.toLowerCase());
    if (entry) onNodeClick(entry);
  }, [focusMode, entryByName, onNodeClick]);

  const handleLabelClick = useCallback((e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    // Convert SVG position to screen position
    const pos = positions[name];
    if (!pos) return;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return;
    const screenX = pos.x * ctm.a + ctm.e - rect.left;
    const screenY = pos.y * ctm.d + ctm.f - rect.top;
    setPopup({ name, x: Math.min(screenX, rect.width - 200), y: screenY });
  }, [positions]);

  // ---- edge geometry (curved bezier between columns) ----
  const edgeGeom = useMemo(() => {
    const groups = new Map<string, { a: string; b: string; ids: string[] }>();
    for (const e of displayEdges) {
      const key = [e.source, e.target].sort().join('\u0000');
      const g = groups.get(key) ?? {
        a: e.source < e.target ? e.source : e.target,
        b: e.source < e.target ? e.target : e.source,
        ids: [],
      };
      g.ids.push(e.id);
      groups.set(key, g);
    }
    const map = new Map<string, Geom>();
    for (const e of displayEdges) {
      const key = [e.source, e.target].sort().join('\u0000');
      const g = groups.get(key);
      const ids = g?.ids ?? [e.id];
      const index = ids.indexOf(e.id);
      const spread = (index - (ids.length - 1) / 2) * 18;

      const a = positions[e.source] ?? { x: mapSize.width / 2, y: mapSize.height / 2 };
      const b = positions[e.target] ?? { x: mapSize.width / 2, y: mapSize.height / 2 };

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Offset perpendicular for multi-edge parallelism
      const nx = (-dy / dist) * spread;
      const ny = (dx / dist) * spread;

      const ax = a.x + nx;
      const ay = a.y + ny;
      const bx = b.x + nx;
      const by = b.y + ny;

      // Shorten to avoid overlap with node circles
      const ux = (bx - ax) / dist;
      const uy = (by - ay) / dist;
      const sx = ax + ux * (NODE_R + 4);
      const sy = ay + uy * (NODE_R + 4);
      const ex = bx - ux * (NODE_R + 8);
      const ey = by - uy * (NODE_R + 8);

      // Bezier curve: control point perpendicular to midpoint
      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2;
      const perpX = -uy * dist * EDGE_CURVE;
      const perpY = ux * dist * EDGE_CURVE;
      const cx = mx + perpX;
      const cy = my + perpY;

      const path = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;

      map.set(e.id, {
        ax: sx, ay: sy, bx: ex, by: ey,
        mx: cx, my: cy, curvedPath: path,
      });
    }
    return map;
  }, [displayEdges, positions, mapSize]);

  const activeEdgeIds = useMemo(() => {
    if (selectedEdge) return new Set([selectedEdge.id]);
    const set = new Set<string>();
    if (hoverEdge) set.add(hoverEdge);
    else if (hoverId) {
      for (const e of displayEdges) {
        if (e.source === hoverId || e.target === hoverId) set.add(e.id);
      }
    }
    return set;
  }, [selectedEdge, hoverEdge, hoverId, displayEdges]);

  // Edge labels (collision-resolved)
  const edgeLabels = useMemo(() => {
    const out = new Map<string, { x: number; y: number }>();
    const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const e of displayEdges) {
      if (!activeEdgeIds.has(e.id)) continue;
      if (typeFilter && edgeLabelText(e) !== typeFilter) continue;
      const g = edgeGeom.get(e.id);
      if (!g) continue;
      const text = edgeLabelText(e);
      const w = text.length * 5.5 + 14;
      // Place at midpoint of curve
      const spots = [
        { x: g.mx, y: g.my - 16 },
        { x: g.mx, y: g.my + 10 },
        { x: (g.ax + g.mx) / 2, y: (g.ay + g.my) / 2 - 12 },
      ];
      const pill = (x: number, y: number) => ({ x1: x - w / 2, y1: y - 14, x2: x + w / 2, y2: y + 4 });
      const chosen = spots.find((s) => !placed.some((p) => boxesIntersect(pill(s.x, s.y), p))) ?? spots[0];
      out.set(e.id, chosen);
      placed.push(pill(chosen.x, chosen.y));
    }
    return out;
  }, [displayEdges, activeEdgeIds, edgeGeom, typeFilter]);

  // Node labels
  const degree = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of edges) {
      map.set(e.source, (map.get(e.source) ?? 0) + 1);
      map.set(e.target, (map.get(e.target) ?? 0) + 1);
    }
    return map;
  }, [edges]);

  const nodeLabels = useMemo(() => {
    const shown = new Set<string>();
    const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const order = [...displayNodes].sort((a, b) => {
      const pa = a.category === 'Characters' ? 1 : 0;
      const pb = b.category === 'Characters' ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return (degree.get(b.name) ?? 0) - (degree.get(a.name) ?? 0);
    });
    for (const n of order) {
      const pos = positions[n.name];
      if (!pos) continue;
      const label = truncate(n.name);
      const w = label.length * 5.5 + 4;
      const box = { x1: pos.x - w / 2, y1: pos.y + NODE_R + 3, x2: pos.x + w / 2, y2: pos.y + NODE_R + 18 };
      if (!placed.some((p) => boxesIntersect(box, p))) {
        shown.add(n.name);
        placed.push(box);
      }
    }
    if (hoverId) shown.add(hoverId);
    if (focusMode && focusNode) shown.add(focusNode);
    return shown;
  }, [displayNodes, positions, degree, hoverId, focusMode, focusNode]);

  function boxesIntersect(a: { x1: number; y1: number; x2: number; y2: number }, b: { x1: number; y1: number; x2: number; y2: number }): boolean {
    return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
  }

  const markerColors = useMemo(() => {
    const set = new Set<string>();
    for (const e of displayEdges) set.add(e.color);
    return [...set];
  }, [displayEdges]);

  const filteredNodeSet = useMemo(() => {
    if (!typeFilter) return null;
    const set = new Set<string>();
    for (const e of displayEdges) {
      if (edgeLabelText(e) === typeFilter) { set.add(e.source); set.add(e.target); }
    }
    return set;
  }, [typeFilter, displayEdges]);

  const filteredEdgesCount = useMemo(() => {
    if (!typeFilter) return 0;
    let n = 0;
    for (const e of displayEdges) if (edgeLabelText(e) === typeFilter) n += 1;
    return n;
  }, [typeFilter, displayEdges]);

  const usedTypes = useMemo(() => {
    const seen = new Map<string, { count: number; color: string }>();
    for (const e of displayEdges) {
      const label = edgeLabelText(e);
      const cur = seen.get(label) ?? { count: 0, color: e.color };
      cur.count += 1;
      seen.set(label, cur);
    }
    return [...seen.entries()];
  }, [displayEdges]);

  const presentCategories = useMemo(() => {
    const set = new Set(nodes.map((n) => n.category));
    const known = CATEGORY_ORDER.filter((c) => set.has(c));
    const extra = [...set].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return [...known, ...extra];
  }, [nodes]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of nodes) map.set(n.category, (map.get(n.category) ?? 0) + 1);
    return map;
  }, [nodes]);

  useEffect(() => {
    if (presentCategories.length === 0) return;
    setHiddenCategories((prev) => {
      const stale = [...prev].filter((c) => !presentCategories.includes(c));
      if (stale.length === 0) return prev;
      const next = new Set(prev);
      for (const c of stale) next.delete(c);
      return next;
    });
  }, [presentCategories]);

  const toggleCategory = (cat: string) => {
    if (hiddenCategories.has(cat)) setHiddenNodes(new Set());
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
    setSelectedEdge(null);
  };

  const showOnly = (cat: string) => {
    setHiddenCategories(new Set(presentCategories.filter((c) => c !== cat)));
    setHiddenNodes(new Set());
    setSelectedEdge(null);
  };

  const showAll = () => { setHiddenCategories(new Set()); setHiddenNodes(new Set()); setSelectedEdge(null); };
  const hideAll = () => { setHiddenCategories(new Set(presentCategories)); setHiddenNodes(new Set()); setSelectedEdge(null); };

  const toggleFocusMode = () => {
    setFocusMode((m) => !m);
    setFocusNode(null);
    setSelectedEdge(null);
  };

  // Dim everything when hovering/selecting — only connected nodes stay bright
  const hoveredNeighborNames = useMemo(() => {
    const set = new Set<string>();
    if (!hoverId && !selectedEdge) return set;
    const anchor = hoverId ?? selectedEdge?.source ?? selectedEdge?.target;
    if (!anchor) return set;
    for (const e of displayEdges) {
      if (e.source === anchor) set.add(e.target);
      if (e.target === anchor) set.add(e.source);
    }
    return set;
  }, [hoverId, selectedEdge, displayEdges]);

  const dim = hoverId !== null || selectedEdge !== null;

  const selectedStory = selectedEdge?.kind === 'story' ? storyLinks.find((s) => s.id === selectedEdge.id) : undefined;
  const selectedRel = selectedEdge?.kind === 'relationship' ? relationships.find((r) => r.id === selectedEdge.id) : undefined;

  return (
    <div className="map-view">
      <div className="map-toolbar">
        <p className="map-hint">
          The whole story web — {displayNodes.length} nodes · {displayEdges.length} links · {columns.length} categories
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${focusMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleFocusMode}
            title="Focus mode — click a node to explore only its connections"
          >
            ◎ Focus
          </button>
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            ＋ Add Link
          </button>
        </div>
      </div>

      <div className="web-filters">
        <button
          className={`filter-chip control${pickerOpen ? ' on' : ''}`}
          onClick={() => setPickerOpen((o) => !o)}
          title="Open the category picker"
        >
          🎛 Pick categories
        </button>
        {presentCategories.map((cat) => {
          const hidden = hiddenCategories.has(cat);
          const count = categoryCounts.get(cat) ?? 0;
          return (
            <button
              key={cat}
              className={`filter-chip${hidden ? ' off' : ''}`}
              onClick={() => toggleCategory(cat)}
              onDoubleClick={() => showOnly(cat)}
              style={{ '--chip': categoryColor(cat) } as React.CSSProperties}
              title={hidden
                ? `${cat} — hidden, click to show · double-click to show only this`
                : `${cat} — visible, click to hide · double-click to show only this`}
            >
              <span className="filter-dot" />
              {cat}
              <span className="chip-count">{count}</span>
            </button>
          );
        })}
        {(hiddenCategories.size > 0 || hiddenNodes.size > 0) && (
          <button className="filter-chip reset" onClick={showAll}>Show all</button>
        )}
      </div>

      {pickerOpen && (
        <div className="web-picker">
          <div className="web-picker-head">
            <span className="legend-title">Show categories as nodes</span>
            <div className="web-picker-actions">
              <button className="btn btn-secondary btn-xs" onClick={showAll}>Show all</button>
              <button className="btn btn-secondary btn-xs" onClick={hideAll}>Hide all</button>
            </div>
          </div>
          <div className="web-picker-grid">
            {presentCategories.map((cat) => {
              const visible = !hiddenCategories.has(cat);
              const count = categoryCounts.get(cat) ?? 0;
              return (
                <label key={cat} className={`web-picker-opt${visible ? ' on' : ''}`}>
                  <input type="checkbox" checked={visible} onChange={() => toggleCategory(cat)} />
                  <span className="filter-dot" style={{ background: categoryColor(cat) }} />
                  {cat}
                  <span className="chip-count">{count}</span>
                </label>
              );
            })}
          </div>
          <p className="web-picker-note">
            Your selection is remembered between visits. Double-click a chip to show only that category.
          </p>
        </div>
      )}

      {typeFilter && filteredEdgesCount === 0 && (
        <div className="focus-bar idle">
          <span>No "{typeFilter}" links are visible right now — clear the filter</span>
          <button className="btn btn-secondary btn-xs" onClick={() => setTypeFilter(null)}>✕ Clear filter</button>
        </div>
      )}

      {focusMode && focusNode && (
        <div className="focus-bar">
          <span className="focus-bar-name">◎ Focus: <strong>{focusNode}</strong></span>
          <span className="focus-bar-depth">
            <button className={focusDepth === 1 ? 'on' : ''} onClick={() => setFocusDepth(1)}>1 hop</button>
            <button className={focusDepth === 2 ? 'on' : ''} onClick={() => setFocusDepth(2)}>2 hops</button>
          </span>
          <span className="focus-bar-count">{focusSet.size} nodes · {displayEdges.length} links</span>
          <button className="btn btn-secondary btn-xs" onClick={() => setFocusNode(null)}>✕ Exit focus</button>
        </div>
      )}
      {focusMode && !focusNode && (
        <div className="focus-bar idle">
          <span>◎ Focus mode — <strong>click any node</strong> to explore its connections · Esc to exit</span>
          <button className="btn btn-secondary btn-xs" onClick={toggleFocusMode}>✕ Exit</button>
        </div>
      )}

      <div
        ref={containerRef}
        className="map-container web-container"
        style={{ position: 'relative', overflow: 'auto' }}
      >
        <svg
          ref={svgRef}
          className="map-svg"
          width={mapSize.width}
          height={mapSize.height}
          viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
        >
          <defs>
            {markerColors.map((color) => (
              <marker
                key={color}
                id={`warrow-${color.replace('#', '')}`}
                viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill={color} />
              </marker>
            ))}
          </defs>

          {/* Column backgrounds */}
          {columns.map((col) => (
            <ColHeader key={`col-${col.category}`} col={col} />
          ))}

          {/* Edges — only rendered when hovering/selecting a node AND both endpoints have connections */}
          {displayEdges.map((e) => {
            const g = edgeGeom.get(e.id);
            if (!g) return null;
            const connectedToHover = hoverId ? (e.source === hoverId || e.target === hoverId) : false;
            const connectedToSelected = selectedEdge ? (e.source === selectedEdge.source || e.source === selectedEdge.target || e.target === selectedEdge.source || e.target === selectedEdge.target) : false;
            // Both endpoints must have at least 1 connection each
            const sourceDegree = nodeDegree.get(e.source) ?? 0;
            const targetDegree = nodeDegree.get(e.target) ?? 0;
            const bothConnected = sourceDegree >= 1 && targetDegree >= 1;
            // Show edge only if hovering/selecting AND both endpoints are connected
            const isVisible = (connectedToHover || connectedToSelected) && bothConnected;
            // Completely skip rendering hidden edges — no arrowheads, no ghost lines
            if (!isVisible) return null;
            const matchesFilter = typeFilter ? edgeLabelText(e) === typeFilter : true;
            if (typeFilter && !matchesFilter) return null;
            const lp = edgeLabels.get(e.id);
            const showLabel = !!lp;
            const labelText = edgeLabelText(e);
            return (
              <WebEdge
                key={`${e.kind}-${e.id}`}
                id={e.id} active={true}
                path={g.curvedPath}
                color={e.color} dashed={e.dashed}
                strokeWidth={2.5}
                opacity={1}
                showLabel={showLabel}
                labelX={lp ? lp.x : g.mx} labelY={lp ? lp.y : g.my}
                labelText={showLabel ? labelText : ''}
                labelWidth={showLabel ? labelText.length * 5.5 + 14 : 0}
                onPointerEnter={handleEdgePointerEnter}
                onPointerLeave={handleEdgePointerLeave}
                onClick={handleEdgeClick}
              />
            );
          })}

          {/* Nodes */}
          {displayNodes.map((node) => {
            const pos = positions[node.name];
            if (!pos) return null;
            const hovered = hoverId === node.name;
            const focused = focusMode && focusNode === node.name;
            const isConnected = hoveredNeighborNames.has(node.name);
            const active = hovered || focused || isConnected || (selectedEdge ? selectedEdge.source === node.name || selectedEdge.target === node.name : false);
            const filteredOut = typeFilter ? !(filteredNodeSet?.has(node.name) ?? false) : false;
            const opacity = typeFilter && filteredOut ? 0 : (dim && !active ? 0 : 1);
            return (
              <WebNode
                key={node.name}
                name={node.name} category={node.category}
                x={pos.x} y={pos.y}
                opacity={opacity} active={active} focused={focused}
                hovered={hovered} focusMode={focusMode}
                hasEntry={!!entryByName.get(node.name.toLowerCase())}
                showLabel={nodeLabels.has(node.name)}
                onPointerEnter={handleNodePointerEnter}
                onPointerLeave={handleNodePointerLeave}
                onPointerDown={startDrag}
                onClick={handleNodeClick}
                onLabelClick={handleLabelClick}
              />
            );
          })}
        </svg>

        {/* Name popup */}
        {popup && (
          <NamePopup name={popup.name} x={popup.x} y={popup.y} onClose={() => setPopup(null)} />
        )}

        {selectedEdge && (
          <div className="map-edge-detail">
            <div className="map-edge-detail-head">
              <span className="chip" style={{ color: selectedEdge.color, borderColor: `${selectedEdge.color}55`, background: `${selectedEdge.color}14` }}>
                {edgeLabelText(selectedEdge)}
              </span>
              <button className="modal-close" onClick={() => setSelectedEdge(null)} aria-label="Close" style={{ position: 'static' }}>✕</button>
            </div>
            <p className="map-edge-relation">
              <strong>{selectedEdge.source}</strong> → <strong>{selectedEdge.target}</strong>
            </p>
            {selectedEdge.description && <p className="map-edge-desc">{selectedEdge.description}</p>}
            <div className="map-edge-actions">
              {selectedEdge.kind === 'story' ? (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => selectedStory && onEditStory(selectedStory)}>✎ Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => selectedStory && onDeleteStory(selectedStory)}>🗑 Delete</button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => selectedRel && onEditRel(selectedRel)}>✎ Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => selectedRel && onDeleteRel(selectedRel)}>🗑 Delete</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="map-legend">
        <span className="legend-title">Link types</span>
        {usedTypes.map(([label, info]) => (
          <button
            key={label}
            className={`legend-item legend-filter-btn${typeFilter === label ? ' active' : ''}`}
            onClick={() => setTypeFilter((cur) => (cur === label ? null : label))}
            title={typeFilter === label ? 'Click to show all link types' : `Highlight only "${label}" links`}
          >
            <span className="legend-dot" style={{ background: info.color }} />
            {label}
            <span className="legend-count">{info.count}</span>
          </button>
        ))}
        {typeFilter && (
          <button className="legend-item legend-filter-btn all" onClick={() => setTypeFilter(null)} title="Show all link types">
            ✕ Clear filter
          </button>
        )}
      </div>
      <div className="map-legend web-category-legend">
        <span className="legend-title">Node colors</span>
        {presentCategories.map((cat) => (
          <span key={cat} className="legend-item">
            <span className="legend-dot" style={{ background: categoryColor(cat) }} />
            {cat}
            <span className="legend-count">{categoryCounts.get(cat) ?? 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

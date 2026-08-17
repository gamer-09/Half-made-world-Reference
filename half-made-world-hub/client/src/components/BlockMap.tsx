import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entry, StoryLink } from '../types';
import { categoryColor } from '../theme';
import { storyLinkType } from '../storyLinkTypes';

/**
 * Block Chain Map — the world's geography as a rightward-flowing blockchain.
 *
 * Each root gets its own horizontal lane flowing to the right.
 * Lanes stack vertically. World genesis block sits at far left, centered.
 * Within a lane the tree grows rightward by depth.
 *
 * Scroll to zoom · drag to pan · hover to trace · click to open · Esc to fit.
 */

const CONTAINMENT_TYPES = new Set(['located in', 'lives in', 'home of', 'part of']);
const PARENT_PRIORITY = ['located in', 'lives in', 'home of', 'part of'];
const WORLD = 'The World';

const BLOCK_W = 200;
const BLOCK_H = 80;
const H_GAP = 100;
const V_GAP = 10;
const LANE_PAD = 22;
const PAD = 28;
const MIN_SCALE = 0.04;
const MAX_SCALE = 3;

interface MapNode {
  name: string;
  entry: Entry | null;
  children: MapNode[];
  size: number;
  depth: number;
  x: number;
  y: number;
  parentName: string | null;
  parentType: string | null;
}

function buildTree(entries: Entry[], storyLinks: StoryLink[]): MapNode {
  const byName = new Map(entries.map((e) => [e.name, e]));
  const participating = new Set<string>();
  for (const e of entries) if (e.category === 'Realms') participating.add(e.name);
  const containment = storyLinks.filter((l) => CONTAINMENT_TYPES.has(l.type));
  for (const l of containment) {
    if (byName.has(l.source)) participating.add(l.source);
    if (byName.has(l.target)) participating.add(l.target);
  }
  const parentOf = new Map<string, string>();
  const typeOf = new Map<string, string>();
  const ordered = [...containment].sort((a, b) => PARENT_PRIORITY.indexOf(a.type) - PARENT_PRIORITY.indexOf(b.type));
  for (const l of ordered) {
    if (l.source === l.target) continue;
    if (!participating.has(l.source) || !participating.has(l.target)) continue;
    if (!parentOf.has(l.source)) { parentOf.set(l.source, l.target); typeOf.set(l.source, l.type); }
  }
  const childrenOf = new Map<string, string[]>();
  for (const [child, parent] of parentOf) {
    const list = childrenOf.get(parent) ?? [];
    list.push(child);
    childrenOf.set(parent, list);
  }
  const nodeMap = new Map<string, MapNode>();
  const build = (name: string, seen: Set<string>): MapNode => {
    const existing = nodeMap.get(name);
    if (existing) return existing;
    const node: MapNode = { name, entry: byName.get(name) ?? null, children: [], size: 1, depth: 0, x: 0, y: 0, parentName: null, parentType: null };
    nodeMap.set(name, node);
    for (const kid of childrenOf.get(name) ?? []) {
      if (seen.has(kid)) continue;
      const nextSeen = new Set(seen); nextSeen.add(kid);
      const child = build(kid, nextSeen);
      child.parentName = name; child.parentType = typeOf.get(kid) ?? null;
      node.children.push(child);
    }
    return node;
  };
  const roots = [...participating].filter((n) => !parentOf.has(n));
  const world: MapNode = { name: WORLD, entry: null, children: [], size: 1, depth: 0, x: 0, y: 0, parentName: null, parentType: null };
  for (const r of roots) world.children.push(build(r, new Set([r])));
  const measure = (n: MapNode): number => { let s = 1; for (const c of n.children) s += measure(c); n.size = s; return s; };
  measure(world);
  const sortRec = (n: MapNode) => { n.children.sort((a, b) => b.size - a.size); n.children.forEach(sortRec); };
  sortRec(world);
  return world;
}

function countLeaves(n: MapNode): number {
  if (n.children.length === 0) return 1;
  return n.children.reduce((s, c) => s + countLeaves(c), 0);
}

function layoutTree(world: MapNode): { size: { width: number; height: number }; nodes: MapNode[] } {
  const nodes: MapNode[] = [];
  let maxDepth = 0;
  let maxRight = 0;

  // Layout each root's subtree within its own lane.
  let laneY = PAD;
  for (const root of world.children) {
    const leafCount = countLeaves(root);
    const laneHeight = leafCount * (BLOCK_H + V_GAP) - V_GAP;
    let slot = 0;
    const laneTop = laneY;

    const laySubtree = (n: MapNode, depth: number) => {
      n.depth = depth;
      maxDepth = Math.max(maxDepth, depth);
      n.x = PAD + (BLOCK_W + H_GAP) + depth * (BLOCK_W + H_GAP);
      nodes.push(n);
      if (n.children.length === 0) {
        n.y = laneTop + slot * (BLOCK_H + V_GAP);
        slot += 1;
      } else {
        for (const c of n.children) laySubtree(c, depth + 1);
        const ys = n.children.map((c) => c.y);
        n.y = (Math.min(...ys) + Math.max(...ys)) / 2;
      }
      maxRight = Math.max(maxRight, n.x + BLOCK_W);
    };
    laySubtree(root, 0);
    laneY += laneHeight + LANE_PAD;
  }

  // Place World genesis block at far left, centered vertically.
  const worldY = (PAD + (laneY - LANE_PAD)) / 2 - BLOCK_H / 2;
  world.depth = 0;
  world.x = PAD;
  world.y = worldY;
  nodes.unshift(world);

  const totalHeight = laneY - LANE_PAD + PAD;
  const totalWidth = Math.max(maxRight + PAD, PAD * 2 + (BLOCK_W + H_GAP) * 2 + BLOCK_W);

  return { size: { width: totalWidth, height: totalHeight }, nodes };
}

function hashOf(name: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i += 1) { h ^= name.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

interface BlockMapProps {
  entries: Entry[];
  storyLinks: StoryLink[];
  onNodeClick: (entry: Entry) => void;
}

export function BlockMap({ entries, storyLinks, onNodeClick }: BlockMapProps) {
  const tree = useMemo(() => buildTree(entries, storyLinks), [entries, storyLinks]);
  const { size, nodes } = useMemo(() => layoutTree(tree), [tree]);

  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [panning, setPanning] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const viewRef = useRef({ s: 1, tx: 0, ty: 0 });
  const dragRef = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);

  useEffect(() => { viewRef.current = { s: scale, tx, ty }; }, [scale, tx, ty]);

  const fitView = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const sw = stage.clientWidth; const sh = stage.clientHeight;
    if (!sw || !sh) return;
    const s = Math.min(sw / size.width, sh / size.height, 1.15);
    const ns = Math.max(MIN_SCALE, s);
    setScale(ns); setTx((sw - size.width * ns) / 2); setTy((sh - size.height * ns) / 2);
  };

  useEffect(() => { fitView(); window.addEventListener('resize', fitView); return () => window.removeEventListener('resize', fitView); }, [size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fitView(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomAt = (factor: number, cx: number, cy: number) => {
    const { s, tx: vx, ty: vy } = viewRef.current;
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor));
    setScale(ns); setTx(cx - ((cx - vx) * ns) / s); setTy(cy - ((cy - vy) * ns) / s);
  };

  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const rect = el.getBoundingClientRect(); const cx = rect.width ? e.clientX - rect.left : 0; const cy = rect.height ? e.clientY - rect.top : 0; zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, cx, cy); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, tx: viewRef.current.tx, ty: viewRef.current.ty };
    setPanning(true);
  };

  useEffect(() => {
    if (!panning) return;
    const onMove = (e: PointerEvent) => { const d = dragRef.current; if (!d) return; setTx(d.tx + (e.clientX - d.sx)); setTy(d.ty + (e.clientY - d.sy)); };
    const onUp = () => { dragRef.current = null; setPanning(false); };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [panning]);

  const byName = useMemo(() => new Map(nodes.map((n) => [n.name, n])), [nodes]);
  const chainOf = (name: string): Set<string> => {
    const set = new Set<string>([name]); const node = byName.get(name); if (!node) return set;
    if (node.parentName) set.add(node.parentName); for (const c of node.children) set.add(c.name); return set;
  };

  const zoomButtons = (factor: number) => { const stage = stageRef.current; const cx = stage ? stage.clientWidth / 2 : 0; const cy = stage ? stage.clientHeight / 2 : 0; zoomAt(factor, cx, cy); };
  const linkCount = nodes.reduce((n, node) => n + (node.parentType ? 1 : 0), 0);
  const realmCount = nodes.filter((n) => n.entry?.category === 'Realms').length;

  return (
    <div className="blockmap">
      <div className="blockmap-bar">
        <div className="blockmap-stats">
          <span className="blockmap-stat"><span className="blockmap-stat-dot genesis-dot" /> {realmCount} realm{realmCount === 1 ? '' : 's'}</span>
          <span className="blockmap-stat"><span className="blockmap-stat-dot" /> {nodes.length} block{nodes.length === 1 ? '' : 's'}</span>
          <span className="blockmap-stat"><span className="blockmap-stat-dot chain-dot" /> {linkCount} link{linkCount === 1 ? '' : 's'}</span>
        </div>
        <div className="blockmap-zoom">
          <button className="blockmap-zoom-btn" onClick={() => fitView()} title="Fit (Esc)">⤢ Fit</button>
          <button className="blockmap-zoom-btn" onClick={() => zoomButtons(1 / 1.25)} title="Zoom out">−</button>
          <span className="blockmap-zoom-pct">{Math.round(scale * 100)}%</span>
          <button className="blockmap-zoom-btn" onClick={() => zoomButtons(1.25)} title="Zoom in">+</button>
        </div>
      </div>
      <div className={`blockmap-stage${panning ? ' panning' : ''}`} ref={stageRef} onPointerDown={onStagePointerDown}>
        <div className="blockmap-canvas" style={{ width: size.width, height: size.height, transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}>
          <svg className="blockmap-links" width={size.width} height={size.height}>
            {nodes.map((node) => {
              if (!node.parentName || !node.parentType) return null;
              const parent = byName.get(node.parentName); if (!parent) return null;
              const px = parent.x + BLOCK_W; const py = parent.y + BLOCK_H / 2;
              const cx = node.x; const cy = node.y + BLOCK_H / 2;
              const midX = parent.x + BLOCK_W + H_GAP / 2; const midY = (py + cy) / 2;
              const type = storyLinkType(node.parentType);
              const active = hoverId ? chainOf(hoverId).has(node.name) : true;
              const dimmed = hoverId !== null && !active;
              return (
                <g key={node.name} className={`blockmap-link${dimmed ? ' dim' : ''}`}>
                  <path d={`M ${px} ${py} L ${midX} ${py} L ${midX} ${cy} L ${cx} ${cy}`} fill="none" stroke={type.color} strokeOpacity={0.35} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
                  <path d={`M ${px} ${py} L ${midX} ${py} L ${midX} ${cy} L ${cx} ${cy}`} fill="none" stroke={type.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  <g stroke={type.color} strokeWidth={2} fill="none" opacity={0.85}>
                    <line x1={midX - 7} y1={py} x2={midX + 7} y2={py} />
                    <circle cx={midX - 7} cy={py} r={3.2} /><circle cx={midX + 7} cy={py} r={3.2} />
                  </g>
                  <rect x={midX - ((type.label.length * 5.6 + 14) / 2)} y={midY - 10} width={type.label.length * 5.6 + 14} height={20} rx={10} fill="rgba(7, 11, 22, 0.94)" stroke={type.color} strokeOpacity={0.55} />
                  <text x={midX} y={midY + 4} textAnchor="middle" className="blockmap-link-label" fill={type.color}>{type.label}</text>
                </g>
              );
            })}
          </svg>
          {nodes.map((node) => {
            const hovered = hoverId === node.name;
            const dimmed = hoverId !== null && !chainOf(hoverId).has(node.name);
            const color = node.entry ? categoryColor(node.entry.category) : '#e2c044';
            const isWorld = node.name === WORLD; const hasChildren = node.children.length > 0;
            return (
              <button key={node.name} className={`blockmap-node${dimmed ? ' dim' : ''}${hovered ? ' hovered' : ''}${isWorld ? ' genesis' : ''}`}
                style={{ left: node.x, top: node.y, width: BLOCK_W, height: BLOCK_H, borderColor: isWorld ? 'rgba(226, 192, 68, 0.6)' : `${color}66` }}
                onPointerDown={(e) => e.stopPropagation()} onPointerEnter={() => setHoverId(node.name)} onPointerLeave={() => setHoverId(null)}
                onClick={() => { if (node.entry) onNodeClick(node.entry); else fitView(); }}
                title={node.entry?.subtitle || (isWorld ? 'Genesis — click to fit' : '')}
              >
                <span className="blockmap-blk-head" style={{ background: isWorld ? 'linear-gradient(90deg, #e2c044, #a87b1f)' : color }}>
                  <span className="blockmap-blk-cat">{isWorld ? '◆ GENESIS' : node.entry?.category ?? 'world'}</span>
                  <span className="blockmap-blk-height">#{node.depth}</span>
                </span>
                <span className="blockmap-blk-body">
                  <span className="blockmap-node-name">{node.name}</span>
                  {node.entry?.subtitle && <span className="blockmap-node-sub">{node.entry.subtitle}</span>}
                </span>
                <span className="blockmap-blk-foot">
                  <span className="blockmap-node-size">{node.size} {node.size === 1 ? 'entry' : 'entries'}{hasChildren ? ` · ${node.children.length} ch` : ''}</span>
                  <span className="blockmap-blk-hash">0x{hashOf(node.name)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="blockmap-hint">The world as a chain — every block links to what contains it. Scroll to zoom · drag to pan · hover to trace · click to open · Esc to fit</p>
    </div>
  );
}

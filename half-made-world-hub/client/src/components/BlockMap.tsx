import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entry, StoryLink } from '../types';
import { categoryColor } from '../theme';

/**
 * Block Map — a zoomable, hierarchical view of the world's geography.
 *
 * Branches are derived from the story links that express containment:
 *   located in / lives in / home of / part of
 * The top level is the world: its realms and any unplaced regions. Click a
 * block with children to "zoom in" (drill a level), scroll or use the +/–
 * controls to magnify, and click a leaf to open its entry.
 */

const CONTAINMENT_TYPES = new Set(['located in', 'lives in', 'home of', 'part of']);
// Prefer the strongest geographic tie when an entry has several parents.
const PARENT_PRIORITY = ['located in', 'lives in', 'home of', 'part of'];
const WORLD = 'The World';

interface MapNode {
  name: string;
  entry: Entry | null; // null only for the synthetic world root
  children: MapNode[];
  size: number; // self + descendants
}

function buildTree(entries: Entry[], storyLinks: StoryLink[]): MapNode {
  const byName = new Map(entries.map((e) => [e.name, e]));

  // Only entries that participate in a containment link (or are a realm)
  // belong on the geographic map — skills/items/classes/etc. stay out.
  const participating = new Set<string>();
  for (const e of entries) if (e.category === 'Realms') participating.add(e.name);

  const containment = storyLinks.filter((l) => CONTAINMENT_TYPES.has(l.type));
  for (const l of containment) {
    if (byName.has(l.source)) participating.add(l.source);
    if (byName.has(l.target)) participating.add(l.target);
  }

  // Single-parent assignment, strongest tie first.
  const parentOf = new Map<string, string>();
  const ordered = [...containment].sort(
    (a, b) => PARENT_PRIORITY.indexOf(a.type) - PARENT_PRIORITY.indexOf(b.type),
  );
  for (const l of ordered) {
    if (l.source === l.target) continue;
    if (!participating.has(l.source) || !participating.has(l.target)) continue;
    if (!parentOf.has(l.source)) parentOf.set(l.source, l.target);
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
    const node: MapNode = { name, entry: byName.get(name) ?? null, children: [], size: 1 };
    nodeMap.set(name, node);
    for (const kid of childrenOf.get(name) ?? []) {
      if (seen.has(kid)) continue; // break cycles
      const nextSeen = new Set(seen);
      nextSeen.add(kid);
      node.children.push(build(kid, nextSeen));
    }
    return node;
  };

  const roots = [...participating].filter((n) => !parentOf.has(n));

  const world: MapNode = { name: WORLD, entry: null, children: [], size: 1 };
  for (const r of roots) world.children.push(build(r, new Set([r])));

  const measure = (n: MapNode): number => {
    let s = 1;
    for (const c of n.children) s += measure(c);
    n.size = s;
    return s;
  };
  measure(world);
  const sortRec = (n: MapNode) => {
    n.children.sort((a, b) => b.size - a.size);
    n.children.forEach(sortRec);
  };
  sortRec(world);

  return world;
}

interface BlockMapProps {
  entries: Entry[];
  storyLinks: StoryLink[];
  onNodeClick: (entry: Entry) => void;
}

export function BlockMap({ entries, storyLinks, onNodeClick }: BlockMapProps) {
  const tree = useMemo(() => buildTree(entries, storyLinks), [entries, storyLinks]);

  const [path, setPath] = useState<string[]>([]);
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 0.5, y: 0.5 });
  const stageRef = useRef<HTMLDivElement>(null);

  // Resolve the currently focused node by walking the path.
  let current = tree;
  for (const name of path) {
    const next = current.children.find((c) => c.name === name);
    if (!next) break;
    current = next;
  }

  const drill = (node: MapNode) => {
    if (node.children.length === 0) {
      if (node.entry) onNodeClick(node.entry);
      return;
    }
    setPath([...path, node.name]);
    setScale(1);
    setOrigin({ x: 0.5, y: 0.5 });
  };

  const goUp = () => {
    setPath(path.slice(0, -1));
    setScale(1);
  };
  const goTo = (idx: number) => {
    setPath(path.slice(0, idx));
    setScale(1);
  };

  const zoomBy = (factor: number, cx = 0.5, cy = 0.5) => {
    setOrigin({ x: cx, y: cy });
    setScale((s) => Math.min(3, Math.max(0.4, +(s * factor).toFixed(3))));
  };

  // Native, non-passive wheel listener so preventDefault actually stops scroll.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = rect.width ? (e.clientX - rect.left) / rect.width : 0.5;
      const cy = rect.height ? (e.clientY - rect.top) / rect.height : 0.5;
      zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, cx, cy);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Escape = go up a level.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && path.length > 0) goUp();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [path]);

  const crumbs = [WORLD, ...path];

  return (
    <div className="blockmap">
      <div className="blockmap-bar">
        <div className="blockmap-crumbs">
          {crumbs.map((c, i) => (
            <span key={`${c}-${i}`} className="blockmap-crumb-wrap">
              {i > 0 && <span className="blockmap-sep">›</span>}
              <button
                className="blockmap-crumb"
                onClick={() => goTo(i)}
                disabled={i === crumbs.length - 1}
              >
                {c}
              </button>
            </span>
          ))}
        </div>
        <div className="blockmap-zoom">
          <button className="blockmap-zoom-btn" onClick={() => zoomBy(1 / 1.25)} title="Zoom out">
            −
          </button>
          <span className="blockmap-zoom-pct">{Math.round(scale * 100)}%</span>
          <button className="blockmap-zoom-btn" onClick={() => zoomBy(1.25)} title="Zoom in">
            +
          </button>
          {path.length > 0 && (
            <button className="blockmap-zoom-btn blockmap-up" onClick={goUp} title="Go up (Esc)">
              ⤴ Up
            </button>
          )}
        </div>
      </div>

      <div className="blockmap-stage" ref={stageRef}>
        <div
          className="blockmap-layer"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${origin.x * 100}% ${origin.y * 100}%`,
          }}
        >
          {current.children.length === 0 ? (
            <div className="blockmap-empty">
              <p className="empty-title">Nothing nests here yet.</p>
              <p className="empty-text">Add “located in” / “lives in” / “part of” links to grow this branch.</p>
            </div>
          ) : (
            current.children.map((node) => <Block key={node.name} node={node} onDrill={drill} />)
          )}
        </div>
      </div>

      <p className="blockmap-hint">
        Scroll to zoom · click a block to branch in · click a leaf to open it · Esc to go up
      </p>
    </div>
  );
}

function Block({ node, onDrill }: { node: MapNode; onDrill: (n: MapNode) => void }) {
  const color = node.entry ? categoryColor(node.entry.category) : '#94a3b8';
  const hasChildren = node.children.length > 0;
  const label = hasChildren ? `${node.children.length} branch${node.children.length === 1 ? '' : 'es'}` : '';

  return (
    <button
      className={`blockmap-node${hasChildren ? ' branch' : ' leaf'}`}
      style={{
        borderColor: `${color}66`,
        background: `linear-gradient(160deg, ${color}1f 0%, ${color}0a 100%)`,
      }}
      onClick={() => onDrill(node)}
      title={label || node.entry?.subtitle || ''}
    >
      <span className="blockmap-node-top">
        <span className="blockmap-node-dot" style={{ background: color }} />
        <span className="blockmap-node-cat">{node.entry?.category ?? 'world'}</span>
      </span>
      <span className="blockmap-node-name">{node.name}</span>
      {node.entry?.subtitle && <span className="blockmap-node-sub">{node.entry.subtitle}</span>}
      <span className="blockmap-node-foot">
        <span className="blockmap-node-size">
          {node.size} {node.size === 1 ? 'entry' : 'entries'}
        </span>
        {hasChildren && <span className="blockmap-badge">{node.children.length} ▸</span>}
      </span>
    </button>
  );
}

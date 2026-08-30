import { useCallback, useMemo, useState } from 'react';
import type { Entry, StoryLink } from '../types';
import { categoryColor } from '../theme';
import { storyLinkType } from '../storyLinkTypes';

/**
 * Block Chain Map — geography as realm panels with item cards.
 *
 * Each realm is a visible panel with a colored header.
 * Items inside are compact cards with clear text.
 * Everything is readable at a glance — no zooming needed.
 */

const CONTAINMENT_TYPES = new Set(['located in', 'lives in', 'home of', 'part of']);
const PARENT_PRIORITY = ['located in', 'lives in', 'home of', 'part of'];

interface TreeNode {
  name: string;
  entry: Entry | null;
  children: TreeNode[];
  size: number;
  parentName: string | null;
  parentType: string | null;
}

function buildTree(entries: Entry[], storyLinks: StoryLink[]): TreeNode {
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
  const nodeMap = new Map<string, TreeNode>();
  const build = (name: string, seen: Set<string>): TreeNode => {
    const existing = nodeMap.get(name);
    if (existing) return existing;
    const node: TreeNode = { name, entry: byName.get(name) ?? null, children: [], size: 1, parentName: null, parentType: null };
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
  const world: TreeNode = { name: 'The World', entry: null, children: [], size: 1, parentName: null, parentType: null };
  for (const r of roots) world.children.push(build(r, new Set([r])));
  const measure = (n: TreeNode): number => { let s = n.children.length ? 0 : 1; for (const c of n.children) s += measure(c); n.size = s || 1; return s || 1; };
  measure(world);
  const sortRec = (n: TreeNode) => { n.children.sort((a, b) => b.size - a.size); n.children.forEach(sortRec); };
  sortRec(world);
  return world;
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

interface RealmPanel {
  name: string;
  color: string;
  items: TreeNode[];
}

export function BlockMap({ entries, storyLinks, onNodeClick }: BlockMapProps) {
  const tree = useMemo(() => buildTree(entries, storyLinks), [entries, storyLinks]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [expandedRealm, setExpandedRealm] = useState<string | null>(null);

  // Build realm panels from tree
  const panels = useMemo<RealmPanel[]>(() => {
    return tree.children.map((child) => {
      const items: TreeNode[] = [];
      const walk = (n: TreeNode) => {
        if (n.children.length === 0) items.push(n);
        else for (const c of n.children) walk(c);
      };
      walk(child);
      const entry = child.entry;
      return {
        name: child.name,
        color: entry ? categoryColor(entry.category) : '#e2c044',
        items,
      };
    });
  }, [tree]);

  const totalItems = panels.reduce((s, p) => s + p.items.length, 0);
  const totalLinks = panels.reduce((s, p) => s + p.items.filter((i) => i.parentType).length, 0) + panels.length;

  const handleCardClick = useCallback((node: TreeNode) => {
    if (node.entry) onNodeClick(node.entry);
  }, [onNodeClick]);

  return (
    <div className="blockmap-panels">
      <div className="blockmap-bar">
        <div className="blockmap-stats">
          <span className="blockmap-stat"><span className="blockmap-stat-dot genesis-dot" /> {panels.length} realm{panels.length === 1 ? '' : 's'}</span>
          <span className="blockmap-stat"><span className="blockmap-stat-dot" /> {totalItems} block{totalItems === 1 ? '' : 's'}</span>
          <span className="blockmap-stat"><span className="blockmap-stat-dot chain-dot" /> {totalLinks} link{totalLinks === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="blockmap-grid">
        {panels.map((panel) => {
          const isExpanded = expandedRealm === panel.name || expandedRealm === null;
          return (
            <div key={panel.name} className="realm-panel">
              {/* Realm header */}
              <div
                className="realm-panel-header"
                style={{ background: panel.color, cursor: 'pointer' }}
                onClick={() => setExpandedRealm(expandedRealm === panel.name ? null : panel.name)}
              >
                <span className="realm-panel-name">{panel.name}</span>
                <span className="realm-panel-count">{panel.items.length} items</span>
              </div>

              {/* Item cards grid */}
              {isExpanded && (
                <div className="realm-panel-body">
                  {panel.items.map((item) => {
                    const isHovered = hoverId === item.name;
                    const catColor = item.entry ? categoryColor(item.entry.category) : panel.color;
                    return (
                      <div
                        key={item.name}
                        className={`item-card${isHovered ? ' hovered' : ''}`}
                        style={{ borderLeftColor: catColor }}
                        onPointerEnter={() => setHoverId(item.name)}
                        onPointerLeave={() => setHoverId(null)}
                        onClick={() => handleCardClick(item)}
                        title={item.entry?.subtitle || item.name}
                      >
                        <span className="item-card-name">{item.name}</span>
                        <span className="item-card-hash">0x{hashOf(item.name)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

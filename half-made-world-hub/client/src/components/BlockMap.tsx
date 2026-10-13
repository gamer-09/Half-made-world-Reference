import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import type { Entry, StoryLink } from '../types';
import { categoryColor } from '../theme';

/**
 * Block Chain Map — geography as realm blocks with linked item blocks.
 *
 * The four Realms are the top-level blocks. Every entry that has a
 * containment link (located in / lives in / home of / part of) is chained
 * to the realm nearest to it, so the whole geography shows up instead of
 * collapsing into cycles.
 */

const CONTAINMENT_TYPES = new Set(['located in', 'lives in', 'home of', 'part of']);
const OTHER_REALM = 'Other Regions';

interface MapItem {
  name: string;
  entry: Entry | null;
  depth: number;
}

interface RealmPanel {
  name: string;
  color: string;
  items: MapItem[];
}

function hashOf(name: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i += 1) { h ^= name.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

function buildPanels(entries: Entry[], storyLinks: StoryLink[]): RealmPanel[] {
  const byName = new Map(entries.map((e) => [e.name, e]));
  const realms = entries.filter((e) => e.category === 'Realms');
  const realmNames = new Set(realms.map((r) => r.name));

  // undirected adjacency over containment links (direction in the data is
  // inconsistent, so treat containment as a mutual relationship)
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const l of storyLinks) {
    if (!CONTAINMENT_TYPES.has(l.type) || l.source === l.target) continue;
    if (!byName.has(l.source) || !byName.has(l.target)) continue;
    link(l.source, l.target);
    link(l.target, l.source);
  }

  // multi-source BFS from every realm: each entry is claimed by the realm
  // it is fewest steps from, so no entry is lost to a cycle.
  const depth = new Map<string, number>();
  const owner = new Map<string, string>();
  const queue: string[] = [];
  for (const r of realms) { depth.set(r.name, 0); owner.set(r.name, r.name); queue.push(r.name); }
  for (let qi = 0; qi < queue.length; qi += 1) {
    const n = queue[qi];
    const d = depth.get(n)!;
    for (const m of adj.get(n) ?? []) {
      if (depth.has(m)) continue;
      depth.set(m, d + 1);
      owner.set(m, owner.get(n)!);
      queue.push(m);
    }
  }

  const groups = new Map<string, MapItem[]>();
  for (const r of realms) groups.set(r.name, []);
  const others: MapItem[] = [];
  for (const [name, d] of depth) {
    if (realmNames.has(name)) continue;
    const item: MapItem = { name, entry: byName.get(name) ?? null, depth: d };
    const o = owner.get(name)!;
    if (groups.has(o)) groups.get(o)!.push(item);
    else others.push(item);
  }

  const panels: RealmPanel[] = realms.map((r) => ({
    name: r.name,
    color: categoryColor(r.category),
    items: (groups.get(r.name) ?? []).sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name)),
  }));

  if (others.length) {
    others.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));
    panels.push({ name: OTHER_REALM, color: '#8a8f9c', items: others });
  }

  return panels.sort((a, b) => b.items.length - a.items.length);
}

interface BlockMapProps {
  entries: Entry[];
  storyLinks: StoryLink[];
  onNodeClick: (entry: Entry) => void;
}

export function BlockMap({ entries, storyLinks, onNodeClick }: BlockMapProps) {
  const panels = useMemo(() => buildPanels(entries, storyLinks), [entries, storyLinks]);
  const [expandedRealm, setExpandedRealm] = useState<string | null>(null);

  const totalItems = panels.reduce((s, p) => s + p.items.length, 0);
  const totalLinks = useMemo(
    () => storyLinks.filter((l) => CONTAINMENT_TYPES.has(l.type)).length,
    [storyLinks],
  );

  const handleCardClick = useCallback((item: MapItem) => {
    if (item.entry) onNodeClick(item.entry);
  }, [onNodeClick]);

  return (
    <div className="blockmap">
      <div className="blockmap-bar">
        <div className="blockmap-stats">
          <span className="blockmap-stat">
            <span className="blockmap-dot" style={{ background: '#c8a876' }} />
            <b>{panels.length}</b> realm{panels.length === 1 ? '' : 's'}
          </span>
          <span className="blockmap-stat">
            <span className="blockmap-dot" style={{ background: '#8fb27a' }} />
            <b>{totalItems}</b> block{totalItems === 1 ? '' : 's'}
          </span>
          <span className="blockmap-stat">
            <span className="blockmap-dot" style={{ background: '#9a6fd6' }} />
            <b>{totalLinks}</b> link{totalLinks === 1 ? '' : 's'}
          </span>
        </div>
        <p className="blockmap-hint">Click a realm to collapse it · click a block to open its entry</p>
      </div>

      <div className="blockmap-grid">
        {panels.map((panel) => {
          const isExpanded = expandedRealm === panel.name || expandedRealm === null;
          return (
            <article
              key={panel.name}
              className={`realm-panel${isExpanded ? ' open' : ''}`}
              style={{ '--c': panel.color } as CSSProperties}
            >
              <button
                className="realm-head"
                onClick={() => setExpandedRealm(expandedRealm === panel.name ? null : panel.name)}
                aria-expanded={isExpanded}
              >
                <span className="realm-swatch" />
                <span className="realm-name">{panel.name}</span>
                <span className="realm-count">{panel.items.length}</span>
                <span className="realm-chevron">▾</span>
              </button>

              {isExpanded && (
                <div className="realm-body">
                  {panel.items.map((item) => {
                    const catColor = item.entry ? categoryColor(item.entry.category) : panel.color;
                    return (
                      <button
                        key={item.name}
                        className={`block-item${item.depth > 1 ? ' nested' : ''}`}
                        style={{ '--cc': catColor } as CSSProperties}
                        onClick={() => handleCardClick(item)}
                        title={item.entry?.subtitle || item.name}
                      >
                        <span className="block-item-dot" />
                        <span className="block-item-main">
                          <span className="block-item-name">{item.name}</span>
                          {item.entry?.subtitle && <span className="block-item-sub">{item.entry.subtitle}</span>}
                        </span>
                        <span className="block-item-hash">0x{hashOf(item.name)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

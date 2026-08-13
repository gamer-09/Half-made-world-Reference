import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entry, Relationship } from '../types';
import { relationshipType } from '../relationshipTypes';
import { findCharacter } from '../nameMatch';

const W = 1200;
const H = 720;
const NODE_R = 24;
const DRAG_THRESHOLD = 4;

interface Pos {
  x: number;
  y: number;
}
type Positions = Record<string, Pos>;

interface MapProps {
  relationships: Relationship[];
  characterEntries: Entry[];
  onNodeClick: (entry: Entry) => void;
  onAdd: () => void;
  onEdit: (rel: Relationship) => void;
  onDelete: (rel: Relationship) => void;
}

/** Spread-out force layout: strong repulsion, long springs, gentle gravity. */
function forceLayout(names: string[], edges: { source: string; target: string }[], seed?: Positions): Positions {
  const nodes = names.map((name, i) => {
    const prev = seed?.[name];
    const angle = (i / names.length) * Math.PI * 2;
    return {
      name,
      x: prev ? prev.x + (Math.random() - 0.5) * 24 : W / 2 + Math.cos(angle) * 260,
      y: prev ? prev.y + (Math.random() - 0.5) * 24 : H / 2 + Math.sin(angle) * 200,
      vx: 0,
      vy: 0,
    };
  });
  const byName = new Map(nodes.map((n) => [n.name, n]));

  for (let iter = 0; iter < 360; iter += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          dx = (Math.random() - 0.5) * 4;
          dy = (Math.random() - 0.5) * 4;
          d2 = 4;
        }
        const d = Math.sqrt(d2);
        const force = 52000 / (d2 + 1200);
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    for (const edge of edges) {
      const a = byName.get(edge.source);
      const b = byName.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (d - 220) * 0.02;
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const n of nodes) {
      n.vx += (W / 2 - n.x) * 0.008;
      n.vy += (H / 2 - n.y) * 0.008;
    }

    for (const n of nodes) {
      n.vx *= 0.82;
      n.vy *= 0.82;
      const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (speed > 11) {
        n.vx = (n.vx / speed) * 11;
        n.vy = (n.vy / speed) * 11;
      }
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(70, Math.min(W - 70, n.x));
      n.y = Math.max(60, Math.min(H - 60, n.y));
    }
  }

  // De-overlap pass: prevent nodes from piling up on the same pixel at the
  // canvas edges (the clamp above), which makes arrows from those coincident
  // nodes to a shared neighbor render on top of each other.
  const MIN_DIST = NODE_R * 2 + 14;
  for (let pass = 0; pass < 12; pass += 1) {
    let moved = false;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d < MIN_DIST) {
          if (d < 1e-6) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d = Math.hypot(dx, dy) || 1;
          }
          const push = (MIN_DIST - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
          moved = true;
        }
      }
    }
    for (const n of nodes) {
      n.x = Math.max(70, Math.min(W - 70, n.x));
      n.y = Math.max(60, Math.min(H - 60, n.y));
    }
    if (!moved) break;
  }

  for (let pass = 0; pass < 10; pass += 1) {
    let moved = false;
    for (const n of nodes) {
      const neighbors: typeof nodes = [];
      for (const edge of edges) {
        if (edge.source === n.name) {
          const t = byName.get(edge.target);
          if (t) neighbors.push(t);
        } else if (edge.target === n.name) {
          const s = byName.get(edge.source);
          if (s) neighbors.push(s);
        }
      }
      for (let i = 0; i < neighbors.length; i += 1) {
        for (let j = i + 1; j < neighbors.length; j += 1) {
          const a = neighbors[i];
          const b = neighbors[j];
          if (a === b) continue;
          const angA = Math.atan2(a.y - n.y, a.x - n.x);
          const angB = Math.atan2(b.y - n.y, b.x - n.x);
          let diff = Math.abs(angA - angB);
          diff = Math.min(diff, Math.PI * 2 - diff);
          if (diff < 0.3) {
            const mid = (angA + angB) / 2;
            const push = 12;
            a.x += Math.cos(mid + Math.PI / 2) * push;
            a.y += Math.sin(mid + Math.PI / 2) * push;
            b.x += Math.cos(mid - Math.PI / 2) * push;
            b.y += Math.sin(mid - Math.PI / 2) * push;
            moved = true;
          }
        }
      }
    }
    for (const n of nodes) {
      n.x = Math.max(70, Math.min(W - 70, n.x));
      n.y = Math.max(60, Math.min(H - 60, n.y));
    }
    if (!moved) break;
  }

  const out: Positions = {};
  for (const n of nodes) out[n.name] = { x: n.x, y: n.y };
  return out;
}

export function RelationshipMap({
  relationships,
  characterEntries,
  onNodeClick,
  onAdd,
  onEdit,
  onDelete,
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean; startX: number; startY: number } | null>(null);
  const positionsRef = useRef<Positions>({});

  const [positions, setPositions] = useState<Positions>({});
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Relationship | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const resolveName = (name: string): string => {
    const exact = characterEntries.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (exact) return exact.name;
    const ch = findCharacter(characterEntries, name);
    if (ch) return ch.name;
    return name;
  };

  const names = useMemo(() => {
    const set = new Set<string>();
    for (const e of characterEntries) set.add(e.name);
    for (const r of relationships) {
      set.add(resolveName(r.source));
      set.add(resolveName(r.target));
    }
    return [...set];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationships, characterEntries]);

  const edges = useMemo(
    () =>
      relationships.map((r) => ({
        source: resolveName(r.source),
        target: resolveName(r.target),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relationships, characterEntries],
  );

  const findEntry = (name: string): Entry | undefined =>
    characterEntries.find((e) => e.name.toLowerCase() === name.toLowerCase()) ?? findCharacter(characterEntries, name);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    setPositions(forceLayout(names, edges, positionsRef.current));
  }, [names, edges]);

  useEffect(() => {
    setSelectedEdge(null);
  }, [relationships]);

  // --- dragging ----------------------------------------------------------
  const toSvg = (clientX: number, clientY: number): Pos => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = toSvg(e.clientX, e.clientY);
      if (!drag.moved && Math.hypot(p.x - drag.startX, p.y - drag.startY) > DRAG_THRESHOLD) {
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
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  const startDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const p = toSvg(e.clientX, e.clientY);
    const cur = positions[id] ?? { x: W / 2, y: H / 2 };
    dragRef.current = { id, dx: p.x - cur.x, dy: p.y - cur.y, moved: false, startX: p.x, startY: p.y };
    setSelectedEdge(null);
    setDragging(id);
  };

  // --- edge geometry ------------------------------------------------------
  const edgeGeom = useMemo(() => {
    const groups = new Map<string, { a: string; b: string; ids: string[] }>();
    for (const r of relationships) {
      const key = [resolveName(r.source), resolveName(r.target)].sort().join(' ');
      const g = groups.get(key) ?? {
        a: resolveName(r.source) < resolveName(r.target) ? resolveName(r.source) : resolveName(r.target),
        b: resolveName(r.source) < resolveName(r.target) ? resolveName(r.target) : resolveName(r.source),
        ids: [],
      };
      g.ids.push(r.id);
      groups.set(key, g);
    }
    return relationships.map((r) => {
      const src = resolveName(r.source);
      const tgt = resolveName(r.target);
      const key = [src, tgt].sort().join(' ');
      const g = groups.get(key);
      const ids = g?.ids ?? [r.id];
      const index = ids.indexOf(r.id);
      const offset = (index - (ids.length - 1) / 2) * 34;

      // Offset along the canonical pair direction (sorted source -> sorted target),
      // so parallel edges fan out identically even when their arrow directions differ.
      const ca = positions[g?.a ?? src] ?? positions[src] ?? { x: W / 2, y: H / 2 };
      const cb = positions[g?.b ?? tgt] ?? positions[tgt] ?? { x: W / 2, y: H / 2 };
      const cdx = cb.x - ca.x;
      const cdy = cb.y - ca.y;
      const clen = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
      const nx = (-cdy / clen) * offset;
      const ny = (cdx / clen) * offset;

      const a = positions[src] ?? { x: W / 2, y: H / 2 };
      const b = positions[tgt] ?? { x: W / 2, y: H / 2 };
      const ax = a.x + nx;
      const ay = a.y + ny;
      const bx = b.x + nx;
      const by = b.y + ny;

      const ux = (bx - ax) / clen;
      const uy = (by - ay) / clen;
      const s1 = NODE_R + 4;
      const s2 = NODE_R + 10;
      const t = 0.5 + (index - (ids.length - 1) / 2) * 0.14;
      return {
        id: r.id,
        ax: ax + ux * s1,
        ay: ay + uy * s1,
        bx: bx - ux * s2,
        by: by - uy * s2,
        mx: (ax + bx) / 2,
        my: (ay + by) / 2,
        lx: ax + (bx - ax) * t,
        ly: ay + (by - ay) * t,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationships, positions, characterEntries]);

  const activeEdgesFor = (id: string): Set<string> => {
    const set = new Set<string>();
    for (const r of relationships) {
      if (resolveName(r.source) === id || resolveName(r.target) === id) set.add(r.id);
    }
    return set;
  };

  const markerColors = useMemo(() => {
    const set = new Set<string>();
    for (const r of relationships) set.add(r.color || relationshipType(r.type).color);
    return [...set];
  }, [relationships]);

  const usedTypes = useMemo(() => {
    const seen = new Map<string, { count: number; color: string }>();
    for (const r of relationships) {
      const cur = seen.get(r.type) ?? { count: 0, color: r.color || relationshipType(r.type).color };
      seen.set(r.type, {
        count: cur.count + 1,
        color: cur.color || r.color || relationshipType(r.type).color,
      });
    }
    return [...seen.entries()];
  }, [relationships]);

  const hoverSet = hoverId ? activeEdgesFor(hoverId) : new Set<string>();
  const dim = hoverId !== null || selectedEdge !== null;

  return (
    <div className="map-view">
      <div className="map-toolbar">
        <p className="map-hint">
          Drag characters to rearrange · hover to trace links · click a node for details · click an edge for its
          story
        </p>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>
          ＋ Add Relationship
        </button>
      </div>

      <div className="map-container">
        <svg
          ref={svgRef}
          className="map-svg"
          viewBox={`0 0 ${W} ${H}`}
          onPointerDown={() => setSelectedEdge(null)}
        >
          <defs>
            {markerColors.map((color) => (
              <marker
                key={color}
                id={`arrow-${color.replace('#', '')}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill={color} />
              </marker>
            ))}
          </defs>

          {relationships.map((r) => {
            const g = edgeGeom.find((e) => e.id === r.id);
            if (!g) return null;
            const type = relationshipType(r.type);
            const color = r.color || type.color;
            const labelText = r.label || type.label;
            const active = hoverSet.has(r.id) || selectedEdge?.id === r.id;
            const opacity = dim && !active ? 0.14 : 1;
            return (
              <g
                key={r.id}
                className="map-edge"
                opacity={opacity}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdge(selectedEdge?.id === r.id ? null : r);
                }}
              >
                <line
                  x1={g.ax}
                  y1={g.ay}
                  x2={g.bx}
                  y2={g.by}
                  stroke={color}
                  strokeWidth={active ? 3 : 1.8}
                  strokeDasharray={type.dashed ? '6 5' : undefined}
                  markerEnd={`url(#arrow-${color.replace('#', '')})`}
                />
                <line
                  x1={g.ax}
                  y1={g.ay}
                  x2={g.bx}
                  y2={g.by}
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ cursor: 'pointer' }}
                />
                {active && (
                  <g>
                    <rect
                      x={g.lx - (labelText.length * 6.6 + 16) / 2}
                      y={g.ly - 25}
                      width={labelText.length * 6.6 + 16}
                      height={19}
                      rx={9.5}
                      fill="rgba(253, 251, 245, 0.94)"
                      stroke={color}
                      strokeOpacity={0.55}
                    />
                    <text x={g.lx} y={g.ly - 11} textAnchor="middle" className="map-edge-label" fill={color}>
                      {labelText}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {names.map((name) => {
            const pos = positions[name];
            if (!pos) return null;
            const entry = findEntry(name);
            const isChar = !!entry;
            const active = hoverId === name || (selectedEdge && (selectedEdge.source === name || selectedEdge.target === name));
            const opacity = dim && !active ? 0.3 : 1;
            return (
              <g
                key={name}
                className="map-node"
                opacity={opacity}
                style={{ cursor: isChar ? 'pointer' : 'grab' }}
                onPointerEnter={() => setHoverId(name)}
                onPointerLeave={() => setHoverId(null)}
                onPointerDown={(e) => startDrag(e, name)}
                onClick={(e) => {
                  if (dragRef.current?.moved) {
                    dragRef.current = null;
                    return;
                  }
                  dragRef.current = null;
                  e.stopPropagation();
                  if (entry) onNodeClick(entry);
                }}
              >
                {hoverId === name && <circle cx={pos.x} cy={pos.y} r={NODE_R + 7} fill="transparent" stroke="#2f6f8f" strokeWidth="1.5" strokeDasharray="3 3" />}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_R}
                  fill="#fdfbf5"
                  stroke={isChar ? '#a9781f' : '#8a8273'}
                  strokeWidth={isChar ? 2.5 : 1.5}
                  style={{ filter: active ? 'drop-shadow(0 0 6px rgba(169, 120, 31, 0.4))' : undefined }}
                />
                {!isChar && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R} fill="none" stroke="#8a8273" strokeDasharray="3 3" strokeWidth="1.2" />
                )}
                <text x={pos.x} y={pos.y + 5} textAnchor="middle" className="map-node-initial">
                  {name.charAt(0).toUpperCase()}
                </text>
                <text x={pos.x} y={pos.y + NODE_R + 18} textAnchor="middle" className="map-node-label">
                  {name}
                </text>
              </g>
            );
          })}
        </svg>

        {selectedEdge && (
          <div className="map-edge-detail">
            <div className="map-edge-detail-head">
              <span
                className="chip"
                style={{
                  color: selectedEdge.color || relationshipType(selectedEdge.type).color,
                  borderColor: `${selectedEdge.color || relationshipType(selectedEdge.type).color}55`,
                  background: `${selectedEdge.color || relationshipType(selectedEdge.type).color}14`,
                }}
              >
                {selectedEdge.label || relationshipType(selectedEdge.type).label}
              </span>
              <button
                className="modal-close"
                onClick={() => setSelectedEdge(null)}
                aria-label="Close"
                style={{ position: 'static' }}
              >
                ✕
              </button>
            </div>
            <p className="map-edge-relation">
              <strong>{selectedEdge.source}</strong> → <strong>{selectedEdge.target}</strong>
            </p>
            {selectedEdge.description && <p className="map-edge-desc">{selectedEdge.description}</p>}
            <div className="map-edge-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => onEdit(selectedEdge)}>
                ✎ Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(selectedEdge)}>
                🗑 Delete
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="map-legend">
        <span className="legend-title">Legend</span>
        {usedTypes.map(([type, info]) => {
          const t = relationshipType(type);
          const color = info.color || t.color;
          return (
            <span key={type} className="legend-item">
              <span
                className="legend-dot"
                style={{ background: color, border: t.dashed ? `2px dashed ${color}` : 'none' }}
              />
              {t.label}
              <span className="legend-count">{info.count}</span>
            </span>
          );
        })}
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'transparent', border: '2px solid #a9781f' }} />
          Character
        </span>
      </div>
    </div>
  );
}

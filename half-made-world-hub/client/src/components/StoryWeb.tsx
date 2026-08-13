import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entry, Relationship, StoryLink } from '../types';
import { relationshipType } from '../relationshipTypes';
import { storyLinkType } from '../storyLinkTypes';
import { findCharacter } from '../nameMatch';
import { categoryColor } from '../theme';

const W = 1500;
const H = 900;
const NODE_R = 24;
const DRAG_THRESHOLD = 4;
const PICKER_KEY = 'hmw-web-hidden-categories';
const CATEGORY_ORDER = [
  'Realms',
  'Locations',
  'Monsters',
  'Beings',
  'Angels',
  'Demons',
  'Humans',
  'Magic Systems',
  'Rules & Notes',
  'Classes',
  'Items',
  'Hidden Realm',
  'Artifacts',
  'Artifact Skills',
  'Characters',
  'Character Forms',
  'Angel Skills',
  'Demon Skills',
  'Plot',
  'Other',
];

interface Pos {
  x: number;
  y: number;
}
type Positions = Record<string, Pos>;

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function boxesIntersect(a: Box, b: Box): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

interface WebEdge {
  id: string;
  kind: 'story' | 'relationship';
  source: string;
  target: string;
  type: string;
  label: string;
  description: string;
  color: string;
  dashed: boolean;
}

interface Geom {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  mx: number;
  my: number;
}

interface StoryWebProps {
  entries: Entry[];
  relationships: Relationship[];
  storyLinks: StoryLink[];
  onNodeClick: (entry: Entry) => void;
  onAdd: () => void;
  onEditStory: (link: StoryLink) => void;
  onDeleteStory: (link: StoryLink) => void;
  onEditRel: (rel: Relationship) => void;
  onDeleteRel: (rel: Relationship) => void;
}

function forceLayout(names: string[], edges: { source: string; target: string }[], seed?: Positions): Positions {
  const nodes = names.map((name, i) => {
    const prev = seed?.[name];
    const angle = (i / names.length) * Math.PI * 2;
    return {
      name,
      x: prev ? prev.x + (Math.random() - 0.5) * 14 : W / 2 + Math.cos(angle) * (W * 0.34),
      y: prev ? prev.y + (Math.random() - 0.5) * 14 : H / 2 + Math.sin(angle) * (H * 0.34),
      vx: 0,
      vy: 0,
    };
  });
  const byName = new Map(nodes.map((n) => [n.name, n]));

  for (let iter = 0; iter < 340; iter += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          dx = (Math.random() - 0.5) * 6;
          dy = (Math.random() - 0.5) * 6;
          d2 = 6;
        }
        const d = Math.sqrt(d2);
        const force = 105000 / (d2 + 2600);
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
      const force = (d - 165) * 0.03;
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
      n.vx *= 0.8;
      n.vy *= 0.8;
      const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (speed > 12) {
        n.vx = (n.vx / speed) * 12;
        n.vy = (n.vy / speed) * 12;
      }
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(80, Math.min(W - 80, n.x));
      n.y = Math.max(70, Math.min(H - 70, n.y));
    }
  }

  // De-overlap pass: nodes can pile up on the exact same pixel at the canvas
  // edges (the clamp above), which makes arrows from those coincident nodes to a
  // shared neighbor render on top of each other. Push every pair apart to a
  // minimum distance, re-clamping each round so corner pile-ups resolve.
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
      n.x = Math.max(80, Math.min(W - 80, n.x));
      n.y = Math.max(70, Math.min(H - 70, n.y));
    }
    if (!moved) break;
  }

  // Angular de-overlap: when several nodes connect to the same neighbor from
  // nearly the same direction, their arrows would render on top of each other.
  // Push such neighbor pairs apart along the bisector so the fan opens up.
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
      n.x = Math.max(80, Math.min(W - 80, n.x));
      n.y = Math.max(70, Math.min(H - 70, n.y));
    }
    if (!moved) break;
  }

  const out: Positions = {};
  for (const n of nodes) out[n.name] = { x: n.x, y: n.y };
  return out;
}

function truncate(name: string, max = 22): string {
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
  } catch {
    /* ignore */
  }
  return new Set();
}

export function StoryWeb({
  entries,
  relationships,
  storyLinks,
  onNodeClick,
  onAdd,
  onEditStory,
  onDeleteStory,
  onEditRel,
  onDeleteRel,
}: StoryWebProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean; startX: number; startY: number } | null>(null);
  const positionsRef = useRef<Positions>({});

  const [positions, setPositions] = useState<Positions>({});
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
    for (const e of entries) {
      nodeMap.set(e.name, e.category === 'Characters' ? 'Characters' : e.category);
    }

    const rawEdges: WebEdge[] = [];
    for (const s of storyLinks) {
      const type = storyLinkType(s.type);
      rawEdges.push({
        id: s.id,
        kind: 'story',
        source: resolve(s.source),
        target: resolve(s.target),
        type: s.type,
        label: s.label,
        description: s.description,
        color: s.color || type.color,
        dashed: !!type.dashed,
      });
    }
    for (const r of relationships) {
      const type = relationshipType(r.type);
      rawEdges.push({
        id: r.id,
        kind: 'relationship',
        source: resolve(r.source),
        target: resolve(r.target),
        type: r.type,
        label: r.label,
        description: r.description,
        color: r.color || type.color,
        dashed: !!type.dashed,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, relationships, storyLinks]);

  // ---- filtering: hidden categories + hidden (unconnected) nodes ----
  const visibleNodes = useMemo(() => {
    return nodes.filter((n) => !hiddenCategories.has(n.category) && !hiddenNodes.has(n.name));
  }, [nodes, hiddenCategories, hiddenNodes]);

  const visibleNames = useMemo(() => new Set(visibleNodes.map((n) => n.name)), [visibleNodes]);

  const visibleEdges = useMemo(
    () => edges.filter((e) => visibleNames.has(e.source) && visibleNames.has(e.target)),
    [edges, visibleNames],
  );

  // ---- focus mode: neighborhood around the focused node (ignores category filters) ----
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
          if (other && !set.has(other)) {
            set.add(other);
            next.push(other);
          }
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
    [edges, displayNames],
  );

  const layoutEdges = useMemo(
    () => displayEdges.map((e) => ({ source: e.source, target: e.target })),
    [displayEdges],
  );

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    setPositions(forceLayout([...displayNames], layoutEdges, positionsRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayEdges]);

  // Clear the edge card when links change (e.g. after an edit).
  useEffect(() => {
    setSelectedEdge(null);
  }, [relationships, storyLinks]);

  // Persist the user's category selection across reloads.
  useEffect(() => {
    try {
      localStorage.setItem(PICKER_KEY, JSON.stringify([...hiddenCategories]));
    } catch {
      /* ignore */
    }
  }, [hiddenCategories]);

  // On first paint, hide nodes that have no links at all — they're not part of any connection.
  useEffect(() => {
    if (initDone) return;
    setInitDone(true);
    const linked = new Set<string>();
    for (const e of edges) {
      linked.add(e.source);
      linked.add(e.target);
    }
    const isolated = nodes.filter((n) => !linked.has(n.name)).map((n) => n.name);
    if (isolated.length) setHiddenNodes(new Set(isolated));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, nodes]);

  // Escape exits focus mode.
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusNode(null);
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode]);

  // Drop focus if the node no longer exists (e.g. deleted).
  useEffect(() => {
    if (focusNode && !nodes.some((n) => n.name === focusNode)) setFocusNode(null);
  }, [nodes, focusNode]);

  // ---- dragging ----
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

  // ---- edge geometry ----
  const edgeGeom = useMemo(() => {
    const groups = new Map<string, { a: string; b: string; ids: string[] }>();
    for (const e of displayEdges) {
      const key = [e.source, e.target].sort().join(' ');
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
      const key = [e.source, e.target].sort().join(' ');
      const g = groups.get(key);
      const ids = g?.ids ?? [e.id];
      const index = ids.indexOf(e.id);
      const offset = (index - (ids.length - 1) / 2) * 30;

      // Offset along the canonical pair direction (sorted source -> sorted target),
      // so parallel edges fan out identically even when their arrow directions differ.
      const ca = positions[g?.a ?? e.source] ?? positions[e.source] ?? { x: W / 2, y: H / 2 };
      const cb = positions[g?.b ?? e.target] ?? positions[e.target] ?? { x: W / 2, y: H / 2 };
      const cdx = cb.x - ca.x;
      const cdy = cb.y - ca.y;
      const clen = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
      const nx = (-cdy / clen) * offset;
      const ny = (cdx / clen) * offset;

      const a = positions[e.source] ?? { x: W / 2, y: H / 2 };
      const b = positions[e.target] ?? { x: W / 2, y: H / 2 };
      const ax = a.x + nx;
      const ay = a.y + ny;
      const bx = b.x + nx;
      const by = b.y + ny;

      const ux = (bx - ax) / clen;
      const uy = (by - ay) / clen;
      const s1 = NODE_R + 4;
      const s2 = NODE_R + 10;
      map.set(e.id, {
        ax: ax + ux * s1,
        ay: ay + uy * s1,
        bx: bx - ux * s2,
        by: by - uy * s2,
        mx: (ax + bx) / 2,
        my: (ay + by) / 2,
      });
    }
    return map;
  }, [displayEdges, positions]);

  const activeEdgesFor = (id: string): Set<string> => {
    const set = new Set<string>();
    for (const e of displayEdges) {
      if (e.source === id || e.target === id) set.add(e.id);
    }
    return set;
  };

  // Which edges get a label right now: selected edge > hovered edge > all edges of a hovered node.
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

  // ---- collision-resolved label placement ----
  const edgeLabels = useMemo(() => {
    const out = new Map<string, { x: number; y: number }>();
    const placed: Box[] = [];
    const pillBox = (x: number, y: number, w: number): Box => ({
      x1: x - w / 2,
      y1: y - 26,
      x2: x + w / 2,
      y2: y - 6,
    });

    for (const e of displayEdges) {
      if (!activeEdgeIds.has(e.id)) continue;
      if (typeFilter && edgeLabelText(e) !== typeFilter) continue;
      const g = edgeGeom.get(e.id);
      if (!g) continue;
      const text = edgeLabelText(e);
      const w = text.length * 6.6 + 18;

      // Candidate spots: along the edge + slightly above/below the line.
      const spots: { x: number; y: number }[] = [];
      for (const t of [0.5, 0.34, 0.66, 0.22, 0.78]) {
        const px = g.ax + (g.bx - g.ax) * t;
        const py = g.ay + (g.by - g.ay) * t;
        spots.push({ x: px, y: py - 24 });
        spots.push({ x: px, y: py + 12 });
      }
      const chosen = spots.find((s) => !placed.some((p) => boxesIntersect(p, pillBox(s.x, s.y, w)))) ?? spots[0];
      out.set(e.id, chosen);
      placed.push(pillBox(chosen.x, chosen.y, w));
    }
    return out;
  }, [displayEdges, activeEdgeIds, edgeGeom, typeFilter]);

  // Node-name labels: keep the ones that fit; drop colliding ones (shown again on hover).
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
    const placed: Box[] = [];
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
      const w = label.length * 6.5 + 6;
      const box: Box = { x1: pos.x - w / 2, y1: pos.y + NODE_R + 6, x2: pos.x + w / 2, y2: pos.y + NODE_R + 24 };
      if (!placed.some((p) => boxesIntersect(p, box))) {
        shown.add(n.name);
        placed.push(box);
      }
    }
    if (hoverId) shown.add(hoverId);
    if (focusMode && focusNode) shown.add(focusNode);
    return shown;
  }, [displayNodes, positions, degree, hoverId, focusMode, focusNode]);

  const markerColors = useMemo(() => {
    const set = new Set<string>();
    for (const e of displayEdges) set.add(e.color);
    return [...set];
  }, [displayEdges]);

  // When a legend type filter is active, only the matching edges stay bright.
  const filteredNodeSet = useMemo(() => {
    if (!typeFilter) return null;
    const set = new Set<string>();
    for (const e of displayEdges) {
      if (edgeLabelText(e) === typeFilter) {
        set.add(e.source);
        set.add(e.target);
      }
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
    // Include categories that aren't in the canonical order (e.g. user-created
    // categories like "Clan") so they show up in the filter chips and picker.
    const extra = [...set].filter((c) => !CATEGORY_ORDER.includes(c)).sort((a, b) => a.localeCompare(b));
    return [...known, ...extra];
  }, [nodes]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of nodes) map.set(n.category, (map.get(n.category) ?? 0) + 1);
    return map;
  }, [nodes]);

  // Drop persisted categories that no longer exist in the archive (renamed/deleted).
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

  // A manual category choice means the user is curating the view. Revealing a category brings
  // its isolated nodes back too; hiding one should not undo the first-paint declutter.
  const toggleCategory = (cat: string) => {
    if (hiddenCategories.has(cat)) setHiddenNodes(new Set());
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
    setSelectedEdge(null);
  };

  const showOnly = (cat: string) => {
    setHiddenCategories(new Set(presentCategories.filter((c) => c !== cat)));
    setHiddenNodes(new Set());
    setSelectedEdge(null);
  };

  const showAll = () => {
    setHiddenCategories(new Set());
    setHiddenNodes(new Set());
    setSelectedEdge(null);
  };

  const hideAll = () => {
    setHiddenCategories(new Set(presentCategories));
    setHiddenNodes(new Set());
    setSelectedEdge(null);
  };

  const toggleFocusMode = () => {
    setFocusMode((m) => !m);
    setFocusNode(null);
    setSelectedEdge(null);
  };

  const dim = hoverId !== null || hoverEdge !== null || selectedEdge !== null;

  const selectedStory =
    selectedEdge?.kind === 'story' ? storyLinks.find((s) => s.id === selectedEdge.id) : undefined;
  const selectedRel =
    selectedEdge?.kind === 'relationship' ? relationships.find((r) => r.id === selectedEdge.id) : undefined;

  return (
    <div className="map-view">
      <div className="map-toolbar">
        <p className="map-hint">
          The whole story web — {displayNodes.length} nodes · {displayEdges.length} links. Drag to
          rearrange · hover to trace · click a node for its entry · click a link for its story ·
          use ◎ Focus mode to explore a character's neighborhood
        </p>
        <button
          className={`btn btn-sm ${focusMode ? 'btn-primary' : 'btn-secondary'}`}
          onClick={toggleFocusMode}
          title="Focus mode — click a node to explore only its connections"
        >
          ◎ Focus mode
        </button>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>
          ＋ Add Link
        </button>
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
              title={
                hidden
                  ? `${cat} — hidden, click to show · double-click to show only this`
                  : `${cat} — visible, click to hide · double-click to show only this`
              }
            >
              <span className="filter-dot" />
              {cat}
              <span className="chip-count">{count}</span>
            </button>
          );
        })}
        {(hiddenCategories.size > 0 || hiddenNodes.size > 0) && (
          <button className="filter-chip reset" onClick={showAll}>
            Show all
          </button>
        )}
      </div>

      {pickerOpen && (
        <div className="web-picker">
          <div className="web-picker-head">
            <span className="legend-title">Show categories as nodes</span>
            <div className="web-picker-actions">
              <button className="btn btn-secondary btn-xs" onClick={showAll}>
                Show all
              </button>
              <button className="btn btn-secondary btn-xs" onClick={hideAll}>
                Hide all
              </button>
            </div>
          </div>
          <div className="web-picker-grid">
            {presentCategories.map((cat) => {
              const visible = !hiddenCategories.has(cat);
              const count = categoryCounts.get(cat) ?? 0;
              return (
                <label key={cat} className={`web-picker-opt${visible ? ' on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() => toggleCategory(cat)}
                  />
                  <span className="filter-dot" style={{ background: categoryColor(cat) }} />
                  {cat}
                  <span className="chip-count">{count}</span>
                </label>
              );
            })}
          </div>
          <p className="web-picker-note">
            Your selection is remembered between visits. Double-click a chip to show only that
            category.
          </p>
        </div>
      )}

      {typeFilter && filteredEdgesCount === 0 && (
        <div className="focus-bar idle">
          <span>No “{typeFilter}” links are visible right now — clear the filter</span>
          <button className="btn btn-secondary btn-xs" onClick={() => setTypeFilter(null)}>
            ✕ Clear filter
          </button>
        </div>
      )}

      {focusMode && focusNode && (
        <div className="focus-bar">
          <span className="focus-bar-name">
            ◎ Focus: <strong>{focusNode}</strong>
          </span>
          <span className="focus-bar-depth">
            <button
              className={focusDepth === 1 ? 'on' : ''}
              onClick={() => setFocusDepth(1)}
              title="Show direct connections only"
            >
              1 hop
            </button>
            <button
              className={focusDepth === 2 ? 'on' : ''}
              onClick={() => setFocusDepth(2)}
              title="Show connections of connections too"
            >
              2 hops
            </button>
          </span>
          <span className="focus-bar-count">
            {focusSet.size} nodes · {displayEdges.length} links
          </span>
          <button className="btn btn-secondary btn-xs" onClick={() => setFocusNode(null)}>
            ✕ Exit focus
          </button>
        </div>
      )}
      {focusMode && !focusNode && (
        <div className="focus-bar idle">
          <span>
            ◎ Focus mode — <strong>click any node</strong> to explore its connections · category
            filters are paused while focused · Esc to exit
          </span>
          <button className="btn btn-secondary btn-xs" onClick={toggleFocusMode}>
            ✕ Exit
          </button>
        </div>
      )}

      <div className="map-container web-container">
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
                id={`warrow-${color.replace('#', '')}`}
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

          {displayEdges.map((e) => {
            const g = edgeGeom.get(e.id);
            if (!g) return null;
            const isActiveEdge = activeEdgeIds.has(e.id);
            const active = isActiveEdge || (hoverId && (e.source === hoverId || e.target === hoverId));
            const matchesFilter = typeFilter ? edgeLabelText(e) === typeFilter : true;
            const opacity = typeFilter
              ? matchesFilter
                ? dim && !active
                  ? 0.4
                  : 1
                : active
                  ? 0.3
                  : 0.05
              : dim && !active
                ? 0.1
                : 1;
            const lp = edgeLabels.get(e.id);
            return (
              <g
                key={`${e.kind}-${e.id}`}
                className="map-edge"
                opacity={opacity}
                onPointerEnter={() => setHoverEdge(e.id)}
                onPointerLeave={() => setHoverEdge(null)}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setSelectedEdge(selectedEdge?.id === e.id ? null : e);
                }}
              >
                <line
                  x1={g.ax}
                  y1={g.ay}
                  x2={g.bx}
                  y2={g.by}
                  stroke={e.color}
                  strokeWidth={active ? 2.8 : typeFilter && matchesFilter ? 2.2 : 1.4}
                  strokeDasharray={e.dashed ? '6 5' : undefined}
                  markerEnd={`url(#warrow-${e.color.replace('#', '')})`}
                />
                <line
                  x1={g.ax}
                  y1={g.ay}
                  x2={g.bx}
                  y2={g.by}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: 'pointer' }}
                />
                {isActiveEdge && lp && (() => {
                  const text = edgeLabelText(e);
                  const w = text.length * 6.6 + 18;
                  return (
                    <g pointerEvents="none">
                      <rect
                        x={lp.x - w / 2}
                        y={lp.y - 26}
                        width={w}
                        height={20}
                        rx={10}
                        fill="rgba(253, 251, 245, 0.95)"
                        stroke={e.color}
                        strokeOpacity={0.6}
                      />
                      <text x={lp.x} y={lp.y - 12} textAnchor="middle" className="map-edge-label" fill={e.color}>
                        {text}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {displayNodes.map((node) => {
            const pos = positions[node.name];
            if (!pos) return null;
            const isChar = node.category === 'Characters';
            const isOther = node.category === 'Other';
            const entry = entryByName.get(node.name.toLowerCase());
            const isFocused = focusMode && focusNode === node.name;
            const active = hoverId === node.name || isFocused || (selectedEdge && (selectedEdge.source === node.name || selectedEdge.target === node.name));
            const filteredOut = typeFilter ? !(filteredNodeSet?.has(node.name) ?? false) : false;
            const opacity = typeFilter
              ? filteredOut
                ? 0.15
                : dim && !active
                  ? 0.4
                  : 1
              : dim && !active
                ? 0.25
                : 1;
            const stroke = isOther ? '#8a8273' : categoryColor(node.category);
            const fill = isOther ? '#fdfbf5' : `${stroke}2b`;
            return (
              <g
                key={node.name}
                className="map-node"
                opacity={opacity}
                style={{ cursor: focusMode ? 'pointer' : entry ? 'pointer' : 'grab' }}
                onPointerEnter={() => setHoverId(node.name)}
                onPointerLeave={() => setHoverId(null)}
                onPointerDown={(e) => startDrag(e, node.name)}
                onClick={(e) => {
                  if (dragRef.current?.moved) {
                    dragRef.current = null;
                    return;
                  }
                  dragRef.current = null;
                  e.stopPropagation();
                  if (focusMode) {
                    setFocusNode(node.name);
                    setSelectedEdge(null);
                    return;
                  }
                  if (entry) onNodeClick(entry);
                }}
              >
                {hoverId === node.name && !isFocused && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R + 7} fill="transparent" stroke={stroke} strokeWidth="1.5" strokeDasharray="3 3" />
                )}
                {isFocused && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R + 10} fill="transparent" stroke={stroke} strokeWidth="2" opacity="0.9" />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_R}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isFocused ? 3 : isChar ? 2.5 : isOther ? 1.5 : 2}
                  strokeDasharray={isOther ? '3 3' : undefined}
                  style={{ filter: active ? `drop-shadow(0 0 7px ${stroke}88)` : undefined }}
                />
                <text x={pos.x} y={pos.y + 5} textAnchor="middle" className="map-node-initial" fill={isOther ? '#6f6a5e' : stroke}>
                  {node.name.charAt(0).toUpperCase()}
                </text>
                {nodeLabels.has(node.name) && (
                  <text x={pos.x} y={pos.y + NODE_R + 19} textAnchor="middle" className="map-node-label">
                    {truncate(node.name)}
                  </text>
                )}
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
                  color: selectedEdge.color,
                  borderColor: `${selectedEdge.color}55`,
                  background: `${selectedEdge.color}14`,
                }}
              >
                {edgeLabelText(selectedEdge)}
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
              {selectedEdge.kind === 'story' ? (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => selectedStory && onEditStory(selectedStory)}>
                    ✎ Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => selectedStory && onDeleteStory(selectedStory)}>
                    🗑 Delete
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => selectedRel && onEditRel(selectedRel)}>
                    ✎ Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => selectedRel && onDeleteRel(selectedRel)}>
                    🗑 Delete
                  </button>
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
            title={typeFilter === label ? 'Click to show all link types' : `Highlight only “${label}” links`}
          >
            <span className="legend-dot" style={{ background: info.color }} />
            {label}
            <span className="legend-count">{info.count}</span>
          </button>
        ))}
        {typeFilter && (
          <button
            className="legend-item legend-filter-btn all"
            onClick={() => setTypeFilter(null)}
            title="Show all link types"
          >
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

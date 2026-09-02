import { useMemo, useState, useRef, useCallback } from 'react';
import type { GraphNode, GraphEdge } from './Graph3D';

interface Graph2DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
}

interface Pos2D { x: number; y: number; }

/* ── 2D Force-directed layout ── */

function forceLayout2D(nodes: GraphNode[], edges: GraphEdge[]): Record<string, Pos2D> {
  const n = nodes.length;
  if (n === 0) return {};

  const positions: Pos2D[] = nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / n;
    const r = Math.sqrt(n) * 50;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });

  const vel: Pos2D[] = nodes.map(() => ({ x: 0, y: 0 }));
  const byId = new Map(nodes.map((nd, i) => [nd.id, i]));

  const repulsion = 4000 / (n + 5);
  const attraction = 0.004;
  const damping = 0.8;
  const centerPull = 0.003;
  const iterations = Math.min(250, 80 + n * 3);

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = positions[i].x - positions[j].x;
        let dy = positions[i].y - positions[j].y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 3; }
        const d = Math.sqrt(d2);
        const f = repulsion / d2;
        vel[i].x += (dx / d) * f; vel[i].y += (dy / d) * f;
        vel[j].x -= (dx / d) * f; vel[j].y -= (dy / d) * f;
      }
    }
    for (const edge of edges) {
      const ai = byId.get(edge.source);
      const bi = byId.get(edge.target);
      if (ai === undefined || bi === undefined) continue;
      const dx = positions[bi].x - positions[ai].x;
      const dy = positions[bi].y - positions[ai].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 60) * attraction;
      vel[ai].x += (dx / d) * f; vel[ai].y += (dy / d) * f;
      vel[bi].x -= (dx / d) * f; vel[bi].y -= (dy / d) * f;
    }
    for (let i = 0; i < n; i++) {
      vel[i].x -= positions[i].x * centerPull;
      vel[i].y -= positions[i].y * centerPull;
    }
    for (let i = 0; i < n; i++) {
      vel[i].x *= damping; vel[i].y *= damping;
      const speed = Math.sqrt(vel[i].x ** 2 + vel[i].y ** 2);
      const maxSpeed = 6;
      if (speed > maxSpeed) { vel[i].x *= maxSpeed / speed; vel[i].y *= maxSpeed / speed; }
      positions[i].x += vel[i].x;
      positions[i].y += vel[i].y;
    }
  }

  const result: Record<string, Pos2D> = {};
  for (let i = 0; i < n; i++) result[nodes[i].id] = positions[i];
  return result;
}

/* ── SVG node ── */

function Node2D({
  node, pos, isHovered, isConnected, dimmed, onClick, onHover, onUnhover, onDragStart,
}: {
  node: GraphNode; pos: Pos2D; isHovered: boolean; isConnected: boolean;
  dimmed: boolean; onClick: () => void; onHover: () => void; onUnhover: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const r = (node.size ?? 1) * 4;
  const opacity = dimmed ? 0.08 : 1;

  return (
    <g
      style={{ cursor: 'grab', opacity, transition: 'opacity 0.2s' }}
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
      onMouseDown={(e) => { e.stopPropagation(); onDragStart(e); }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {isHovered && (
        <circle cx={pos.x} cy={pos.y} r={r + 3} fill="none" stroke={node.color} strokeWidth={1} opacity={0.35} />
      )}
      <circle
        cx={pos.x} cy={pos.y} r={r}
        fill={isHovered ? node.color : `${node.color}55`}
        stroke={node.color}
        strokeWidth={isHovered ? 1.2 : 0.7}
      />
      {/* Small always-visible label */}
      <text
        x={pos.x}
        y={pos.y - r - 2}
        textAnchor="middle"
        fill={dimmed ? '#555' : '#c8b896'}
        fontSize={2.5}
        fontWeight={isHovered ? 700 : 400}
        fontFamily="'JetBrains Mono', monospace"
        style={{ pointerEvents: 'none' }}
      >
        {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
      </text>
    </g>
  );
}

/* ── SVG edge ── */

function Edge2D({
  edge, from, to, dimmed, hovered, onHover, onUnhover, onClick,
}: {
  edge: GraphEdge; from: Pos2D; to: Pos2D; dimmed: boolean; hovered: boolean;
  onHover: () => void; onUnhover: () => void; onClick: () => void;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const curvature = 0.12;
  const mx = (from.x + to.x) / 2 + (-dy / dist) * dist * curvature;
  const my = (from.y + to.y) / 2 + (dx / dist) * dist * curvature;
  const path = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  const opacity = dimmed ? 0.03 : hovered ? 0.7 : 0.18;

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <path d={path} fill="none" stroke="transparent" strokeWidth={6} />
      <path
        d={path} fill="none" stroke={edge.color}
        strokeWidth={hovered ? 1 : 0.5}
        strokeDasharray={edge.dashed ? '2 2' : undefined}
        opacity={opacity}
      />
      {hovered && !dimmed && edge.label && (
        <g pointerEvents="none">
          <rect
            x={mx - edge.label.length * 0.9 - 1}
            y={my - 5}
            width={edge.label.length * 1.8 + 2}
            height={4.5}
            rx={1.5}
            fill="rgba(8,10,16,0.92)"
            stroke={edge.color}
            strokeWidth={0.3}
            strokeOpacity={0.3}
          />
          <text x={mx} y={my - 2.5} textAnchor="middle"
            fill={edge.color} fontSize={2.8} fontWeight={600}
            fontFamily="'JetBrains Mono', monospace">
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
}

/* ── Main ── */

export function Graph2D({ nodes, edges, onNodeClick, onEdgeClick }: Graph2DProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Pos2D>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const layoutPos = useMemo(() => forceLayout2D(nodes, edges), [nodes, edges]);

  // Merge layout positions with any drag overrides
  const posMap = useMemo(() => {
    const merged = { ...layoutPos };
    for (const [id, p] of Object.entries(positions)) merged[id] = p;
    return merged;
  }, [layoutPos, positions]);

  const connectedIds = useMemo(() => {
    const set = new Set<string>();
    if (!hoveredNode) return set;
    for (const e of edges) {
      if (e.source === hoveredNode) set.add(e.target);
      if (e.target === hoveredNode) set.add(e.source);
    }
    return set;
  }, [hoveredNode, edges]);

  // Convert screen coords to SVG coords
  const toSvg = useCallback((clientX: number, clientY: number): Pos2D => {
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

  const handleDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    const p = posMap[nodeId];
    if (!p) return;
    dragRef.current = { id: nodeId, startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y };
    setHoveredNode(null);
  }, [posMap]);

  // Global mouse move/up for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const svgPt = toSvg(e.clientX, e.clientY);
    const origSvg = toSvg(drag.startX, drag.startY);
    const dx = svgPt.x - origSvg.x;
    const dy = svgPt.y - origSvg.y;
    setPositions((prev) => ({
      ...prev,
      [drag.id]: { x: drag.origX + dx, y: drag.origY + dy },
    }));
  }, [toSvg]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const viewBox = useMemo(() => {
    const allPos = Object.values(posMap);
    if (allPos.length === 0) return '-300 -300 600 600';
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of allPos) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    const pad = 60;
    const size = Math.max(maxX - minX + pad * 2, maxY - minY + pad * 2);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return `${cx - size / 2} ${cy - size / 2} ${size} ${size}`;
  }, [posMap]);

  const dimmed = hoveredNode !== null || hoveredEdge !== null;

  return (
    <div className="graph2d-container">
      <svg
        ref={svgRef}
        className="graph2d-svg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {edges.map((e) => {
          const from = posMap[e.source], to = posMap[e.target];
          if (!from || !to) return null;
          const isHovered = hoveredEdge === e.id;
          const isDimmed = dimmed && !isHovered && hoveredNode && e.source !== hoveredNode && e.target !== hoveredNode;
          return (
            <Edge2D key={e.id} edge={e} from={from} to={to} dimmed={!!isDimmed} hovered={isHovered}
              onHover={() => setHoveredEdge(e.id)} onUnhover={() => setHoveredEdge(null)}
              onClick={() => onEdgeClick?.(e.id)} />
          );
        })}
        {nodes.map((n) => {
          const pos = posMap[n.id];
          if (!pos) return null;
          const isHovered = hoveredNode === n.id;
          const isConnected = connectedIds.has(n.id);
          return (
            <Node2D key={n.id} node={n} pos={pos} isHovered={isHovered} isConnected={isConnected}
              dimmed={dimmed && !isHovered && !isConnected}
              onClick={() => onNodeClick?.(n.id)}
              onHover={() => setHoveredNode(n.id)} onUnhover={() => setHoveredNode(null)}
              onDragStart={(e) => handleDragStart(n.id, e)} />
          );
        })}
      </svg>
    </div>
  );
}

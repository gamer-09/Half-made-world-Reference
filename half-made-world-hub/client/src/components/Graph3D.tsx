import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

/* ── Public types ── */

export interface GraphNode {
  id: string;
  label: string;
  color: string;
  size?: number;       // radius multiplier (default 1)
  category?: string;   // for filtering / legend
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  label: string;
  dashed?: boolean;
}

interface Graph3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onEdgeClick?: (edgeId: string) => void;
  /** Pre-computed positions — skips force layout when provided */
  initialPositions?: Record<string, [number, number, number]>;
}

/* ── 3D Force-directed layout (runs once on mount) ── */

function forceLayout3D(nodes: GraphNode[], edges: GraphEdge[]): Record<string, [number, number, number]> {
  const n = nodes.length;
  if (n === 0) return {};

  // Initialise on a sphere surface
  const positions: [number, number, number][] = nodes.map((_, i) => {
    const phi = Math.acos(1 - 2 * (i + 0.5) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = Math.cbrt(n) * 2.5;
    return [Math.cos(theta) * Math.sin(phi) * r, Math.cos(phi) * r, Math.sin(theta) * Math.sin(phi) * r];
  });

  const vel: [number, number, number][] = nodes.map(() => [0, 0, 0]);
  const byId = new Map(nodes.map((nd, i) => [nd.id, i]));

  const repulsion = 80 / (n + 5);
  const attraction = 0.015;
  const damping = 0.88;
  const centerPull = 0.006;
  const iterations = Math.min(200, 60 + n * 2);

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion (all pairs)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = positions[i][0] - positions[j][0];
        let dy = positions[i][1] - positions[j][1];
        let dz = positions[i][2] - positions[j][2];
        let d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dz = Math.random() - 0.5; d2 = 3; }
        const d = Math.sqrt(d2);
        const f = repulsion / d2;
        const fx = (dx / d) * f; const fy = (dy / d) * f; const fz = (dz / d) * f;
        vel[i][0] += fx; vel[i][1] += fy; vel[i][2] += fz;
        vel[j][0] -= fx; vel[j][1] -= fy; vel[j][2] -= fz;
      }
    }

    // Attraction (edges)
    for (const edge of edges) {
      const ai = byId.get(edge.source);
      const bi = byId.get(edge.target);
      if (ai === undefined || bi === undefined) continue;
      const dx = positions[bi][0] - positions[ai][0];
      const dy = positions[bi][1] - positions[ai][1];
      const dz = positions[bi][2] - positions[ai][2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const f = (d - 6) * attraction;
      const fx = (dx / d) * f; const fy = (dy / d) * f; const fz = (dz / d) * f;
      vel[ai][0] += fx; vel[ai][1] += fy; vel[ai][2] += fz;
      vel[bi][0] -= fx; vel[bi][1] -= fy; vel[bi][2] -= fz;
    }

    // Center pull
    for (let i = 0; i < n; i++) {
      vel[i][0] -= positions[i][0] * centerPull;
      vel[i][1] -= positions[i][1] * centerPull;
      vel[i][2] -= positions[i][2] * centerPull;
    }

    // Apply velocities
    for (let i = 0; i < n; i++) {
      vel[i][0] *= damping; vel[i][1] *= damping; vel[i][2] *= damping;
      const speed = Math.sqrt(vel[i][0] ** 2 + vel[i][1] ** 2 + vel[i][2] ** 2);
      const maxSpeed = 2.5;
      if (speed > maxSpeed) { vel[i][0] *= maxSpeed / speed; vel[i][1] *= maxSpeed / speed; vel[i][2] *= maxSpeed / speed; }
      positions[i][0] += vel[i][0]; positions[i][1] += vel[i][1]; positions[i][2] += vel[i][2];
    }
  }

  const result: Record<string, [number, number, number]> = {};
  for (let i = 0; i < n; i++) result[nodes[i].id] = positions[i];
  return result;
}

/* ── 3D Node sphere ── */

function GraphNode3D({
  node, pos, isHovered, isConnected, dimmed, onClick, onHover, onUnhover,
}: {
  node: GraphNode; pos: [number, number, number]; isHovered: boolean;
  isConnected: boolean; dimmed: boolean;
  onClick: () => void; onHover: () => void; onUnhover: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scale = node.size ?? 1;
  const baseR = 0.35 * scale;

  useFrame(() => {
    if (!meshRef.current) return;
    const target = isHovered ? 1.3 : 1;
    const s = meshRef.current.scale;
    s.x += (target - s.x) * 0.12; s.y += (target - s.y) * 0.12; s.z += (target - s.z) * 0.12;
  });

  const color = new THREE.Color(node.color);
  const emissive = isHovered || isConnected ? 0.6 : 0.15;
  const opacity = dimmed ? 0.12 : 1;

  return (
    <group position={pos}>
      {/* Invisible larger hit area */}
      <mesh
        onPointerEnter={(e: any) => { e.stopPropagation(); onHover(); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={(e: any) => { e.stopPropagation(); onUnhover(); document.body.style.cursor = ''; }}
        onClick={(e: any) => { e.stopPropagation(); onClick(); }}
      >
        <sphereGeometry args={[baseR * 2.2, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {/* Visible sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[baseR, 16, 16]} />
        <meshStandardMaterial
          color={isHovered ? '#ffffff' : color}
          emissive={color}
          emissiveIntensity={emissive}
          transparent
          opacity={opacity}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      {/* Glow ring on hover */}
      {(isHovered || isConnected) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseR * 1.2, baseR * 1.8, 16]} />
          <meshBasicMaterial color={node.color} transparent opacity={isHovered ? 0.4 : 0.15} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {/* Label */}
      <Billboard position={[0, baseR + 0.3, 0]}>
        <Text
          fontSize={isHovered ? 0.28 : 0.22}
          color={dimmed ? '#334155' : '#e8f1ff'}
          anchorX="center" anchorY="bottom"
          outlineWidth={0.02} outlineColor="#000"
          maxWidth={4}
        >
          {node.label}
        </Text>
      </Billboard>
    </group>
  );
}

/* ── 3D Edge (tube + glow) ── */

function GraphEdge3D({
  edge, from, to, dimmed, onHover, onUnhover, onClick,
}: {
  edge: GraphEdge; from: [number, number, number]; to: [number, number, number];
  dimmed: boolean; onHover: () => void; onUnhover: () => void; onClick: () => void;
}) {
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.5, (from[2] + to[2]) / 2,
  ];

  const curve = useMemo(() =>
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...from), new THREE.Vector3(...mid), new THREE.Vector3(...to),
    ), [from, to, mid]);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 20, 0.04, 6, false), [curve]);
  const glowGeo = useMemo(() => new THREE.TubeGeometry(curve, 20, 0.15, 6, false), [curve]);

  const phaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = Date.now() * 0.001 * 0.6 + phaseOffset;
    const pulse = Math.sin(t) * 0.5 + 0.5;
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = edge.dashed ? 0.1 + pulse * 0.05 : 0.2 + pulse * 0.5;
      mat.opacity = dimmed ? 0.05 : edge.dashed ? 0.15 + pulse * 0.05 : 0.4 + pulse * 0.3;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = dimmed ? 0.01 : edge.dashed ? 0.02 : 0.03 + pulse * 0.08;
    }
  });

  const c = new THREE.Color(edge.color);
  const dimC = c.clone().multiplyScalar(0.4);

  return (
    <group
      onPointerEnter={(e: any) => { e.stopPropagation(); onHover(); }}
      onPointerLeave={(e: any) => { e.stopPropagation(); onUnhover(); }}
      onClick={(e: any) => { e.stopPropagation(); onClick(); }}
    >
      <mesh ref={coreRef} geometry={tubeGeo}>
        <meshStandardMaterial color={dimC} emissive={edge.color} emissiveIntensity={0.2}
          transparent opacity={0.4} roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh ref={glowRef} geometry={glowGeo}>
        <meshBasicMaterial color={edge.color} transparent opacity={0.04} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* Edge label on hover */}
      {edge.label && !dimmed && (
        <Billboard position={mid}>
          <Text fontSize={0.16} color={edge.color} anchorX="center" anchorY="bottom"
            outlineWidth={0.015} outlineColor="#000">
            {edge.label}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

/* ── Scene ── */

function Scene({
  nodes, edges, posMap, hoveredNode, connectedIds, dimmed,
  onNodeClick, onNodeHover, onEdgeClick,
}: {
  nodes: GraphNode[]; edges: GraphEdge[];
  posMap: Record<string, [number, number, number]>;
  hoveredNode: string | null; connectedIds: Set<string>; dimmed: boolean;
  onNodeClick: (id: string) => void; onNodeHover: (id: string | null) => void;
  onEdgeClick: (id: string) => void;
}) {
  const edgeMap = useMemo(() => {
    const m = new Map<string, GraphEdge[]>();
    for (const e of edges) {
      const list = m.get(e.source) ?? []; list.push(e); m.set(e.source, list);
      const list2 = m.get(e.target) ?? []; list2.push(e); m.set(e.target, list2);
    }
    return m;
  }, [edges]);

  return (
    <>
      <color attach="background" args={['#04060d']} />
      <fog attach="fog" args={['#04060d', 25, 60]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 10]} intensity={1.0} color="#e8f1ff" />
      <pointLight position={[-8, 6, -8]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[0, -4, 8]} intensity={0.3} color="#22d3ee" />

      {/* Edges */}
      {edges.map((e) => {
        const from = posMap[e.source];
        const to = posMap[e.target];
        if (!from || !to) return null;
        const isDimmed = dimmed && hoveredNode && e.source !== hoveredNode && e.target !== hoveredNode;
        return (
          <GraphEdge3D key={e.id} edge={e} from={from} to={to}
            dimmed={!!isDimmed}
            onHover={() => {} } onUnhover={() => {}} onClick={() => onEdgeClick(e.id)} />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const pos = posMap[n.id];
        if (!pos) return null;
        const isHovered = hoveredNode === n.id;
        const isConnected = connectedIds.has(n.id);
        return (
          <GraphNode3D key={n.id} node={n} pos={pos} isHovered={isHovered}
            isConnected={isConnected} dimmed={dimmed && !isHovered && !isConnected}
            onClick={() => onNodeClick(n.id)}
            onHover={() => onNodeHover(n.id)} onUnhover={() => onNodeHover(null)} />
        );
      })}

      <OrbitControls enablePan enableZoom enableRotate
        minDistance={4} maxDistance={50}
        autoRotate autoRotateSpeed={0.15} />
    </>
  );
}

/* ── Main export ── */

export function Graph3D({
  nodes, edges, onNodeClick, onNodeHover, onEdgeClick, initialPositions,
}: Graph3DProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const posMap = useMemo(() => {
    if (initialPositions) return initialPositions;
    return forceLayout3D(nodes, edges);
  }, [nodes, edges, initialPositions]);

  const connectedIds = useMemo(() => {
    const set = new Set<string>();
    if (!hoveredNode) return set;
    for (const e of edges) {
      if (e.source === hoveredNode) set.add(e.target);
      if (e.target === hoveredNode) set.add(e.source);
    }
    return set;
  }, [hoveredNode, edges]);

  const dimmed = hoveredNode !== null;

  const handleNodeClick = useCallback((id: string) => {
    onNodeClick?.(id);
  }, [onNodeClick]);

  const handleNodeHover = useCallback((id: string | null) => {
    setHoveredNode(id);
    onNodeHover?.(id);
  }, [onNodeHover]);

  const handleEdgeClick = useCallback((id: string) => {
    onEdgeClick?.(id);
  }, [onEdgeClick]);

  return (
    <div className="graph3d-container">
      <Canvas
        camera={{ position: [12, 8, 12], fov: 50 }}
        style={{ background: '#04060d' }}
        gl={{ antialias: true }}
      >
        <Scene
          nodes={nodes} edges={edges} posMap={posMap}
          hoveredNode={hoveredNode} connectedIds={connectedIds} dimmed={dimmed}
          onNodeClick={handleNodeClick} onNodeHover={handleNodeHover} onEdgeClick={handleEdgeClick}
        />
      </Canvas>
    </div>
  );
}

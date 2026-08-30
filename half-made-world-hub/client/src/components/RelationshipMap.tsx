import { useMemo, useState, useCallback } from 'react';
import type { Entry, Relationship } from '../types';
import { relationshipType } from '../relationshipTypes';
import { findCharacter } from '../nameMatch';
import { Graph3D, type GraphNode, type GraphEdge } from './Graph3D';

interface MapProps {
  relationships: Relationship[];
  characterEntries: Entry[];
  onNodeClick: (entry: Entry) => void;
  onAdd: () => void;
  onEdit: (rel: Relationship) => void;
  onDelete: (rel: Relationship) => void;
}

export function RelationshipMap({
  relationships, characterEntries, onNodeClick, onAdd, onEdit, onDelete,
}: MapProps) {
  const [selectedEdge, setSelectedEdge] = useState<Relationship | null>(null);

  const resolveName = (name: string): string => {
    const exact = characterEntries.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (exact) return exact.name;
    const ch = findCharacter(characterEntries, name);
    if (ch) return ch.name;
    return name;
  };

  const findEntry = (name: string): Entry | undefined =>
    characterEntries.find((e) => e.name.toLowerCase() === name.toLowerCase()) ?? findCharacter(characterEntries, name);

  // Build graph nodes from character entries
  const graphNodes = useMemo<GraphNode[]>(() => {
    const map = new Map<string, GraphNode>();
    for (const e of characterEntries) {
      map.set(e.name, { id: e.name, label: e.name, color: '#fbbf24', size: 1 });
    }
    // Add referenced names that don't have entries
    for (const r of relationships) {
      const src = resolveName(r.source);
      const tgt = resolveName(r.target);
      if (!map.has(src)) map.set(src, { id: src, label: src, color: '#64748f', size: 0.7 });
      if (!map.has(tgt)) map.set(tgt, { id: tgt, label: tgt, color: '#64748f', size: 0.7 });
    }
    return [...map.values()];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationships, characterEntries]);

  // Build graph edges from relationships
  const graphEdges = useMemo<GraphEdge[]>(() =>
    relationships.map((r) => {
      const type = relationshipType(r.type);
      return {
        id: r.id,
        source: resolveName(r.source),
        target: resolveName(r.target),
        color: r.color || type.color,
        label: r.label || type.label,
        dashed: !!type.dashed,
      };
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [relationships, characterEntries]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const entry = findEntry(nodeId);
    if (entry) onNodeClick(entry);
  }, [onNodeClick]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    const rel = relationships.find((r) => r.id === edgeId);
    if (rel) setSelectedEdge((cur) => cur?.id === edgeId ? null : rel);
  }, [relationships]);

  const usedTypes = useMemo(() => {
    const seen = new Map<string, { count: number; color: string }>();
    for (const r of relationships) {
      const t = relationshipType(r.type);
      const color = r.color || t.color;
      const cur = seen.get(r.type) ?? { count: 0, color };
      cur.count += 1;
      seen.set(r.type, cur);
    }
    return [...seen.entries()];
  }, [relationships]);

  return (
    <div className="map-view">
      <div className="map-toolbar">
        <p className="map-hint">
          3D relationship graph — {graphNodes.length} characters · {graphEdges.length} links · drag to orbit
        </p>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>
          ＋ Add Relationship
        </button>
      </div>

      <Graph3D
        nodes={graphNodes}
        edges={graphEdges}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
      />

      {selectedEdge && (
        <div className="map-edge-detail">
          <div className="map-edge-detail-head">
            <span className="chip" style={{
              color: selectedEdge.color || relationshipType(selectedEdge.type).color,
              borderColor: `${selectedEdge.color || relationshipType(selectedEdge.type).color}55`,
              background: `${selectedEdge.color || relationshipType(selectedEdge.type).color}14`,
            }}>
              {selectedEdge.label || relationshipType(selectedEdge.type).label}
            </span>
            <button className="modal-close" onClick={() => setSelectedEdge(null)} aria-label="Close"
              style={{ position: 'static' }}>✕</button>
          </div>
          <p className="map-edge-relation">
            <strong>{selectedEdge.source}</strong> → <strong>{selectedEdge.target}</strong>
          </p>
          {selectedEdge.description && <p className="map-edge-desc">{selectedEdge.description}</p>}
          <div className="map-edge-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(selectedEdge)}>✎ Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(selectedEdge)}>🗑 Delete</button>
          </div>
        </div>
      )}

      <div className="map-legend">
        <span className="legend-title">Legend</span>
        {usedTypes.map(([type, info]) => {
          const t = relationshipType(type);
          const color = info.color || t.color;
          return (
            <span key={type} className="legend-item">
              <span className="legend-dot" style={{ background: color, border: t.dashed ? `2px dashed ${color}` : 'none' }} />
              {t.label}
              <span className="legend-count">{info.count}</span>
            </span>
          );
        })}
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'transparent', border: '2px solid #fbbf24' }} />
          Character
        </span>
      </div>
    </div>
  );
}

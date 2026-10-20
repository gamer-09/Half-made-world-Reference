import { useEffect, useMemo, useState } from 'react';
import type { Entry, Relationship, StoryLink } from '../types';
import { Graph2D } from './Graph2D';
import type { GraphNode, GraphEdge } from './Graph3D';
import { categoryColor } from '../theme';
import { storyLinkType } from '../storyLinkTypes';
import { relationshipType } from '../relationshipTypes';
import { ERAS, eraEntries, oracleTeaser, revealOracle, type Era, type OraclePick } from '../weaveEras';

interface WeaveExplorerProps {
  entries: Entry[];
  relationships: Relationship[];
  storyLinks: StoryLink[];
  onOpenEntry: (name: string) => void;
}

// Build a GraphNode/GraphEdge view of the archive. Nodes are entries; edges
// are story links (solid) and relationships (dashed). Node size grows with
// connection count so the great hubs read as bright stars.
function buildGraph(entries: Entry[], links: StoryLink[], rels: Relationship[]) {
  const entryByName = new Map(entries.map((e) => [e.name, e]));
  const degree = new Map<string, number>();

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  const addEdge = (source: string, target: string, type: string, label: string, dashed: boolean, color: string, id: string) => {
    if (!entryByName.has(source) || !entryByName.has(target) || source === target) return;
    const key = `${source}|${target}|${type}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ id, source, target, color, label, dashed });
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  };

  for (const l of links) {
    const t = storyLinkType(l.type);
    addEdge(l.source, l.target, l.type, l.label || t.label, !!t.dashed, l.color || t.color, `s-${l.id}`);
  }
  for (const r of rels) {
    const t = relationshipType(r.type);
    addEdge(r.source, r.target, r.type, r.label || t.label, !!t.dashed, r.color || t.color, `r-${r.id}`);
  }

  const nodes: GraphNode[] = entries.map((e) => ({
    id: e.name,
    label: e.name,
    color: categoryColor(e.category),
    category: e.category,
    size: 1 + Math.min(2.5, Math.sqrt(degree.get(e.name) ?? 0) * 0.4),
  }));

  return { nodes, edges };
}

export function WeaveExplorer({ entries, relationships, storyLinks, onOpenEntry }: WeaveExplorerProps) {
  const [eraId, setEraId] = useState<string>(ERAS[0].id);
  const [focusMode, setFocusMode] = useState<'era' | 'full'>('era');
  const [oracle, setOracle] = useState<OraclePick | null>(null);
  const [oracleKey, setOracleKey] = useState(0);

  const era: Era = useMemo(() => ERAS.find((e) => e.id === eraId) ?? ERAS[0], [eraId]);

  const members = useMemo(() => eraEntries(era, entries), [era, entries]);

  const { nodes, edges } = useMemo(
    () => buildGraph(entries, storyLinks, relationships),
    [entries, storyLinks, relationships],
  );

  const memberNames = useMemo(() => new Set(members.map((m) => m.name)), [members]);

  // The constellation shows the whole archive in "full" mode, or the era's
  // material plus its immediate neighbours in "era" mode.
  const { displayNodes, displayEdges } = useMemo(() => {
    if (focusMode === 'full' || memberNames.size === 0) {
      return { displayNodes: nodes, displayEdges: edges };
    }
    const keep = new Set(memberNames);
    for (const e of edges) {
      if (memberNames.has(e.source)) keep.add(e.target);
      if (memberNames.has(e.target)) keep.add(e.source);
    }
    return {
      displayNodes: nodes.filter((n) => keep.has(n.id)),
      displayEdges: edges.filter((e) => keep.has(e.source) && keep.has(e.target)),
    };
  }, [focusMode, nodes, edges, memberNames]);

  // Shuffle the oracle within the current era, avoiding an immediate repeat.
  const shuffleOracle = () => {
    setOracle(revealOracle(era, entries, storyLinks, oracle?.entry.name ?? null));
    setOracleKey((k) => k + 1);
  };

  // Give the oracle a fresh reading whenever the era changes.
  useEffect(() => {
    setOracle(revealOracle(era, entries, storyLinks, null));
    setOracleKey((k) => k + 1);
  }, [era, entries, storyLinks]);

  const openOracle = () => {
    if (!oracle) return;
    if (entries.some((e) => e.name === oracle.entry.name)) onOpenEntry(oracle.entry.name);
  };

  const categoryCount = useMemo(() => {
    const cats = new Set(displayNodes.map((n) => n.category).filter(Boolean) as string[]);
    return cats.size;
  }, [displayNodes]);

  return (
    <div className="weave-view">
      <section className="weave-timeline">
        <div className="weave-section-head">
          <h3 className="weave-h3">
            <i className="fa-solid fa-timeline" style={{ fontSize: 13 }} /> Timeline Explorer
          </h3>
          <p className="weave-hint">The Veyn Calendar, from the Age of the Aelthar to the coming Fourth Turning.</p>
        </div>
        <div className="weave-rail">
          {ERAS.map((e) => (
            <button
              key={e.id}
              className={`weave-tick${e.id === eraId ? ' active' : ''}`}
              onClick={() => setEraId(e.id)}
              title={e.tagline}
            >
              <span className="weave-tick-dot" />
              <span className="weave-tick-name">{e.name}</span>
              <span className="weave-tick-span">{e.span}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="weave-body">
        <aside className="weave-side">
          <section className="weave-oracle">
            <div className="weave-section-head">
              <h3 className="weave-h3">
                <i className="fa-solid fa-dice" style={{ fontSize: 13 }} /> Lore Oracle
              </h3>
            </div>
            <div className="oracle-card" key={oracleKey}>
              <p className="oracle-era">{era.name} · {era.span}</p>
              {oracle ? (
                <>
                  <p className="oracle-name">{oracle.entry.name}</p>
                  {oracleTeaser(oracle.entry) && (
                    <p className="oracle-teaser">{oracleTeaser(oracle.entry)}</p>
                  )}
                  <p className="oracle-source">
                    {oracle.sourceLabel} ·{' '}
                    <span
                      className="oracle-cat"
                      style={{ color: categoryColor(oracle.entry.category) }}
                    >
                      {oracle.entry.category}
                    </span>
                  </p>
                </>
              ) : (
                <p className="oracle-teaser">No reading available.</p>
              )}
              <div className="oracle-actions">
                <button className="btn btn-primary btn-sm" onClick={shuffleOracle}>
                  <i className="fa-solid fa-dice" style={{ fontSize: 11 }} /> Ask the oracle
                </button>
                {oracle && entries.some((e) => e.name === oracle.entry.name) && (
                  <button className="btn btn-secondary btn-sm" onClick={openOracle}>
                    Open entry
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="weave-era-detail">
            <div className="weave-section-head">
              <h3 className="weave-h3">{era.name}</h3>
              <p className="weave-hint">{era.tagline}</p>
            </div>
            <ul className="weave-anchors">
              {era.anchors.map((a) => (
                <li key={a.label}>
                  <span className="weave-anchor-label">{a.label}</span>
                  <span className="weave-anchor-detail">{a.detail}</span>
                </li>
              ))}
            </ul>
            <div className="weave-material">
              <p className="weave-material-title">Entries of this age ({members.length})</p>
              <div className="weave-material-list">
                {members.length === 0 && <span className="weave-material-empty">No linked entries yet.</span>}
                {members.map((m) => (
                  <button
                    key={m.name}
                    className="weave-material-chip"
                    onClick={() => onOpenEntry(m.name)}
                    title={m.subtitle}
                  >
                    <span className="filter-dot" style={{ background: categoryColor(m.category) }} />
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </aside>

        <section className="weave-constellation">
          <div className="weave-section-head weave-constellation-head">
            <h3 className="weave-h3">
              <i className="fa-solid fa-star" style={{ fontSize: 13 }} /> Constellation
            </h3>
            <div className="weave-constellation-controls">
              <span className="weave-hint">
                {displayNodes.length} stars · {displayEdges.length} links · {categoryCount} categories
              </span>
              <button
                className={`filter-chip${focusMode === 'era' ? ' on' : ''}`}
                onClick={() => setFocusMode('era')}
                title="Show only this era's material and its neighbours"
              >
                This era
              </button>
              <button
                className={`filter-chip${focusMode === 'full' ? ' on' : ''}`}
                onClick={() => setFocusMode('full')}
                title="Show the whole archive"
              >
                Whole archive
              </button>
            </div>
          </div>
          <div className="weave-starmap">
            <Graph2D
              nodes={displayNodes}
              edges={displayEdges}
              onNodeClick={(name) => onOpenEntry(name)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

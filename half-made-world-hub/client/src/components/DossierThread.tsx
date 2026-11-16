import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Entry, Relationship, StoryLink } from '../types';
import { resolveDossier, type DossierDef } from '../dossiers';
import { buildEntryConnections } from '../entryConnections';
import { useNarrowLayout } from '../hooks/useNarrowLayout';
import { EntryDetail } from './EntryDetail';

interface DossierThreadProps {
  dossier: DossierDef;
  entries: Entry[];
  storyLinks: StoryLink[];
  relationships: Relationship[];
  resolveName: (name: string) => string;
  /** Open an entry that isn't part of this dossier (opens the usual detail modal). */
  onOpenEntry: (name: string) => void;
}

/**
 * Dossier thread — an institution's lore as a single string.
 *
 * Sections are knots on a vertical thread; entries are beads hanging off it.
 * Selecting a bead shows the full entry in the side panel, so the whole
 * institution can be read without hopping between cards and modals.
 */export function DossierThread({
  dossier,
  entries,
  storyLinks,
  relationships,
  resolveName,
  onOpenEntry,
}: DossierThreadProps) {
  const resolved = useMemo(() => resolveDossier(dossier, entries), [dossier, entries]);
  const narrow = useNarrowLayout();
  const byName = useMemo(
    () => new Map(resolved.entries.map((entry) => [entry.name, entry])),
    [resolved],
  );

  const [selectedName, setSelectedName] = useState(dossier.introName);
  useEffect(() => {
    setSelectedName(dossier.introName);
  }, [dossier.key, dossier.introName]);

  const selected =
    byName.get(resolveName(selectedName)) ?? byName.get(selectedName) ?? resolved.entries[0] ?? null;

  const connections = useMemo(
    () => buildEntryConnections(selected, storyLinks, relationships, resolveName),
    [selected, storyLinks, relationships, resolveName],
  );

  const openLinked = (name: string) => {
    const resolvedTarget = resolveName(name);
    if (byName.has(resolvedTarget)) setSelectedName(resolvedTarget);
    else if (byName.has(name)) setSelectedName(name);
    else onOpenEntry(name);
  };

  const jumpToSection = (key: string) => {
    document
      .getElementById(`dossier-${dossier.key}-${key}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="dossier">
      <nav className="dossier-legend" aria-label={`${dossier.title} sections`}>
        {resolved.sections.map((section) => (
          <button
            key={section.key}
            onClick={() => jumpToSection(section.key)}
            title={`Jump to ${section.label}`}
          >
            <span className="dossier-legend-dot" style={{ background: section.color }} />
            {section.label}
            <span className="dossier-legend-count">{section.entries.length}</span>
          </button>
        ))}
      </nav>

      <div className="dossier-body">
        <div className="thread-scroll">
          <div className="thread">
            {resolved.sections.map((section) => (
              <section
                className="thread-section"
                key={section.key}
                id={`dossier-${dossier.key}-${section.key}`}
              >
                <div className="thread-section-head">
                  <div
                    className="thread-knot"
                    style={
                      {
                        '--thread': section.color,
                        borderColor: `${section.color}88`,
                        background: `${section.color}1f`,
                      } as CSSProperties
                    }
                  >
                    <span className="thread-knot-dot" style={{ background: section.color }} />
                    <span className="thread-knot-label">{section.label}</span>
                    <span className="thread-knot-count">{section.entries.length}</span>
                  </div>
                </div>

                <ol className="thread-beads">
                  {section.entries.map((entry, index) => {
                    const active = selected?.name === entry.name;
                    return (
                      <li
                        className={`thread-bead ${index % 2 === 0 ? 'left' : 'right'}${active ? ' selected' : ''}`}
                        key={entry.id}
                        style={{ '--thread': section.color } as CSSProperties}
                      >
                        <button
                          className={`thread-node${active ? ' on' : ''}`}
                          onClick={() =>
                            narrow ? onOpenEntry(entry.name) : setSelectedName(entry.name)
                          }
                          title={`${entry.name}${entry.subtitle ? ` — ${entry.subtitle}` : ''}`}
                        >
                          <span className="thread-node-name">{entry.name}</span>
                          <span className="thread-node-sub">
                            {entry.subtitle || entry.category}
                          </span>
                        </button>
                        <span className="thread-dot" style={{ background: section.color }} />
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </div>

        {!narrow && (
          <aside className="dossier-detail">
            {selected ? (
              <EntryDetail
                entry={selected}
                connections={connections}
                onOpenEntry={openLinked}
              />
            ) : (
              <div className="empty-state">
                <p className="empty-title">Nothing on this thread yet.</p>
                <p className="empty-text">The archive has no entries for this section.</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

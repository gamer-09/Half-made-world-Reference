import { useMemo, useState, type CSSProperties } from 'react';
import type { Entry, Relationship, StoryLink } from '../types';
import { resolveDossier, type DossierDef } from '../dossiers';
import { buildEntryConnections } from '../entryConnections';
import { PinnedNote } from './PinnedNote';

interface BulletinBoardProps {
  dossier: DossierDef;
  entries: Entry[];
  storyLinks: StoryLink[];
  relationships: Relationship[];
  resolveName: (name: string) => string;
  /** Open an entry that isn't part of this board (uses the archive's own modal). */
  onOpenEntry: (name: string) => void;
}

/** Aged paper shades, cycled so the board never looks machine-cut. */
const PAPERS = ['#f2e7cf', '#f7f0de', '#eadcbb', '#e6d5b0'];

function hashOf(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i += 1) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A stable, small tilt per note — the same note always hangs the same way. */
function tiltOf(name: string): string {
  const t = (hashOf(name) % 1000) / 1000;
  return `${(t * 2.6 - 1.3).toFixed(2)}deg`;
}

/** Pins are never dead centre: nudge the fixing point and its angle per note. */
function fixingOf(name: string): { x: string; tilt: string; tapeTilt: string } {
  const h = hashOf(name);
  const x = ((h >> 7) % 17) - 8;
  const tilt = ((h >> 11) % 13) - 6;
  const tapeTilt = -2.5 + (((h >> 15) % 9) - 4) * 0.8;
  return { x: `${x}px`, tilt: `${tilt}deg`, tapeTilt: `${tapeTilt.toFixed(1)}deg` };
}

/** Some notices are pinned, some are taped; a few have a folded corner. */
function noteStyle(name: string): { variant: string; folded: boolean } {
  const h = hashOf(name);
  return {
    variant: h % 7 === 0 ? 'taped' : 'pinned',
    folded: h % 5 === 0,
  };
}

/**
 * Guild bulletin board — an institution's lore pinned up as notes.
 *
 * Every guild gets its own zone on the board, marked by an engraved brass
 * plaque. Opening a notice lifts the paper off the board into a full-size
 * pinned note with the whole entry printed on it.
 */
export function BulletinBoard({
  dossier,
  entries,
  storyLinks,
  relationships,
  resolveName,
  onOpenEntry,
}: BulletinBoardProps) {
  const resolved = useMemo(() => resolveDossier(dossier, entries), [dossier, entries]);
  const byName = useMemo(
    () => new Map(resolved.entries.map((entry) => [entry.name, entry])),
    [resolved],
  );

  const [openName, setOpenName] = useState<string | null>(null);

  const openEntry = openName ? byName.get(openName) ?? null : null;
  const connections = useMemo(
    () => buildEntryConnections(openEntry, storyLinks, relationships, resolveName),
    [openEntry, storyLinks, relationships, resolveName],
  );

  const openLinked = (name: string) => {
    const target = resolveName(name);
    if (byName.has(target)) setOpenName(target);
    else if (byName.has(name)) setOpenName(name);
    else {
      setOpenName(null);
      onOpenEntry(name);
    }
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

      <div className="board-frame">
        <span className="board-screw tl" aria-hidden="true" />
        <span className="board-screw tr" aria-hidden="true" />
        <span className="board-screw bl" aria-hidden="true" />
        <span className="board-screw br" aria-hidden="true" />

        <div className="board">
          {resolved.sections.map((section) => (
            <section
              className="board-zone"
              key={section.key}
              id={`dossier-${dossier.key}-${section.key}`}
              style={{ '--zone': section.color } as CSSProperties}
            >
              <header className="board-zone-head">
                <span className="board-plaque">
                  <span className="board-plaque-dot" style={{ background: section.color }} />
                  {section.label}
                  <span className="board-plaque-count">{section.entries.length} notices</span>
                </span>
              </header>

              <div className="board-notes">
                {section.entries.map((entry) => {
                  const { variant, folded } = noteStyle(entry.name);
                  const fixing = fixingOf(entry.name);
                  return (
                    <button
                      key={entry.id}
                      className={`board-note board-note--${variant}${folded ? ' folded' : ''}`}
                      style={
                        {
                          '--tilt': tiltOf(entry.name),
                          '--paper': PAPERS[hashOf(entry.name) % PAPERS.length],
                          '--pin': section.color,
                          '--pin-x': fixing.x,
                          '--pin-tilt': fixing.tilt,
                          '--tape-tilt': fixing.tapeTilt,
                        } as CSSProperties
                      }
                      onClick={() => setOpenName(entry.name)}
                      aria-haspopup="dialog"
                      title={`Open “${entry.name}”`}
                    >
                      {variant === 'taped' ? (
                        <span className="board-tape" aria-hidden="true" />
                      ) : (
                        <span className="board-pin" aria-hidden="true" />
                      )}

                      <span className="board-note-kicker">{entry.category}</span>
                      <span className="board-note-name">{entry.name}</span>
                      {entry.subtitle && (
                        <span className="board-note-sub">{entry.subtitle}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {openEntry && (
        <PinnedNote
          key={openEntry.id}
          entry={openEntry}
          connections={connections}
          onOpenEntry={openLinked}
          onClose={() => setOpenName(null)}
        />
      )}
    </div>
  );
}

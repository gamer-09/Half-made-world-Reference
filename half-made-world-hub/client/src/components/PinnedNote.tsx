import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ConnectionInfo, Entry } from '../types';
import { categoryColor } from '../theme';
import { DescriptionRenderer } from './DescriptionRenderer';

interface PinnedNoteProps {
  entry: Entry;
  connections: ConnectionInfo[];
  onOpenEntry: (name: string) => void;
  onClose: () => void;
}

/**
 * The note itself, unpinned from the board and held up close.
 *
 * Everything is printed on the same aged paper as the pinboards: ink type,
 * ruled details, stamped tags and a tack still holding the sheet.
 */
export function PinnedNote({ entry, connections, onOpenEntry, onClose }: PinnedNoteProps) {
  const accent = categoryColor(entry.category);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    // Lock the page without disturbing where the reader was on the board.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousScroll = window.scrollY;
    root.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      root.style.overflow = previousOverflow;
      if (window.scrollY !== previousScroll) window.scrollTo(0, previousScroll);
    };
  }, [onClose]);

  return createPortal(
    <div className="pinned-overlay" onMouseDown={onClose}>
      <div
        className="pinned-note"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pinned-note-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="pinned-tack" aria-hidden="true" />

        <button
          ref={closeRef}
          className="pinned-close"
          onClick={onClose}
          aria-label="Close note"
          title="Re-pin to the board"
        >
          <i className="fa-solid fa-xmark" />
        </button>

        <header className="pinned-head">
          <div className="pinned-meta">
            <span className="pinned-cat">
              <span className="pinned-cat-dot" style={{ background: accent }} />
              {entry.category}
            </span>
            <span className="pinned-updated">
              Updated{' '}
              {new Date(entry.updatedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <h2 className="pinned-title" id="pinned-note-title">
            {entry.name}
          </h2>
          {entry.subtitle && <p className="pinned-subtitle">{entry.subtitle}</p>}
          <span className="pinned-rule" aria-hidden="true" />
        </header>

        <div className="pinned-body">
          <DescriptionRenderer text={entry.description} />

          {entry.fields.length > 0 && (
            <section className="pinned-section">
              <h3 className="pinned-section-title">Details</h3>
              <dl className="pinned-fields">
                {entry.fields.map((field, i) => (
                  <div className="pinned-field" key={`${field.label}-${i}`}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {entry.tags.length > 0 && (
            <section className="pinned-section">
              <h3 className="pinned-section-title">Tags</h3>
              <div className="pinned-tags">
                {entry.tags.map((tag) => (
                  <span key={tag} className="pinned-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {connections.length > 0 && (
            <section className="pinned-section">
              <h3 className="pinned-section-title">
                Connections <span className="pinned-count">{connections.length}</span>
              </h3>
              <div className="pinned-conns">
                {connections.map((c, i) => (
                  <div className="pinned-conn" key={`${c.kind}-${i}`}>
                    <span className="pinned-conn-type">
                      <span className="pinned-conn-dot" style={{ background: c.color }} />
                      {c.typeLabel}
                    </span>
                    <button
                      className="pinned-conn-other"
                      onClick={() => onOpenEntry(c.otherName)}
                    >
                      {c.otherName}
                      <span className="pinned-conn-arrow">→</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="pinned-foot">
          <span className="pinned-foot-note">Elyndor archive · guild board</span>
          <button className="pinned-return" onClick={onClose}>
            ↩ Re-pin to the board
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

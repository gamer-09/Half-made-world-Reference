import type { ConnectionInfo, Entry } from '../types';
import { categoryColor } from '../theme';
import { DescriptionRenderer } from './DescriptionRenderer';

interface EntryDetailProps {
  entry: Entry;
  connections: ConnectionInfo[];
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onOpenEntry: (name: string) => void;
}

export function EntryDetail({ entry, connections, onEdit, onDelete, onOpenEntry }: EntryDetailProps) {
  const accent = categoryColor(entry.category);
  return (
    <div className="detail">
      <div className="detail-head">
        <span
          className="chip"
          style={{ color: accent, borderColor: `${accent}55`, background: `${accent}14` }}
        >
          {entry.category}
        </span>
        <span className="detail-updated">
          Updated {new Date(entry.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <h2 className="detail-name">{entry.name}</h2>
      {entry.subtitle && <p className="detail-subtitle">{entry.subtitle}</p>}

      <DescriptionRenderer text={entry.description} />

      {entry.fields.length > 0 && (
        <dl className="detail-fields">
          {entry.fields.map((field, i) => (
            <div className="detail-field" key={`${field.label}-${i}`}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {entry.tags.length > 0 && (
        <div className="detail-tags">
          {entry.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {connections.length > 0 && (
        <div className="detail-connections">
          <h3 className="detail-connections-title">
            Connections <span className="conn-count">{connections.length}</span>
          </h3>
          <div className="conn-list">
            {connections.map((c, i) => (
              <div className="conn-row" key={`${c.kind}-${i}`}>
                <span
                  className="chip"
                  style={{ color: c.color, borderColor: `${c.color}55`, background: `${c.color}14` }}
                >
                  {c.typeLabel}
                </span>
                <button className="conn-other" onClick={() => onOpenEntry(c.otherName)}>
                  {c.otherName}
                  <span className="conn-arrow">→</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="detail-actions">
        <button className="btn btn-secondary" onClick={() => onEdit(entry)}>
          ✎ Edit
        </button>
        <button className="btn btn-danger" onClick={() => onDelete(entry)}>
          🗑 Delete
        </button>
      </div>
    </div>
  );
}

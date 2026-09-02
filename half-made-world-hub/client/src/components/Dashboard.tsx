import { useState, type CSSProperties } from 'react';
import type { CategoryInfo, RecentEntry } from '../types';
import { categoryColor } from '../theme';

interface DashboardProps {
  categories: CategoryInfo[];
  total: number;
  tags: { name: string; count: number }[];
  recent: RecentEntry[];
  onSelectCategory: (category: string) => void;
  onSelectTag: (tag: string) => void;
  onOpenEntry: (name: string) => void;
  onAdd: () => void;
}

const HIGHLIGHTS = ['Artifacts', 'Classes', 'Characters', 'Plot', 'Monsters', 'Realms'];

export function Dashboard({
  categories,
  total,
  tags,
  recent,
  onSelectCategory,
  onSelectTag,
  onOpenEntry,
  onAdd,
}: DashboardProps) {
  const [tagQuery, setTagQuery] = useState('');

  const filteredTags = (() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  })();

  return (
    <div className="dashboard">
      <section className="hero">
        <p className="hero-eyebrow">The World So Far</p>
        <h2 className="hero-title">
          Welcome to the <span className="grad">Half-Made World</span>
        </h2>
        <p className="hero-text">
          Four realms, angel and demon ranks, divine weapons, and a hundred threads of lore — all of it
          seeded from your reference document. Browse the archive, or forge something new.
        </p>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-num">{total}</span>
            <span className="stat-label">Entries</span>
          </div>
          <div className="stat">
            <span className="stat-num">{categories.length}</span>
            <span className="stat-label">Categories</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <i className="fa-solid fa-plus" style={{ fontSize: 12 }} /> Add your first new entry
        </button>
      </section>

      <section className="dashboard-section">
        <h3 className="section-title">Browse by Category</h3>
        <div className="tile-grid">
          {categories.map((cat) => {
            const color = categoryColor(cat.name);
            const highlight = HIGHLIGHTS.includes(cat.name);
            return (
              <button
                key={cat.name}
                className={`tile${highlight ? ' tile--highlight' : ''}`}
                style={{ '--tile': color } as CSSProperties}
                onClick={() => onSelectCategory(cat.name)}
              >
                <span className="tile-count">{cat.count}</span>
                <span className="tile-name">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {tags.length > 0 && (
        <section className="dashboard-section">
          <h3 className="section-title">Tag Cloud</h3>
          <p className="section-hint">Search tags, or click one to filter the archive.</p>
          <input
            type="search"
            className="input tag-search"
            placeholder="Search tags…"
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
          />
          {filteredTags.length === 0 ? (
            <p className="section-hint">No tags match &ldquo;{tagQuery.trim()}&rdquo;.</p>
          ) : (
            <div className="tag-cloud">
              {filteredTags.map((tag) => {
                const max = tags[0].count || 1;
                const size = 0.85 + Math.min(0.65, (tag.count / max) * 0.65);
                return (
                  <button
                    key={tag.name}
                    className="tag-cloud-item"
                    style={{ fontSize: `${size}rem` }}
                    onClick={() => onSelectTag(tag.name)}
                    title={`${tag.count} entr${tag.count === 1 ? 'y' : 'ies'} tagged`}
                  >
                    #{tag.name}
                    <span className="tag-cloud-count">{tag.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {recent.length > 0 && (
        <section className="dashboard-section">
          <h3 className="section-title">Recently Viewed</h3>
          <div className="recent-list">
            {recent.map((r) => (
              <button key={r.id} className="recent-item" onClick={() => onOpenEntry(r.name)}>
                <span className="recent-dot" style={{ background: categoryColor(r.category) }} />
                <span className="recent-name">{r.name}</span>
                {r.subtitle && <span className="recent-sub">{r.subtitle}</span>}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import type { Ref } from 'react';
import type { CategoryInfo } from '../types';
import { categoryColor } from '../theme';

export type ViewMode = 'browse' | 'map' | 'web';

interface SidebarProps {
  categories: CategoryInfo[];
  total: number;
  activeCategory: string;
  search: string;
  view: ViewMode;
  searchRef?: Ref<HTMLInputElement>;
  onSearch: (q: string) => void;
  onSelectCategory: (category: string) => void;
  onAdd: () => void;
  onDeleteCategory: (category: string) => void;
  onOpenMap: () => void;
  onOpenWeb: () => void;
}

export function Sidebar({
  categories,
  total,
  activeCategory,
  search,
  view,
  searchRef,
  onSearch,
  onSelectCategory,
  onAdd,
  onDeleteCategory,
  onOpenMap,
  onOpenWeb,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="34" height="34">
            <circle cx="32" cy="32" r="13" fill="none" stroke="url(#brandGrad)" strokeWidth="3.5" />
            <circle cx="32" cy="32" r="5" fill="url(#brandGrad)" />
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e8c06a" />
                <stop offset="1" stopColor="#e06a55" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          <h1 className="brand-name">Half-Made World</h1>
          <p className="brand-sub">Worldbuilding Archive</p>
        </div>
      </div>

      <button className="btn btn-primary btn-block" onClick={onAdd}>
        <span className="btn-icon">+</span> Add Entry
      </button>

      <button
        className={`nav-map-btn${view === 'map' ? ' active' : ''}`}
        onClick={onOpenMap}
        title="Who knows whom — and who betrayed whom"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="5" cy="6" r="2.2" />
          <circle cx="18" cy="5" r="2.2" />
          <circle cx="12" cy="18" r="2.2" />
          <line x1="6.8" y1="7.2" x2="10.5" y2="15.5" />
          <line x1="15.9" y1="6.6" x2="13.4" y2="15.7" />
        </svg>
        Relationship Map
      </button>

      <button
        className={`nav-map-btn${view === 'web' ? ' active' : ''}`}
        onClick={onOpenWeb}
        title="The whole world at a glance — realms, monsters, artifacts, plot"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <line x1="3.5" y1="12" x2="20.5" y2="12" />
        </svg>
        Story Web
      </button>

      <label className="search-wrap">
        <span className="search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
        </span>
        <input
          type="search"
          name="search"
          ref={searchRef}
          className="search-input"
          placeholder="Search the world… ( / )"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </label>

      <nav className="category-nav">
        <button
          className={`category-item${activeCategory === 'All' && view === 'browse' ? ' active' : ''}`}
          onClick={() => onSelectCategory('All')}
        >
          <span className="category-dot" style={{ background: '#8b93a7' }} />
          <span className="category-name">All Entries</span>
          <span className="category-count">{total}</span>
        </button>

        {categories.map((cat) => (
          <div key={cat.name} className="category-item-wrap">
            <button
              className={`category-item${activeCategory === cat.name && view === 'browse' ? ' active' : ''}`}
              onClick={() => onSelectCategory(cat.name)}
            >
              <span className="category-dot" style={{ background: categoryColor(cat.name) }} />
              <span className="category-name">{cat.name}</span>
              <span className="category-count">{cat.count}</span>
            </button>
            <button
              className="category-delete"
              onClick={() => onDeleteCategory(cat.name)}
              title={`Delete the “${cat.name}” category`}
              aria-label={`Delete the “${cat.name}” category`}
            >
              ×
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}

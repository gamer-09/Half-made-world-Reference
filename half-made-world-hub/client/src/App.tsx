import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ConnectionInfo,
  Entry,
  EntryInput,
  RecentEntry,
  Relationship,
  RelationshipInput,
  StoryLink,
  StoryLinkInput,
} from './types';
import {
  createEntry,
  createRelationship,
  createStoryLink,
  deleteCategory,
  deleteEntry,
  deleteRelationship,
  deleteStoryLink,
  fetchEntries,
  fetchRelationships,
  fetchStoryLinks,
  resetWorld,
  updateEntry,
  updateRelationship,
  updateStoryLink,
} from './api';
import { Sidebar, type ViewMode } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { EntryCard } from './components/EntryCard';
import { EntryDetail } from './components/EntryDetail';
import { EntryForm } from './components/EntryForm';
import { RelationshipMap } from './components/RelationshipMap';
import { StoryWeb } from './components/StoryWeb';
import { BlockMap } from './components/BlockMap';
import { LinkForm } from './components/LinkForm';
import { Modal } from './components/Modal';
import { RELATIONSHIP_TYPES, relationshipType } from './relationshipTypes';
import { STORY_LINK_TYPES, storyLinkType } from './storyLinkTypes';
import { findCharacter } from './nameMatch';

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildMarkdown(entries: Entry[]): string {
  const grouped = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.category) ?? [];
    list.push(entry);
    grouped.set(entry.category, list);
  }
  const lines: string[] = ['# Half-Made World — Worldbuilding Archive', ''];
  for (const [category, list] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`## ${category}`, '');
    for (const entry of list) {
      lines.push(`### ${entry.name}`, '');
      if (entry.subtitle) lines.push(`*${entry.subtitle}*`, '');
      lines.push(entry.description, '');
      for (const field of entry.fields) lines.push(`- **${field.label}:** ${field.value}`);
      if (entry.fields.length) lines.push('');
      if (entry.tags.length) lines.push(`*Tags: ${entry.tags.join(', ')}*`, '');
    }
  }
  return lines.join('\n');
}

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [storyLinks, setStoryLinks] = useState<StoryLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewMode>('browse');
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Entry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [relFormOpen, setRelFormOpen] = useState(false);
  const [editingRel, setEditingRel] = useState<Relationship | null>(null);
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<StoryLink | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<RecentEntry[]>(() => {
    try {
      const raw = localStorage.getItem('hmw-recent');
      if (raw) return JSON.parse(raw) as RecentEntry[];
    } catch {
      /* ignore */
    }
    return [];
  });

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(toastTimer.current);
  }, []);

  const load = useCallback(async () => {
    try {
      const [entryData, relData, linkData] = await Promise.all([
        fetchEntries(),
        fetchRelationships(),
        fetchStoryLinks(),
      ]);
      setEntries(entryData);
      setRelationships(relData);
      setStoryLinks(linkData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the archive.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Remember the most recent entries the user opened.
  useEffect(() => {
    if (!selected) return;
    setRecent((prev) => {
      const next = [
        { id: selected.id, name: selected.name, category: selected.category, subtitle: selected.subtitle },
        ...prev.filter((r) => r.id !== selected.id),
      ].slice(0, 8);
      try {
        localStorage.setItem('hmw-recent', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [selected]);

  // Keyboard shortcuts: / focuses search, n adds an entry, 1/2/3 switch views.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        openAdd();
      } else if (e.key === '1') {
        setView('browse');
      } else if (e.key === '2') {
        setView('map');
      } else if (e.key === '3') {
        setView('web');
      } else if (e.key === '4') {
        setView('blocks');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [entries]);

  const characterEntries = useMemo(
    () => entries.filter((e) => e.category === 'Characters'),
    [entries],
  );

  const characterNames = useMemo(() => characterEntries.map((e) => e.name), [characterEntries]);
  const allEntryNames = useMemo(() => entries.map((e) => e.name), [entries]);

  const resolveName = useCallback(
    (name: string): string => {
      const exact = entries.find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (exact) return exact.name;
      const ch = findCharacter(entries, name);
      if (ch) return ch.name;
      return name;
    },
    [entries],
  );

  const resolveToEntry = useCallback(
    (name: string): Entry | undefined => entries.find((e) => e.name === resolveName(name)),
    [entries, resolveName],
  );

  const connections = useMemo<ConnectionInfo[]>(() => {
    if (!selected) return [];
    const out: ConnectionInfo[] = [];
    for (const s of storyLinks) {
      const src = resolveName(s.source);
      const tgt = resolveName(s.target);
      if (src === selected.name || tgt === selected.name) {
        const t = storyLinkType(s.type);
        out.push({
          kind: 'story',
          typeLabel: s.label || t.label,
          color: t.color,
          otherName: src === selected.name ? tgt : src,
        });
      }
    }
    for (const r of relationships) {
      const src = resolveName(r.source);
      const tgt = resolveName(r.target);
      if (src === selected.name || tgt === selected.name) {
        const t = relationshipType(r.type);
        out.push({
          kind: 'relationship',
          typeLabel: r.label || t.label,
          color: t.color,
          otherName: src === selected.name ? tgt : src,
        });
      }
    }
    return out;
  }, [selected, storyLinks, relationships, resolveName]);

  const filtered = useMemo(() => {
    let list = entries;
    if (activeCategory !== 'All') list = list.filter((e) => e.category === activeCategory);
    if (activeTag) list = list.filter((e) => e.tags.includes(activeTag));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.subtitle && e.subtitle.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          e.tags.some((t) => t.toLowerCase().includes(q)) ||
          e.fields.some((f) => 
            (f.label && f.label.toLowerCase().includes(q)) || 
            (f.value && f.value.toLowerCase().includes(q))
          ),
      );
    }
    return list;
  }, [entries, activeCategory, activeTag, search]);

  const selectCategory = (category: string) => {
    setActiveCategory(category);
    setView('browse');
  };

  const selectTag = (tag: string) => {
    setActiveTag(tag);
    setView('browse');
  };

  const clearTag = () => setActiveTag(null);

  const openEntryByName = (name: string) => {
    const entry = resolveToEntry(name);
    if (entry) setSelected(entry);
  };

  // --- Entry CRUD ---------------------------------------------------------
  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (entry: Entry) => {
    setEditing(entry);
    setSelected(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSave = async (input: EntryInput) => {
    try {
      if (editing) {
        await updateEntry(editing.id, input);
        showToast(`Updated “${input.name}”.`);
      } else {
        await createEntry(input);
        showToast(`Added “${input.name}” to ${input.category}.`);
      }
      closeForm();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  const handleDelete = async (entry: Entry) => {
    if (!window.confirm(`Delete “${entry.name}” permanently?`)) return;
    try {
      await deleteEntry(entry.id);
      setSelected(null);
      showToast(`Deleted “${entry.name}”.`);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleDeleteCategory = async (category: string) => {
    const count = categories.find((c) => c.name === category)?.count ?? 0;
    if (
      !window.confirm(
        `Delete the “${category}” category and all ${count} of its entries?\n\n` +
          `Any relationship or story links pointing at those entries will be removed too. This can’t be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteCategory(category);
      if (activeCategory === category) setActiveCategory('All');
      showToast(`Deleted the “${category}” category and its ${count} entries.`);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  // --- Relationship CRUD --------------------------------------------------
  const openAddRel = () => {
    setEditingRel(null);
    setRelFormOpen(true);
  };

  const openEditRel = (rel: Relationship) => {
    setRelFormOpen(true);
    setEditingRel(rel);
  };

  const closeRelForm = () => {
    setRelFormOpen(false);
    setEditingRel(null);
  };

  const handleSaveRel = async (input: RelationshipInput) => {
    try {
      if (editingRel) {
        await updateRelationship(editingRel.id, input);
        showToast(`Updated the relationship: ${input.source} → ${input.target}.`);
      } else {
        await createRelationship(input);
        showToast(`Linked ${input.source} → ${input.target}.`);
      }
      closeRelForm();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  const handleDeleteRel = async (rel: Relationship) => {
    if (!window.confirm(`Delete the “${rel.label}” link (${rel.source} → ${rel.target})?`)) return;
    try {
      await deleteRelationship(rel.id);
      showToast(`Removed the link between ${rel.source} and ${rel.target}.`);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  // --- Story link CRUD ----------------------------------------------------
  const openAddLink = () => {
    setEditingLink(null);
    setLinkFormOpen(true);
  };

  const openEditLink = (link: StoryLink) => {
    setLinkFormOpen(true);
    setEditingLink(link);
  };

  const closeLinkForm = () => {
    setLinkFormOpen(false);
    setEditingLink(null);
  };

  const handleSaveLink = async (input: StoryLinkInput) => {
    try {
      if (editingLink) {
        await updateStoryLink(editingLink.id, input);
        showToast(`Updated the link: ${input.source} → ${input.target}.`);
      } else {
        await createStoryLink(input);
        showToast(`Connected ${input.source} → ${input.target}.`);
      }
      closeLinkForm();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  const handleDeleteLink = async (link: StoryLink) => {
    if (!window.confirm(`Delete the “${link.label}” link (${link.source} → ${link.target})?`)) return;
    try {
      await deleteStoryLink(link.id);
      showToast(`Removed the link between ${link.source} and ${link.target}.`);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  // --- Misc ---------------------------------------------------------------
  const handleReset = async () => {
    if (
      !window.confirm(
        'Reset the archive to the original seed? This removes all your added entries, relationships, and story links.',
      )
    )
      return;
    try {
      await resetWorld();
      setSelected(null);
      setActiveCategory('All');
      setSearch('');
      setView('browse');
      await load();
      showToast('Archive reset to the original seed.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reset failed.');
    }
  };

  const exportMarkdown = () => {
    download('half-made-world.md', buildMarkdown(entries), 'text/markdown');
    showToast(`Exported the full archive (${entries.length} entries) as Markdown.`);
  };

  const exportJson = () => {
    download('half-made-world.json', JSON.stringify(entries, null, 2), 'application/json');
    showToast(`Exported the full archive (${entries.length} entries) as JSON.`);
  };

  const isMapView = view === 'map';
  const isWebView = view === 'web';
  const isBlocksView = view === 'blocks';
  const showDashboard = view === 'browse' && activeCategory === 'All' && search.trim() === '' && !activeTag;

  const viewKey = isBlocksView ? 'blocks' : isWebView ? 'web' : isMapView ? 'map' : `browse-${activeCategory}`;

  return (
    <div className="app">
      <div className="bg-aurora" aria-hidden="true" />
      <Sidebar
        categories={categories}
        total={entries.length}
        activeCategory={activeCategory}
        search={search}
        view={view}
        searchRef={searchRef}
        onSearch={setSearch}
        onSelectCategory={selectCategory}
        onAdd={openAdd}
        onOpenMap={() => setView('map')}
        onOpenWeb={() => setView('web')}
        onOpenBlocks={() => setView('blocks')}
      />

      <main className="main">
        <header className="main-header" style={{ borderBottom: '1px solid rgba(200,168,118,0.08)', position: 'relative', zIndex: 10, display: 'flex', visibility: 'visible', opacity: 1 }}>
          <div style={{ visibility: 'visible', opacity: 1, display: 'block' }}>
            <h2 className="main-title" style={{ color: 'white', visibility: 'visible', opacity: 1 }}>
              {isBlocksView ? 'Block Chain Map' : isWebView ? 'Story Web' : isMapView ? 'Relationship Map' : activeCategory === 'All' ? 'All Entries' : activeCategory}
              {!isMapView && !isWebView && !isBlocksView && (
                <span className="main-count" style={{ color: '#c8a876', background: 'rgba(200,168,118,0.14)', border: '1px solid rgba(200,168,118,0.3)' }}>
                  {filtered.length}
                </span>
              )}
            </h2>
            <p className="main-sub" style={{ color: 'rgba(235,230,216,0.6)' }}>
              {isBlocksView
                  ? 'The world’s geography as a chain — every place linked to what contains it'
                  : isWebView
                    ? 'The whole world at a glance — every realm, monster, artifact, and thread'
                    : isMapView
                      ? 'Who knows whom — and who betrayed whom'
                      : activeCategory === 'All'
                        ? 'Everything in the archive'
                        : `Entries in ${activeCategory}`}
              {!isMapView && !isWebView && !isBlocksView && search.trim() && ` · matching “${search.trim()}”`}
            </p>
          </div>
          <div className="header-actions">
            {!isMapView && !isWebView && activeCategory !== 'All' && (
              <button
                className="btn btn-danger btn-sm"
                style={{ color: '#c25e4a', border: '1px solid rgba(194,94,74,0.4)', background: 'rgba(194,94,74,0.08)' }}
                onClick={() => handleDeleteCategory(activeCategory)}
              >
                🗑 Delete “{activeCategory}”
              </button>
            )}
            {isMapView && (
              <button
                className="btn btn-primary btn-sm"
                style={{ color: '#ebe6d8', border: '1px solid rgba(200,168,118,0.4)', background: 'rgba(200,168,118,0.12)' }}
                onClick={openAddRel}
              >
                ＋ Add Relationship
              </button>
            )}
            {isWebView && (
              <button
                className="btn btn-primary btn-sm"
                style={{ color: '#ebe6d8', border: '1px solid rgba(200,168,118,0.4)', background: 'rgba(200,168,118,0.12)' }}
                onClick={openAddLink}
              >
                ＋ Add Link
              </button>
            )}
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'rgba(235,230,216,0.6)', border: '1px solid transparent' }}
              onClick={exportMarkdown}
              title="Download the archive as Markdown"
            >
              ⬇ MD
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'rgba(235,230,216,0.6)', border: '1px solid transparent' }}
              onClick={exportJson}
              title="Download the archive as JSON"
            >
              ⬇ JSON
            </button>
          </div>
        </header>

        <div className={`view-transition${isBlocksView ? ' view-fill' : ''}`} key={viewKey}>
        {loading ? (
          <div className="loading">
            <span className="loading-orb" aria-hidden="true" />
            <p>Summoning the archive…</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p className="empty-title">The server isn’t answering.</p>
            <p className="empty-text">{error}</p>
            <button className="btn btn-secondary" onClick={load}>
              Retry
            </button>
          </div>
        ) : isBlocksView ? (
          <BlockMap entries={entries} storyLinks={storyLinks} onNodeClick={setSelected} />
        ) : isWebView ? (
          <StoryWeb
            entries={entries}
            relationships={relationships}
            storyLinks={storyLinks}
            onNodeClick={setSelected}
            onAdd={openAddLink}
            onEditStory={openEditLink}
            onDeleteStory={handleDeleteLink}
            onEditRel={openEditRel}
            onDeleteRel={handleDeleteRel}
          />
        ) : isMapView ? (
          relationships.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No relationships yet.</p>
              <p className="empty-text">Link two characters to start weaving the web.</p>
              <button className="btn btn-primary" onClick={openAddRel}>
                ＋ Add Relationship
              </button>
            </div>
          ) : (
            <RelationshipMap
              relationships={relationships}
              characterEntries={characterEntries}
              onNodeClick={setSelected}
              onAdd={openAddRel}
              onEdit={openEditRel}
              onDelete={handleDeleteRel}
            />
          )
        ) : showDashboard ? (
          <Dashboard
            categories={categories}
            total={entries.length}
            tags={allTags}
            recent={recent}
            onSelectCategory={selectCategory}
            onSelectTag={selectTag}
            onOpenEntry={openEntryByName}
            onAdd={openAdd}
          />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">Nothing found.</p>
            <p className="empty-text">Try a different search, or add a brand-new entry to the world.</p>
            <button className="btn btn-primary" onClick={openAdd}>
              ＋ Add Entry
            </button>
          </div>
        ) : (
          <>
            {activeTag && (
              <div className="active-filter">
                <span className="filter-chip on">
                  <span className="filter-dot" />
                  #{activeTag}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={clearTag}>
                  ✕ Clear tag
                </button>
              </div>
            )}
            <div className="grid">
              {filtered.map((entry) => (
                <EntryCard key={entry.id} entry={entry} onClick={setSelected} query={search} onSelectTag={selectTag} />
              ))}
            </div>
          </>
        )}
        </div>

        <footer className="main-footer">
          <button className="btn btn-ghost btn-sm" onClick={handleReset} title="Restore the original seed data">
            ↺ Reset to seed
          </button>
          <span className="footer-note">Seeded from “Half_made world ideas.docx” · saved to server/data/*.json</span>
        </footer>
      </main>

      {selected && (
        <Modal key={selected.id} onClose={() => setSelected(null)}>
          <EntryDetail
            entry={selected}
            connections={connections}
            onEdit={openEdit}
            onDelete={handleDelete}
            onOpenEntry={openEntryByName}
          />
        </Modal>
      )}

      {formOpen && (
        <Modal onClose={closeForm} wide>
          <EntryForm
            categories={categories.map((c) => c.name)}
            existingNames={allEntryNames}
            editing={editing}
            onSave={handleSave}
            onCancel={closeForm}
          />
        </Modal>
      )}

      {relFormOpen && (
        <Modal onClose={closeRelForm} wide>
          <LinkForm
            title="Relationship"
            names={characterNames}
            types={RELATIONSHIP_TYPES}
            editing={editingRel}
            onSave={handleSaveRel}
            onCancel={closeRelForm}
          />
        </Modal>
      )}

      {linkFormOpen && (
        <Modal onClose={closeLinkForm} wide>
          <LinkForm
            title="Story Link"
            names={allEntryNames}
            types={STORY_LINK_TYPES}
            editing={editingLink}
            onSave={handleSaveLink}
            onCancel={closeLinkForm}
          />
        </Modal>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

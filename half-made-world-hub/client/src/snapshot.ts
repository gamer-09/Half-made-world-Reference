import type { CategoryInfo, Entry, Relationship, StoryLink } from './types';

export type SnapshotData = {
  entries: Entry[];
  relationships: Relationship[];
  storyLinks: StoryLink[];
};

let cached: SnapshotData | null = null;

export async function loadSnapshot(): Promise<SnapshotData> {
  if (cached) return cached;

  // Try the live server first (dev mode with the Node API running).
  try {
    const entries = await fetch('/api/entries').then((r) => r.json());
    const relationships = await fetch('/api/relationships').then((r) => r.json());
    const storyLinks = await fetch('/api/story-links').then((r) => r.json());
    if (entries?.length && relationships?.length && storyLinks?.length) {
      cached = { entries, relationships, storyLinks };
      return cached;
    }
  } catch {
    /* live server not available — fall through to snapshot */
  }

  // Fallback: load the bundled snapshot.json (view-only build / GitHub Pages).
  const res = await fetch(import.meta.env.BASE_URL + 'snapshot.json');
  if (!res.ok) {
    throw new Error(`Failed to load the archive (${res.status})`);
  }
  const data = await res.json() as SnapshotData;
  if (!data?.entries || !data?.relationships || !data?.storyLinks) {
    throw new Error('The archive is missing data');
  }
  cached = data;
  return data;
}

export function getSnapshot(): SnapshotData | null {
  return cached;
}

export function snapshotCategories(data: SnapshotData): CategoryInfo[] {
  const counts = new Map<string, number>();
  for (const entry of data.entries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function snapshotEntries(
  data: SnapshotData,
  params?: { category?: string; search?: string },
): Entry[] {
  let list = data.entries;
  if (params?.category) list = list.filter((e) => e.category === params.category);
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.subtitle || '').toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)) ||
        e.fields.some(
          (f) =>
            (f.label && f.label.toLowerCase().includes(q)) ||
            (f.value && f.value.toLowerCase().includes(q)),
        ),
    );
  }
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

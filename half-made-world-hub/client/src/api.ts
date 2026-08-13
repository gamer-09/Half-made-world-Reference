import type {
  CategoryInfo,
  Entry,
  EntryInput,
  Relationship,
  RelationshipInput,
  StoryLink,
  StoryLinkInput,
} from './types';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// --- Entries --------------------------------------------------------------
export async function fetchCategories(): Promise<CategoryInfo[]> {
  const res = await fetch('/api/categories');
  return handle<CategoryInfo[]>(res);
}

export async function deleteCategory(
  name: string,
): Promise<{ ok: boolean; deleted: number; relationshipsRemoved: number; storyLinksRemoved: number }> {
  const res = await fetch(`/api/categories/${encodeURIComponent(name)}`, { method: 'DELETE' });
  return handle(res);
}

export async function fetchEntries(params?: { category?: string; search?: string }): Promise<Entry[]> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.search) qs.set('search', params.search);
  const res = await fetch(`/api/entries?${qs.toString()}`);
  return handle<Entry[]>(res);
}

export async function createEntry(input: EntryInput): Promise<Entry> {
  const res = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handle<Entry>(res);
}

export async function updateEntry(id: string, input: EntryInput): Promise<Entry> {
  const res = await fetch(`/api/entries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handle<Entry>(res);
}

export async function deleteEntry(id: string): Promise<Entry> {
  const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
  return handle<Entry>(res);
}

// --- Relationships --------------------------------------------------------
export async function fetchRelationships(): Promise<Relationship[]> {
  const res = await fetch('/api/relationships');
  return handle<Relationship[]>(res);
}

export async function createRelationship(input: RelationshipInput): Promise<Relationship> {
  const res = await fetch('/api/relationships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handle<Relationship>(res);
}

export async function updateRelationship(id: string, input: RelationshipInput): Promise<Relationship> {
  const res = await fetch(`/api/relationships/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handle<Relationship>(res);
}

export async function deleteRelationship(id: string): Promise<Relationship> {
  const res = await fetch(`/api/relationships/${id}`, { method: 'DELETE' });
  return handle<Relationship>(res);
}

// --- Story links ----------------------------------------------------------
export async function fetchStoryLinks(): Promise<StoryLink[]> {
  const res = await fetch('/api/story-links');
  return handle<StoryLink[]>(res);
}

export async function createStoryLink(input: StoryLinkInput): Promise<StoryLink> {
  const res = await fetch('/api/story-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handle<StoryLink>(res);
}

export async function updateStoryLink(id: string, input: StoryLinkInput): Promise<StoryLink> {
  const res = await fetch(`/api/story-links/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handle<StoryLink>(res);
}

export async function deleteStoryLink(id: string): Promise<StoryLink> {
  const res = await fetch(`/api/story-links/${id}`, { method: 'DELETE' });
  return handle<StoryLink>(res);
}

export async function resetWorld(): Promise<{
  ok: boolean;
  entries: number;
  relationships: number;
  storyLinks: number;
}> {
  const res = await fetch('/api/reset', { method: 'POST' });
  return handle<{ ok: boolean; entries: number; relationships: number; storyLinks: number }>(res);
}

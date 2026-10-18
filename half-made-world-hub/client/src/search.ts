import type { Entry, Relationship, StoryLink } from './types';
import type { SearchMatch, SearchResult } from './api';

export interface SearchArchiveData {
  entries: Entry[];
  relationships: Relationship[];
  storyLinks: StoryLink[];
}

// Browser-side mirror of the server's /api/search keyword lookup. The view-only
// (GitHub Pages) build has no Node server, so Query mode runs the same scoring
// here over the bundled snapshot. Keep this in sync with server/index.js.

const STOPWORDS = new Set<string>([
  'who', 'what', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were', 'does', 'do', 'did',
  'can', 'could', 'would', 'should', 'may', 'might', 'shall', 'will', 'tell', 'me', 'about',
  'the', 'a', 'an', 'of', 'in', 'on', 'to', 'for', 'with', 'and', 'or', 'that', 'this', 'it',
  'i', 'my', 'we', 'you', 'your', 'he', 'she', 'they', 'its', 'his', 'her', 'their',
  'be', 'been', 'being', 'have', 'has', 'had', 'from', 'by', 'at', 'as', 'if', 'into', 'not', 'please',
  'long', 'ago', 'far', 'much', 'many', 'get', 'got', 'use', 'used', 'there', 'here',
  'which', 'whose', 'whom', 'most', 'kinds', 'kind',
]);

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  // "strongest"/"apex" are the archive's own vocabulary for top-tier races
  // (Cherubim and Fiends are tagged "apex"), so expand between them.
  strongest: ['apex', 'supreme'],
  stronger: ['apex'],
  apex: ['strongest', 'supreme'],
  mc: ['main character', 'protagonist'],
  'main character': ['mc', 'protagonist'],
  protagonist: ['mc', 'main character'],
  hero: ['protagonist', 'main character'],
  eat: ['food', 'meal', 'cuisine', 'diet', 'sustenance', 'drink', 'feast', 'nourishment', 'hunger'],
  eats: ['eat', 'food', 'meal', 'cuisine', 'diet'],
  eating: ['eat', 'food', 'meal', 'cuisine', 'diet'],
  food: ['eat', 'meal', 'cuisine', 'diet', 'sustenance'],
  meal: ['eat', 'food', 'cuisine'],
  cuisine: ['eat', 'food', 'meal'],
  diet: ['eat', 'food', 'sustenance'],
  sustenance: ['eat', 'food', 'diet'],
  drink: ['eat', 'food', 'beverage'],
  fight: ['combat', 'battle', 'war', 'weapon'],
  combat: ['fight', 'battle', 'war'],
  battle: ['fight', 'combat', 'war'],
  war: ['fight', 'combat', 'battle'],
  magic: ['veyn', 'spell', 'caster'],
  death: ['die', 'dead', 'funeral', 'burial'],
  die: ['death', 'dead'],
  money: ['currency', 'coin', 'price', 'gold', 'silver', 'economy'],
  currency: ['money', 'coin', 'gold', 'silver'],
  price: ['money', 'cost', 'coin', 'currency'],
};

// Lightweight singular stem so plural/singular tag and name variants match
// (angels -> angel, abilities -> ability, classes -> class).
function stem(w: string): string {
  const s = String(w).toLowerCase();
  if (s.endsWith('ies') && s.length > 4) return s.slice(0, -3) + 'y';
  if (s.endsWith('sses')) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) return s.slice(0, -1);
  return s;
}

function extractKeywords(question: string): string[] {
  const words = String(question || '')
    .toLowerCase()
    // Drop filler phrases like "in order" so "order" doesn't match every
    // description that says "in order to" (or hijack "strongest in order").
    .replace(/\bin order\b/g, ' ')
    .replace(/[?!,;:'"()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const kept = words.filter((w) => !STOPWORDS.has(w));
  // Expand shorthand terms ("mc") and stem singular/plural so a question like
  // "what do angels eat" still matches an entry named "Angel Sustenance".
  const expanded = new Set<string>();
  const add = (term: string) => {
    if (!term || STOPWORDS.has(term)) return;
    expanded.add(term);
    const st = stem(term);
    if (st && !STOPWORDS.has(st)) expanded.add(st);
    // Multi-word terms also match on their component words.
    if (term.includes(' ')) {
      for (const part of term.split(' ')) add(part);
    }
  };
  for (const w of kept) {
    add(w);
    for (const syn of KEYWORD_SYNONYMS[w] || []) add(syn);
  }
  return [...expanded];
}

function tokenStems(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of String(text || '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (!w) continue;
    out.add(w);
    out.add(stem(w));
  }
  return out;
}

function buildSnippet(text: string, q: string): string {
  if (!text || !q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + q.length + 120);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return prefix + text.slice(start, end) + suffix;
}

// A keyword matches a field when its stemmed token is in the field's token
// set, or a multi-word keyword is a literal phrase inside it.
function kwIn(kw: string, text: string, stems: Set<string>): boolean {
  if (kw.includes(' ')) return text.includes(kw);
  return stems.has(kw);
}

export function searchArchive(q: string, data: SearchArchiveData): SearchResult {
  const query = String(q || '').trim().toLowerCase();
  if (!query) {
    return { entries: [], relationships: [], storyLinks: [], query, keywords: [] };
  }

  // Keyword lookup rather than literal substring search — "Who betrayed
  // Lisa?" tokenizes to [betrayed, lisa] and matches any field containing
  // those words, not the exact sentence.
  const keywords = extractKeywords(query);
  if (!keywords.length) {
    return { entries: [], relationships: [], storyLinks: [], query, keywords: [] };
  }
  // The whole query with stop words removed — a literal phrase hit (e.g.
  // "umbrage forest" in a name) outranks single-keyword noise.
  const phrase = query.split(/\s+/).filter((w) => !STOPWORDS.has(w)).join(' ');

  const matchingEntries: SearchMatch[] = data.entries
    .map((e) => {
      const name = e.name.toLowerCase();
      const sub = (e.subtitle || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      const desc = e.description.toLowerCase();
      const nameStems = tokenStems(e.name);
      const catStems = tokenStems(e.category);
      const subStems = tokenStems(e.subtitle);
      const descStems = tokenStems(e.description);
      const tagInfo = (e.tags || []).map((t) => ({ t, stems: tokenStems(t) }));
      const fieldInfo = (e.fields || []).map((f) => ({ f, stems: tokenStems(`${f.label} ${f.value}`) }));
      let score = 0;
      let catHit = false;
      const matched = new Set<string>();
      const matchIn: { field: string; snippet: string }[] = [];
      const pushHit = (field: string, snippet: string) => {
        if (!snippet || matchIn.length >= 8) return;
        if (matchIn.some((h) => h.field === field && h.snippet === snippet)) return;
        matchIn.push({ field, snippet });
      };
      for (const kw of keywords) {
        let hit = false;
        // Name is the strongest signal — the user may have typed the entry name.
        if (kwIn(kw, name, nameStems)) {
          score += name === kw ? 30 : 15;
          hit = true;
          pushHit('name', e.name);
        }
        if (kwIn(kw, cat, catStems)) {
          score += 2;
          hit = true;
          catHit = true;
          pushHit('category', e.category);
        }
        if (kwIn(kw, sub, subStems)) {
          score += 3;
          hit = true;
          pushHit('subtitle', e.subtitle);
        }
        // Tags are curated keywords — a tag hit is a good signal.
        const tagHit = tagInfo.find((ti) => kwIn(kw, ti.t.toLowerCase(), ti.stems));
        if (tagHit) {
          score += 6;
          hit = true;
          pushHit('tags', tagHit.t);
        }
        if (kwIn(kw, desc, descStems)) {
          score += 3;
          hit = true;
          pushHit('description', buildSnippet(e.description, kw));
        }
        const fieldHit =
          kw.length > 2 && fieldInfo.find((fi) => kwIn(kw, `${fi.f.label} ${fi.f.value}`.toLowerCase(), fi.stems));
        if (fieldHit) {
          score += 3;
          hit = true;
          pushHit('field', `${fieldHit.f.label}: ${buildSnippet(fieldHit.f.value, kw)}`);
        }
        if (hit) matched.add(kw);
      }
      if (phrase.includes(' ')) {
        if (name.includes(phrase)) {
          score += 40;
          pushHit('name', e.name);
        } else if (desc.includes(phrase)) {
          score += 15;
          pushHit('description', buildSnippet(e.description, phrase));
        }
      }
      // A category hit means the question is about a whole taxonomy (e.g.
      // "which race…" -> the Race Types category). Lift every entry in that
      // category so the full set surfaces, not just the one that repeated the
      // keyword.
      if (catHit) score += 20;
      // Entries that touch several aspects of the question are more relevant
      // than those that merely repeat a single common word.
      if (matched.size > 1) score += matched.size * 8;
      // Overview entries summarize their whole category — what "what is X" needs.
      if (name.includes('overview')) score += 8;
      const entry: SearchMatch = {
        id: e.id,
        category: e.category,
        name: e.name,
        subtitle: e.subtitle || '',
        description: e.description,
        fields: e.fields,
        tags: e.tags,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        matchIn,
      };
      return { score, entry };
    })
    // matchIn is only populated by real keyword/phrase hits — this keeps the
    // overview +8 bonus from surfacing entries that matched nothing.
    .filter((s) => s.entry.matchIn.length > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.entry);

  // Relationships and story links share the same shape and matching rules.
  const scoreLinkLike = (item: Relationship | StoryLink) => {
    const texts: Record<string, string> = {
      source: item.source.toLowerCase(),
      target: item.target.toLowerCase(),
      type: (item.type || '').toLowerCase(),
      label: (item.label || '').toLowerCase(),
      description: (item.description || '').toLowerCase(),
    };
    const stems: Record<string, Set<string>> = {
      source: tokenStems(item.source),
      target: tokenStems(item.target),
      type: tokenStems(item.type),
      label: tokenStems(item.label),
      description: tokenStems(item.description),
    };
    const weights: Record<string, number> = { source: 5, target: 5, type: 3, label: 3, description: 3 };
    let score = 0;
    const matched = new Set<string>();
    const matchIn: { field: string; snippet: string }[] = [];
    const pushHit = (field: string, snippet: string) => {
      if (!snippet || matchIn.length >= 6) return;
      if (matchIn.some((h) => h.field === field && h.snippet === snippet)) return;
      matchIn.push({ field, snippet });
    };
    for (const kw of keywords) {
      let hit = false;
      for (const field of Object.keys(texts)) {
        if (!texts[field] || !kwIn(kw, texts[field], stems[field])) continue;
        score += weights[field];
        hit = true;
        const raw =
          field === 'source' ? item.source : field === 'target' ? item.target : field === 'type' ? item.type : item.label;
        pushHit(field, field === 'description' ? buildSnippet(item.description, kw) : raw);
      }
      if (hit) matched.add(kw);
    }
    if (matched.size > 1) score += matched.size * 4;
    return { score, item, matchIn };
  };

  const toLinkMatch = (r: Relationship | StoryLink, matchIn: { field: string; snippet: string }[]): SearchMatch => ({
    id: r.id,
    source: r.source,
    target: r.target,
    type: r.type,
    label: r.label || '',
    description: r.description || '',
    color: r.color,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    matchIn,
  });

  const matchingRels = data.relationships
    .map((r) => scoreLinkLike(r))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => toLinkMatch(s.item, s.matchIn));

  const matchingLinks = data.storyLinks
    .map((l) => scoreLinkLike(l))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => toLinkMatch(s.item, s.matchIn));

  // Broad keyword queries (synonym expansions especially) can match most of
  // the archive — cap what's returned for rendering, but report the real
  // totals so the answer can say "showing the top N of M".
  const totals = {
    entries: matchingEntries.length,
    relationships: matchingRels.length,
    storyLinks: matchingLinks.length,
  };

  return {
    entries: matchingEntries.slice(0, 50),
    relationships: matchingRels.slice(0, 25),
    storyLinks: matchingLinks.slice(0, 30),
    query,
    keywords,
    totals,
  };
}

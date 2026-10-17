const express = require('express');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const cors = require('cors');
const crypto = require('crypto');
const Groq = require('groq-sdk');
const {
  loadWorld,
  saveWorld,
  resetWorld,
  loadRelationships,
  saveRelationships,
  resetRelationships,
  loadStoryLinks,
  saveStoryLinks,
  resetStoryLinks,
} = require('./storage');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 5001;

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

function cleanFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((f) => f && typeof f === 'object' && f.label && f.value)
    .map((f) => ({ label: String(f.label).trim(), value: String(f.value).trim() }))
    .filter((f) => f.label && f.value);
}

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => String(t).trim()).filter(Boolean);
}

function matchesSearch(entry, q) {
  return (
    entry.name.toLowerCase().includes(q) ||
    (entry.subtitle || '').toLowerCase().includes(q) ||
    entry.description.toLowerCase().includes(q) ||
    (entry.tags || []).some((t) => t.toLowerCase().includes(q)) ||
    (entry.fields || []).some((f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q))
  );
}

// --- Categories -----------------------------------------------------------
app.get('/api/categories', (req, res) => {
  const world = loadWorld();
  const counts = {};
  for (const entry of world) {
    counts[entry.category] = (counts[entry.category] || 0) + 1;
  }
  const list = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(list);
});

// Delete a category and all of its entries, plus any relationships/story
// links that reference the removed entries.
app.delete('/api/categories/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const world = loadWorld();
  const removed = world.filter((e) => e.category === name);
  if (removed.length === 0) {
    return res.status(404).json({ error: 'Category not found or already empty' });
  }
  const removedNames = new Set(removed.map((e) => e.name));
  saveWorld(world.filter((e) => e.category !== name));

  let relationshipsRemoved = 0;
  const rels = loadRelationships();
  saveRelationships(
    rels.filter((r) => {
      const drop = removedNames.has(r.source) || removedNames.has(r.target);
      if (drop) relationshipsRemoved += 1;
      return !drop;
    }),
  );

  let storyLinksRemoved = 0;
  const links = loadStoryLinks();
  saveStoryLinks(
    links.filter((l) => {
      const drop = removedNames.has(l.source) || removedNames.has(l.target);
      if (drop) storyLinksRemoved += 1;
      return !drop;
    }),
  );

  res.json({ ok: true, deleted: removed.length, relationshipsRemoved, storyLinksRemoved });
});

// --- Entries --------------------------------------------------------------
app.get('/api/entries', (req, res) => {
  let world = loadWorld();
  const { category, search } = req.query;

  if (category) {
    world = world.filter((e) => e.category === category);
  }
  if (search) {
    const q = String(search).toLowerCase();
    world = world.filter((e) => matchesSearch(e, q));
  }

  res.json([...world].sort((a, b) => a.name.localeCompare(b.name)));
});

app.get('/api/entries/:id', (req, res) => {
  const world = loadWorld();
  const entry = world.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  res.json(entry);
});

app.post('/api/entries', (req, res) => {
  const { category, name, subtitle, description, fields, tags } = req.body || {};
  if (!category || !String(category).trim()) {
    return res.status(400).json({ error: 'A category is required' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'A name is required' });
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ error: 'A description is required' });
  }

  const entry = {
    id: uid(),
    category: String(category).trim(),
    name: String(name).trim(),
    subtitle: subtitle ? String(subtitle).trim() : '',
    description: String(description).trim(),
    fields: cleanFields(fields),
    tags: cleanTags(tags),
    createdAt: now(),
    updatedAt: now(),
  };

  const world = loadWorld();
  world.push(entry);
  saveWorld(world);
  res.status(201).json(entry);
});

app.put('/api/entries/:id', (req, res) => {
  const world = loadWorld();
  const idx = world.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Entry not found' });

  const existing = world[idx];
  const { category, name, subtitle, description, fields, tags } = req.body || {};

  const nextCategory = category !== undefined ? String(category).trim() : existing.category;
  const nextName = name !== undefined ? String(name).trim() : existing.name;
  const nextDescription = description !== undefined ? String(description).trim() : existing.description;
  if (!nextCategory) return res.status(400).json({ error: 'A category is required' });
  if (!nextName) return res.status(400).json({ error: 'A name is required' });
  if (!nextDescription) return res.status(400).json({ error: 'A description is required' });

  const updated = {
    ...existing,
    category: nextCategory,
    name: nextName,
    subtitle: subtitle !== undefined ? String(subtitle).trim() : existing.subtitle,
    description: nextDescription,
    fields: fields !== undefined ? cleanFields(fields) : existing.fields,
    tags: tags !== undefined ? cleanTags(tags) : existing.tags,
    updatedAt: now(),
  };

  world[idx] = updated;
  saveWorld(world);
  res.json(updated);
});

app.delete('/api/entries/:id', (req, res) => {
  const world = loadWorld();
  const idx = world.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Entry not found' });
  const [removed] = world.splice(idx, 1);
  saveWorld(world);
  res.json(removed);
});

// --- Generic link validation (relationships + story links) ----------------
function validateLink(body, partial) {
  const { source, target, type, label, description, color } = body || {};
  const nextSource = source !== undefined ? String(source).trim() : null;
  const nextTarget = target !== undefined ? String(target).trim() : null;
  const nextType = type !== undefined ? String(type).trim() : null;
  const nextColor = color !== undefined ? String(color).trim() : '';
  if (partial) {
    if (nextSource !== null && !nextSource) return { error: 'A source is required' };
    if (nextTarget !== null && !nextTarget) return { error: 'A target is required' };
    if (nextType !== null && !nextType) return { error: 'A link type is required' };
  } else {
    if (!nextSource) return { error: 'A source is required' };
    if (!nextTarget) return { error: 'A target is required' };
    if (!nextType) return { error: 'A link type is required' };
  }
  if (nextSource !== null && nextTarget !== null && nextSource === nextTarget) {
    return { error: 'Source and target must be different' };
  }
  return {
    data: {
      source: nextSource,
      target: nextTarget,
      type: nextType,
      label: label !== undefined ? String(label).trim() : '',
      description: description !== undefined ? String(description).trim() : '',
      ...(color !== undefined ? { color: nextColor } : {}),
    },
  };
}

function makeLinkRoutes(collection, loader, saver, label) {
  app.get(`/api/${collection}`, (req, res) => {
    res.json(loader());
  });

  app.post(`/api/${collection}`, (req, res) => {
    const check = validateLink(req.body, false);
    if (check.error) return res.status(400).json({ error: check.error });
    const item = { id: uid(), ...check.data, createdAt: now(), updatedAt: now() };
    const list = loader();
    list.push(item);
    saver(list);
    res.status(201).json(item);
  });

  app.put(`/api/${collection}/:id`, (req, res) => {
    const list = loader();
    const idx = list.findIndex((r) => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: `${label} not found` });
    const existing = list[idx];
    const check = validateLink(req.body, true);
    if (check.error) return res.status(400).json({ error: check.error });
    const updated = { ...existing, ...check.data, updatedAt: now() };
    list[idx] = updated;
    saver(list);
    res.json(updated);
  });

  app.delete(`/api/${collection}/:id`, (req, res) => {
    const list = loader();
    const idx = list.findIndex((r) => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: `${label} not found` });
    const [removed] = list.splice(idx, 1);
    saver(list);
    res.json(removed);
  });
}

makeLinkRoutes('relationships', loadRelationships, saveRelationships, 'Relationship');
makeLinkRoutes('story-links', loadStoryLinks, saveStoryLinks, 'Story link');

// --- Reset ----------------------------------------------------------------
app.post('/api/reset', (req, res) => {
  const world = resetWorld();
  const rels = resetRelationships();
  const links = resetStoryLinks();
  res.json({ ok: true, entries: world.length, relationships: rels.length, storyLinks: links.length });
});

// --- Archive search (chat-room style) -------------------------------------
function buildSnippet(text, q) {
  if (!text || !q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + q.length + 120);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

// A keyword matches a field when its stemmed token is in the field's token
// set, or (for multi-word keywords like "main character") appears literally.
function kwIn(kw, textLower, stems) {
  return kw.includes(' ') ? textLower.includes(kw) : stems.has(kw);
}

// Tokenize a field into raw AND stemmed words so plural/singular and
// punctuation variants all match ("Angels" -> angel, "abilities" -> ability).
function tokenStems(text) {
  const set = new Set();
  for (const w of String(text || '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (!w) continue;
    set.add(w);
    set.add(stem(w));
  }
  return set;
}

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ entries: [], relationships: [], storyLinks: [], query: q, keywords: [] });

  // Keyword lookup rather than literal substring search — "Who betrayed
  // Lisa?" tokenizes to [betrayed, lisa] and matches any field containing
  // those words, not the exact sentence.
  const keywords = extractKeywords(q);
  if (!keywords.length) return res.json({ entries: [], relationships: [], storyLinks: [], query: q, keywords: [] });
  // The whole query with stop words removed — a literal phrase hit (e.g.
  // "umbrage forest" in a name) outranks single-keyword noise.
  const phrase = q.split(/\s+/).filter((w) => !STOPWORDS.has(w)).join(' ');

  const world = loadWorld();
  const rels = loadRelationships();
  const links = loadStoryLinks();

  const matchingEntries = world
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
      const matched = new Set();
      const matchIn = [];
      const pushHit = (field, snippet) => {
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
      // than ones that merely repeat a single common word.
      if (matched.size > 1) score += matched.size * 8;
      // Overview entries summarize their whole category — what "what is X" needs.
      if (name.includes('overview')) score += 8;
      return {
        score,
        entry: {
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
        },
      };
    })
    // matchIn is only populated by real keyword/phrase hits — this keeps
    // the overview +8 bonus from surfacing entries that matched nothing.
    .filter((s) => s.entry.matchIn.length > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.entry);

  // Relationships and story links share the same shape and matching rules.
  const scoreLinkLike = (item) => {
    const texts = {
      source: item.source.toLowerCase(),
      target: item.target.toLowerCase(),
      type: (item.type || '').toLowerCase(),
      label: (item.label || '').toLowerCase(),
      description: (item.description || '').toLowerCase(),
    };
    const stems = {
      source: tokenStems(item.source),
      target: tokenStems(item.target),
      type: tokenStems(item.type),
      label: tokenStems(item.label),
      description: tokenStems(item.description),
    };
    const weights = { source: 5, target: 5, type: 3, label: 3, description: 3 };
    let score = 0;
    const matched = new Set();
    const matchIn = [];
    const pushHit = (field, snippet) => {
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
        pushHit(field, field === 'description' ? buildSnippet(item.description, kw) : item[field]);
      }
      if (hit) matched.add(kw);
    }
    if (matched.size > 1) score += matched.size * 4;
    return { score, item, matchIn };
  };

  const toLinkMatch = (r, matchIn) => ({
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

  const matchingRels = rels
    .map((r) => scoreLinkLike(r))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => toLinkMatch(s.item, s.matchIn));

  const matchingLinks = links
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

  res.json({
    entries: matchingEntries.slice(0, 50),
    relationships: matchingRels.slice(0, 25),
    storyLinks: matchingLinks.slice(0, 30),
    query: q,
    keywords,
    totals,
  });
});

// --- AI answer (Groq) ------------------------------------------------------
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Groq's free tier caps requests at ~8000 tokens per minute, so keep the
// archive context well under that (~1 token ≈ 4 chars).
const AI_CONTEXT_CHAR_BUDGET = 16000;
const AI_DESC_LIMIT = 800;
const AI_FIELD_LIMIT = 300;
const AI_SUBTITLE_LIMIT = 200;

function truncateForBudget(text, max) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).replace(/\s+\S*$/, '') + '…';
}

// Renders archive data into prompt lines while staying inside the char
// budget — items that no longer fit are dropped instead of blowing past
// Groq's token-per-minute limit (which fails the whole request).
function buildArchiveContext(data, budget = AI_CONTEXT_CHAR_BUDGET) {
  const lines = [];
  let used = 0;
  let dropped = false;

  const tryAdd = (line) => {
    if (used + line.length + 1 > budget) {
      dropped = true;
      return false;
    }
    lines.push(line);
    used += line.length + 1;
    return true;
  };

  const addEntry = (e) => {
    if (!tryAdd('- ' + e.name + ' (' + (e.category || '') + ')')) return;
    if (e.subtitle) tryAdd('  Subtitle: ' + truncateForBudget(e.subtitle, AI_SUBTITLE_LIMIT));
    if (e.description) tryAdd('  Description: ' + truncateForBudget(e.description, AI_DESC_LIMIT));
    for (const f of e.fields || []) {
      tryAdd('  ' + f.label + ': ' + truncateForBudget(f.value, AI_FIELD_LIMIT));
    }
    if (e.tags && e.tags.length) tryAdd('  Tags: ' + e.tags.join(', '));
    tryAdd('');
  };

  const addEdge = (r) => {
    const label = r.label || r.type || '';
    if (!tryAdd('- ' + r.source + ' --[' + label + ']--> ' + r.target)) return;
    if (r.description) tryAdd('  Description: ' + truncateForBudget(r.description, AI_FIELD_LIMIT));
    tryAdd('');
  };

  if ((data.entries || []).length) {
    tryAdd('=== ENTRIES ===');
    for (const e of data.entries) addEntry(e);
  }
  if ((data.relationships || []).length) {
    tryAdd('=== RELATIONSHIPS ===');
    for (const r of data.relationships) addEdge(r);
  }
  if ((data.storyLinks || []).length) {
    tryAdd('=== STORY LINKS ===');
    for (const l of data.storyLinks) addEdge(l);
  }

  if (!lines.length) return '(no data found in the archive for this query)';
  if (dropped) lines.push('(context trimmed to fit the AI token limit)');
  return lines.join('\n');
}

// Shared Groq call: low reasoning effort keeps gpt-oss-20b from burning the
// completion budget on hidden reasoning before it writes the answer.
async function askGroq(prompt, maxTokens = 1024) {
  const chat = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'openai/gpt-oss-20b',
    max_tokens: maxTokens,
    temperature: 0.2,
    reasoning_effort: 'low',
  });
  if (chat.usage) {
    console.log(`[ai] tokens: prompt=${chat.usage.prompt_tokens} completion=${chat.usage.completion_tokens}`);
  }
  const answer = chat.choices?.[0]?.message?.content || '';
  if (!answer.trim()) {
    throw new Error('The AI returned an empty answer — try rephrasing the question.');
  }
  return answer;
}

function sendAiError(res, tag, err) {
  console.error(`[ai] Groq ${tag} error:`, err.message);
  const status = err?.status || 0;
  if (status === 401) {
    return res.status(500).json({ error: 'The AI API key was rejected. Check GROQ_API_KEY on the server.' });
  }
  if (status === 413 || status === 429 || /rate_limit_exceeded|tokens per minute|too large/i.test(err.message || '')) {
    return res.status(429).json({ error: 'The AI hit its usage limit (free Groq tier). Wait a minute and try again.' });
  }
  res.status(500).json({ error: 'AI request failed: ' + (err.message || 'unknown error') });
}

app.post('/api/ai/answer', async (req, res) => {
  const { question, searchResult } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'A question is required.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'AI is not configured. Set GROQ_API_KEY on the server.' });
  }

  const context = buildArchiveContext(searchResult || {});
  const prompt = `You are an assistant for a worldbuilding archive. Answer the user's question using ONLY the information below. Do not invent, assume, or bring in outside knowledge.

=== QUESTION ===
${question}

=== ARCHIVE DATA ===
${context}

=== RULES ===
- Answer in a clear, conversational tone.
- Only use facts from the ARCHIVE DATA above.
- Cite which entry, relationship, or story link the information comes from.
- If the ARCHIVE DATA is empty or nothing matches the question, do NOT just say "nothing matches." Instead, briefly explain what the archive contains in general (how many entries, what categories exist, what kinds of things are documented) and suggest what kinds of terms might find results — for example, try a character name, a place name, or a category. Do not invent facts about the world, but it is fine to describe the shape and scope of the archive itself.
- If the ARCHIVE DATA holds related facts but no explicit record that answers the question (e.g. a ranking, a "strongest", a title nobody is given), do NOT refuse. Reason from the documented facts and give your best judgment, clearly labelled as your own conclusion, not canon — e.g. "The archive never ranks them, but by its own logic X is the strongest because…". Name the specific facts you reasoned from and never invent facts to support the judgment.
- If a table would help (e.g. comparing several things), use valid GitHub-flavoured markdown: a header row, a separator row like | --- | --- |, then one row per item. Keep tables narrow (2–4 columns). Do not use HTML tags (<br>, <br/>, etc.) — use plain text.`;

  try {
    const answer = await askGroq(prompt);
    res.json({ answer });
  } catch (err) {
    sendAiError(res, 'answer', err);
  }
});

// --- AI explore: the AI gets the full archive and finds answers on its own ---
// Stopword filter as an explicit Set - plain JS, no regex escaping to break.
const STOPWORDS = new Set([
  'who', 'what', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were', 'does', 'do', 'did',
  'can', 'could', 'would', 'should', 'may', 'might', 'shall', 'will', 'tell', 'me', 'about',
  'the', 'a', 'an', 'of', 'in', 'on', 'to', 'for', 'with', 'and', 'or', 'that', 'this', 'it',
  'i', 'my', 'we', 'you', 'your', 'he', 'she', 'they', 'its', 'his', 'her', 'their',
  'be', 'been', 'being', 'have', 'has', 'had', 'from', 'by', 'at', 'as', 'if', 'into', 'not', 'please',
  'long', 'ago', 'far', 'much', 'many', 'get', 'got', 'use', 'used', 'there', 'here',
  'which', 'whose', 'whom', 'most', 'kinds', 'kind',
]);

function extractKeywords(question) {
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
  const expanded = new Set();
  const add = (term) => {
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

// Lightweight singular stem so plural/singular tag and name variants match
// (angels -> angel, abilities -> ability, classes -> class).
function stem(w) {
  const s = String(w).toLowerCase();
  if (s.endsWith('ies') && s.length > 4) return s.slice(0, -3) + 'y';
  if (s.endsWith('sses')) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) return s.slice(0, -1);
  return s;
}

// Shorthand/vague terms users type, expanded so keyword matching still finds
// entries tagged with the full term (e.g. "mc" -> entries tagged "main character").
const KEYWORD_SYNONYMS = {
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

// Compact index of EVERY entry in the archive, grouped by category (~5k
// tokens). Explore mode pairs this with details for the closest matches so
// the AI reasons over the whole archive while staying under Groq's free-tier
// per-request token limit.
function buildArchiveIndex(maxChars = 16000) {
  const world = loadWorld();
  const byCat = {};
  for (const e of world) {
    const cat = e.category || 'Uncategorized';
    (byCat[cat] = byCat[cat] || []).push(e.name);
  }
  const lines = ['TOTAL ENTRIES: ' + world.length];
  let chars = 0;
  let listed = 0;
  for (const cat of Object.keys(byCat).sort()) {
    const names = byCat[cat];
    const prefix = cat + ' (' + names.length + '): ';
    const remaining = maxChars - chars - prefix.length - 1;
    if (remaining <= 0) {
      lines.push(prefix + '… (' + names.length + ' entries, not listed due to size)');
      continue;
    }
    // Fit as many names as the budget allows instead of dropping the whole
    // category — every category stays visible in the index.
    let fitted = [];
    let used = 0;
    for (const n of names) {
      const add = n.length + (fitted.length ? 2 : 0);
      if (used + add > remaining) break;
      fitted.push(n);
      used += add;
    }
    if (fitted.length === names.length) {
      lines.push(prefix + names.join(', '));
      chars += prefix.length + used + 1;
    } else {
      lines.push(prefix + fitted.join(', ') + ', … (' + (names.length - fitted.length) + ' more)');
      chars += prefix.length + remaining + 1;
    }
    listed += fitted.length;
  }
  return lines.join('\n');
}

function broadSearch(question) {
  const keywords = extractKeywords(question);
  if (!keywords.length) return { entries: [], relationships: [], storyLinks: [] };
  const world = loadWorld();
  const rels = loadRelationships();
  const links = loadStoryLinks();

  // Tokenize a field into a set of raw AND stemmed words so plural/singular
  // and punctuation variants all match ("Angels" -> angel, "abilities" -> ability).
  const tokenStems = (text) => {
    const set = new Set();
    for (const w of String(text || '').toLowerCase().split(/[^a-z0-9]+/)) {
      if (!w) continue;
      set.add(w);
      set.add(stem(w));
    }
    return set;
  };

  const scoredEntries = world
    .map((e) => {
      const name = e.name.toLowerCase();
      const nameStems = tokenStems(e.name);
      const catStems = tokenStems(e.category);
      const subStems = tokenStems(e.subtitle);
      const descStems = tokenStems(e.description);
      const tagStems = new Set();
      for (const t of e.tags || []) for (const s of tokenStems(t)) tagStems.add(s);
      const fieldStems = new Set();
      for (const f of e.fields || []) {
        for (const s of tokenStems(f.label)) fieldStems.add(s);
        for (const s of tokenStems(f.value)) fieldStems.add(s);
      }
      let score = 0;
      const matched = new Set();
      let catHit = false;
      for (const kw of keywords) {
        let hit = false;
        // Name is the strongest signal — the user may have typed the entry name.
        if (name === kw) { score += 30; hit = true; }
        else if (nameStems.has(kw)) { score += 15; hit = true; }
        if (catStems.has(kw)) { score += 2; hit = true; catHit = true; }
        if (subStems.has(kw)) { score += 3; hit = true; }
        // Tags are curated keywords — a tag hit is a good signal.
        if (tagStems.has(kw)) { score += 6; hit = true; }
        if (descStems.has(kw)) { score += 3; hit = true; }
        if (kw.length > 2 && fieldStems.has(kw)) { score += 3; hit = true; }
        if (hit) matched.add(kw);
      }
      // A category hit means the question is about a whole taxonomy (e.g.
      // "which race…" -> the Race Types category). Lift every entry in that
      // category so the full set surfaces, not just the one that repeated the
      // keyword.
      if (catHit) score += 20;
      // Entries that touch several aspects of the question are more relevant
      // than ones that merely repeat a single common word.
      if (matched.size > 1) score += matched.size * 8;
      // Overview entries summarize their whole category — what "what is X" needs.
      if (name.includes('overview')) score += 8;
      // Boost character entries when the question hints at a person.
      if ((e.category || '').toLowerCase() === 'characters' && (keywords.includes('who') || keywords.includes('mc') || keywords.includes('character') || keywords.includes('main'))) {
        score += 2;
      }
      return { entry: e, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map((s) => s.entry);

  const scoredRels = rels
    .map((r) => {
      const src = r.source.toLowerCase();
      const tgt = r.target.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (src.includes(kw) || tgt.includes(kw)) score += 3;
      }
      return { rel: r, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.rel);

  const scoredLinks = links
    .map((l) => {
      const src = l.source.toLowerCase();
      const tgt = l.target.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (src.includes(kw) || tgt.includes(kw)) score += 3;
      }
      return { link: l, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.link);

  return { entries: scoredEntries, relationships: scoredRels, storyLinks: scoredLinks };
}

app.post('/api/ai/explore', async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'A question is required.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'AI is not configured. Set GROQ_API_KEY on the server.' });
  }

  // Broad keyword search across the whole archive — wider than query mode so
  // vague questions like "who is the mc" still find relevant entries.
  const results = broadSearch(question);
  // Budget-aware context: keeps names/categories/descriptions within the
  // free-tier token limit instead of blowing past it on broad matches.
  // Details for the closest matches, PLUS a full index of every entry name
  // in the archive — the AI sees the whole world, not just keyword hits.
  const context = buildArchiveContext(results, 9000);
  const archiveIndex = buildArchiveIndex();
  const prompt = `You are an explorer of a worldbuilding archive. You are given TWO things: (1) a FULL INDEX of every entry in the archive (names only, grouped by category) and (2) DETAILED SEARCH RESULTS for the entries most relevant to the question. Use the index to spot entries the search results missed — if an entry name in the index looks relevant but has no details below, reason from its name and category, and name it in your answer as a lead. Answer the user's question using this data.

If the question is vague (e.g. "who is the mc"), interpret it in the most useful way based on what's in the data — look for main characters, protagonists, key figures, etc.

=== QUESTION ===
${question}

=== FULL ARCHIVE INDEX (every entry, grouped by category) ===
${archiveIndex}

=== SEARCH RESULTS (closest matches for the question) ===
${context}

=== RULES ===
- Answer in a clear, conversational tone.
- Only use facts from the INDEX and SEARCH RESULTS above.
- Cite which entry, relationship, or story link the information comes from.
- Do NOT stitch facts from different entries into new cause-and-effect the archive never states (e.g. don't turn "Veyn returns to the core when a demon dies" into "running out of Veyn kills a demon"). If two entries touch the question, present each fact separately and say the archive does not link them.
- Quote numbers, prices, and exchange rates EXACTLY as the archive states them. Never approximate, round, or invent numeric values — if the archive says 100 Silver = 1 Gold, never say "roughly 10".
- If the archive contains no explicit record that answers the question (no ranking, no stated "strongest", no title anyone is given), do NOT simply say there is no record. Reason from the documented facts and give a best-judgment answer, clearly labelled as your own conclusion, not canon — e.g. "There is no direct record, but by the archive's own logic X is the strongest because…". Name the specific entries/facts you reasoned from. Never invent facts to support the judgment.
- When judging strength, power, or rank, weigh each candidate by its DOCUMENTED feats and abilities (e.g. what it can destroy, survive, or create) — not by its current status. An extinct or fallen race may have been the most powerful; "extinct" is not a weakness. When the question is about a whole category (e.g. races), cover EVERY entry listed under that category in the index, not just the ones the search surfaced.
- If you genuinely cannot find anything relevant, say so plainly and point to the closest entries by name.
- Keep the answer focused (roughly 150 words; a ranking or list may run a little longer if needed).
- If a table would help (e.g. comparing several things), use valid GitHub-flavoured markdown: a header row, a separator row like | --- | --- |, then one row per item. Keep tables narrow (2–4 columns). Do not use HTML tags (<br>, <br/>, etc.) — use plain text.`;

  try {
    const answer = await askGroq(prompt, 900);
    res.json({ answer });
  } catch (err) {
    sendAiError(res, 'explore', err);
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[half-made-world] server listening on http://localhost:${PORT}`);
  });
}

// Exported for tests/debug tooling (requiring this module does not start the server).
module.exports = { extractKeywords, broadSearch, buildArchiveContext, buildArchiveIndex };
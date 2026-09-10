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

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ entries: [], relationships: [], storyLinks: [], query: q });

  const world = loadWorld();
  const rels = loadRelationships();
  const links = loadStoryLinks();

  const matchingEntries = world
    .filter((e) =>
      e.name.toLowerCase().includes(q) ||
      (e.subtitle || '').toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      (e.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      (e.fields || []).some((f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q)),
    )
    .map((e) => ({
      id: e.id,
      category: e.category,
      name: e.name,
      subtitle: e.subtitle || '',
      description: e.description,
      fields: e.fields,
      tags: e.tags,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      matchIn: [
        ...(e.name.toLowerCase().includes(q) ? [{ field: 'name', snippet: e.name }] : []),
        ...(e.subtitle && e.subtitle.toLowerCase().includes(q) ? [{ field: 'subtitle', snippet: e.subtitle }] : []),
        ...(e.description.toLowerCase().includes(q) ? [{ field: 'description', snippet: buildSnippet(e.description, q) }] : []),
        ...((e.tags || []).filter((t) => t.toLowerCase().includes(q)).map((t) => ({ field: 'tags', snippet: t }))),
        ...(e.fields || [])
          .filter((f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q))
          .map((f) => ({ field: 'field', snippet: `${f.label}: ${f.value}` })),
      ],
    }));

  const matchingRels = rels
    .filter(
      (r) =>
        r.source.toLowerCase().includes(q) ||
        r.target.toLowerCase().includes(q) ||
        (r.type || '').toLowerCase().includes(q) ||
        (r.label || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q),
    )
    .map((r) => ({
      id: r.id,
      source: r.source,
      target: r.target,
      type: r.type,
      label: r.label || '',
      description: r.description || '',
      color: r.color,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      matchIn: [
        ...(r.source.toLowerCase().includes(q) ? [{ field: 'source', snippet: r.source }] : []),
        ...(r.target.toLowerCase().includes(q) ? [{ field: 'target', snippet: r.target }] : []),
        ...((r.type || '').toLowerCase().includes(q) ? [{ field: 'type', snippet: r.type }] : []),
        ...((r.label || '').toLowerCase().includes(q) ? [{ field: 'label', snippet: r.label }] : []),
        ...(r.description && r.description.toLowerCase().includes(q)
          ? [{ field: 'description', snippet: buildSnippet(r.description, q) }]
          : []),
      ],
    }));

  const matchingLinks = links
    .filter(
      (l) =>
        l.source.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        (l.type || '').toLowerCase().includes(q) ||
        (l.label || '').toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q),
    )
    .map((l) => ({
      id: l.id,
      source: l.source,
      target: l.target,
      type: l.type,
      label: l.label || '',
      description: l.description || '',
      color: l.color,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      matchIn: [
        ...(l.source.toLowerCase().includes(q) ? [{ field: 'source', snippet: l.source }] : []),
        ...(l.target.toLowerCase().includes(q) ? [{ field: 'target', snippet: l.target }] : []),
        ...((l.type || '').toLowerCase().includes(q) ? [{ field: 'type', snippet: l.type }] : []),
        ...((l.label || '').toLowerCase().includes(q) ? [{ field: 'label', snippet: l.label }] : []),
        ...(l.description && l.description.toLowerCase().includes(q)
          ? [{ field: 'description', snippet: buildSnippet(l.description, q) }]
          : []),
      ],
    }));

  res.json({ entries: matchingEntries, relationships: matchingRels, storyLinks: matchingLinks, query: q });
});

// --- AI answer (Groq) ------------------------------------------------------
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

function buildContext(result) {
  const parts = [];
  const entries = result.entries || [];
  const relationships = result.relationships || [];
  const storyLinks = result.storyLinks || [];
  if (entries.length) {
    parts.push('=== ENTRIES ===');
    for (const e of entries) {
      parts.push('- ' + e.name + ' (' + (e.category || '') + ')');
      if (e.subtitle) parts.push('  Subtitle: ' + e.subtitle);
      if (e.description) parts.push('  Description: ' + e.description);
      if (e.fields && e.fields.length) {
        for (const f of e.fields) parts.push('  ' + f.label + ': ' + f.value);
      }
      if (e.tags && e.tags.length) parts.push('  Tags: ' + e.tags.join(', '));
      parts.push('');
    }
  }
  if (relationships.length) {
    parts.push('=== RELATIONSHIPS ===');
    for (const r of relationships) {
      parts.push('- ' + r.source + ' --[' + (r.type || '') + ']--> ' + r.target);
      if (r.label) parts.push('  Label: ' + r.label);
      if (r.description) parts.push('  Description: ' + r.description);
      parts.push('');
    }
  }
  if (storyLinks.length) {
    parts.push('=== STORY LINKS ===');
    for (const l of storyLinks) {
      parts.push('- ' + l.source + ' --[' + (l.type || '') + ']--> ' + l.target);
      if (l.label) parts.push('  Label: ' + l.label);
      if (l.description) parts.push('  Description: ' + l.description);
      parts.push('');
    }
  }
  if (!parts.length) return '(no data found in the archive for this query)';
  return parts.join('\n');
}

app.post('/api/ai/answer', async (req, res) => {
  const { question, searchResult } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'A question is required.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'AI is not configured. Set GROQ_API_KEY on the server.' });
  }

  const context = buildContext(searchResult);
  const prompt = `You are an assistant for a worldbuilding archive. Answer the user's question using ONLY the information below. Do not invent, assume, or bring in outside knowledge. If the information is not in the data below, say so plainly.

=== QUESTION ===
${question}

=== ARCHIVE DATA ===
${context}

=== RULES ===
- Answer in a clear, conversational tone.
- Only use facts from the ARCHIVE DATA above.
- Cite which entry, relationship, or story link the information comes from.
- If nothing matches the question, say: "I don't have anything in the archive that answers that question."
- Keep the answer focused and not too long.`;

  try {
    const chat = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-20b',
      max_tokens: 1024,
      temperature: 0.2,
    });
    const answer = chat.choices[0]?.message?.content || '';
    res.json({ answer });
  } catch (err) {
    console.error('[ai] Groq error:', err.message);
    res.status(500).json({ error: 'AI request failed: ' + (err.message || 'unknown error') });
  }
});

app.listen(PORT, () => {
  console.log(`[half-made-world] server listening on http://localhost:${PORT}`);
});

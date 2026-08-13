const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
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

app.listen(PORT, () => {
  console.log(`[half-made-world] server listening on http://localhost:${PORT}`);
});

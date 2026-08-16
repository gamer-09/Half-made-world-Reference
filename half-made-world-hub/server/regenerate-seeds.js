/**
 * One-off generator: rebuilds the three seed files from the live JSON data
 * (world.json, story-links.json, relationships.json) so the seed stays in sync
 * with the source of truth. Preserves the e()/s()/r() helper style and seededAt.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const seededAt = '2026-08-12T00:00:00.000Z';

const world = JSON.parse(fs.readFileSync(path.join(DATA, 'world.json'), 'utf8'));
const links = JSON.parse(fs.readFileSync(path.join(DATA, 'story-links.json'), 'utf8'));
const rels = JSON.parse(fs.readFileSync(path.join(DATA, 'relationships.json'), 'utf8'));

// Escape a string as a JS double-quoted literal (JSON.stringify handles this).
const q = (s) => JSON.stringify(s);

// --- seed.js ---
let seedOut = `/**
 * Seed data for the Half-Made World — transcribed from "Half_made world ideas.docx".
 * This runs once to create server/data/world.json, after which the user's edits
 * are the source of truth. Use POST /api/reset to restore this seed.
 */
const seededAt = '2026-08-12T00:00:00.000Z';

let n = 0;
function e(category, name, subtitle, description, fields = [], tags = []) {
  n += 1;
  return {
    id: 'seed-' + String(n).padStart(3, '0'),
    category,
    name,
    subtitle,
    description,
    fields,
    tags,
    createdAt: seededAt,
    updatedAt: seededAt,
  };
}

module.exports = [
`;

let lastCat = null;
for (const en of world) {
  if (en.category !== lastCat) {
    seedOut += `\n  // ============================================================ ${en.category.toUpperCase()}\n`;
    lastCat = en.category;
  }
  seedOut += `  e(\n`;
  seedOut += `    ${q(en.category)},\n`;
  seedOut += `    ${q(en.name)},\n`;
  seedOut += `    ${q(en.subtitle)},\n`;
  seedOut += `    ${q(en.description)},\n`;
  if (en.fields && en.fields.length) {
    seedOut += `    [\n`;
    for (const f of en.fields) {
      seedOut += `      { label: ${q(f.label)}, value: ${q(f.value)} },\n`;
    }
    seedOut += `    ],\n`;
  } else {
    seedOut += `    [],\n`;
  }
  if (en.tags && en.tags.length) {
    seedOut += `    [${en.tags.map((t) => q(t)).join(', ')}],\n`;
  } else {
    seedOut += `    [],\n`;
  }
  seedOut += `  ),\n`;
}
seedOut += `];\n`;

fs.writeFileSync(path.join(__dirname, 'seed.js'), seedOut, 'utf8');

// --- seed-story-links.js ---
let linksOut = `/**
 * Story web seed — the whole-world connection map, grounded in "Half_made world ideas.docx".
 * Links entries (and characters) to each other: located in, guards, rules, kills, sealed in, etc.
 * Node names must match entry names (case-insensitive, prefix allowed).
 */
const seededAt = '2026-08-12T00:00:00.000Z';

let n = 0;
function s(source, target, type, label, description) {
  n += 1;
  return {
    id: 'link-seed-' + String(n).padStart(3, '0'),
    source,
    target,
    type,
    label,
    description,
    createdAt: seededAt,
    updatedAt: seededAt,
  };
}

module.exports = [
`;
for (const l of links) {
  linksOut += `  s(${q(l.source)}, ${q(l.target)}, ${q(l.type)}, ${q(l.label)}, ${q(l.description)}),\n`;
}
linksOut += `];\n`;
fs.writeFileSync(path.join(__dirname, 'seed-story-links.js'), linksOut, 'utf8');

// --- seed-relationships.js ---
let relsOut = `/**
 * Seed relationships between characters — grounded in "Half_made world ideas.docx".
 * Stored separately from entries so the archive stays pristine.
 * source -> target (directed). type drives the color/legend in the UI.
 */
const seededAt = '2026-08-12T00:00:00.000Z';

let n = 0;
function r(source, target, type, label, description) {
  n += 1;
  return {
    id: 'rel-seed-' + String(n).padStart(3, '0'),
    source,
    target,
    type,
    label,
    description,
    createdAt: seededAt,
    updatedAt: seededAt,
  };
}

module.exports = [
`;
for (const rl of rels) {
  relsOut += `  r(${q(rl.source)}, ${q(rl.target)}, ${q(rl.type)}, ${q(rl.label)}, ${q(rl.description)}),\n`;
}
relsOut += `];\n`;
fs.writeFileSync(path.join(__dirname, 'seed-relationships.js'), relsOut, 'utf8');

console.log('Regenerated seed.js (' + world.length + ' entries), seed-story-links.js (' + links.length + ' links), seed-relationships.js (' + rels.length + ' rels).');

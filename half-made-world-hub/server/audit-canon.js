/**
 * Hub canon audit — adapted from the Worldbuilding Codex audit methodology
 * (github.com/alainator/worldcodex, MIT): scope -> scan -> triage -> verify.
 *
 * Checks the Half-Made World archive for:
 *   BROKEN-REF   story-link / relationship endpoints that resolve to no entry
 *   DUPLICATE    two entries sharing a name
 *   DRIFT        near-identical entry names (typo / casing / spacing variants)
 *   GAP          truncated or missing descriptions
 *   META         meta-commentary / placeholder language in canon text
 *   CONTRADICTION  conflicting "first / only" claims about a unique thing
 *
 * Usage:  node server/audit-canon.js
 * Exit code 0 always (report-only; it never edits files).
 */
const fs = require('fs');
const path = require('path');

const D = path.join(__dirname, 'data');
const world = JSON.parse(fs.readFileSync(path.join(D, 'world.json'), 'utf8'));
const links = JSON.parse(fs.readFileSync(path.join(D, 'story-links.json'), 'utf8'));
const rels = JSON.parse(fs.readFileSync(path.join(D, 'relationships.json'), 'utf8'));

const names = new Set(world.map((e) => e.name));
const idSet = new Set(world.map((e) => e.id));
const lowerNames = new Set(world.map((e) => e.name.toLowerCase()));

// Names that are intentionally duplicated or intentionally similar.
const KNOWN_DUPES = new Set(['twilight veyn']);
// Distinct-but-similar names that are NOT drift (different things sharing a stem).
const KNOWN_DISTINCT = [
  ['heart-bind', 'heartbind'],
  ['bond-sight', 'bond sight'],
];

const out = { 'BROKEN-REF': [], DUPLICATE: [], DRIFT: [], GAP: [], META: [], CONTRADICTION: [] };
const resolve = (v) => names.has(v) || idSet.has(v) || lowerNames.has(String(v).toLowerCase());
const isKnownDistinct = (a, b) => KNOWN_DISTINCT.some((p) => p.includes(a.toLowerCase()) && p.includes(b.toLowerCase()));

// BROKEN-REF
for (const l of links) {
  for (const end of ['source', 'target']) {
    if (l[end] && !resolve(l[end])) out['BROKEN-REF'].push({ file: 'story-links', id: l.id, end, value: l[end] });
  }
}
for (const r of rels) {
  for (const end of ['source', 'target']) {
    if (r[end] && !resolve(r[end])) out['BROKEN-REF'].push({ file: 'relationships', id: r.id, end, value: r[end] });
  }
}

// DUPLICATE
const byLower = new Map();
for (const e of world) {
  const k = e.name.toLowerCase();
  if (!byLower.has(k)) byLower.set(k, []);
  byLower.get(k).push(e);
}
for (const [k, arr] of byLower) {
  if (arr.length > 1 && !KNOWN_DUPES.has(k)) out.DUPLICATE.push({ name: arr[0].name, ids: arr.map((e) => e.id), categories: arr.map((e) => e.category) });
}

// DRIFT — same normalized name (ignoring case/space/punctuation)
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const normMap = new Map();
for (const e of world) {
  const n = norm(e.name);
  if (!normMap.has(n)) normMap.set(n, []);
  normMap.get(n).push(e.name);
}
for (const [n, arr] of normMap) {
  const uniq = [...new Set(arr)];
  if (uniq.length > 1 && !isKnownDistinct(uniq[0], uniq[1])) out.DRIFT.push({ normalized: n, variants: uniq });
}

// GAP — truncated description (ends mid-word or with a trailing connector) or empty
const TRUNC = /(\b(and|or|the|a|an|of|to|with|using|by|in|for|from|that|which|as|into))$/i;
for (const e of world) {
  const desc = (e.description || '').trim();
  if (desc.length === 0) out.GAP.push({ name: e.name, id: e.id, category: e.category, issue: 'empty description' });
  else if (TRUNC.test(desc) || (!/[.!?"')\]]$/.test(desc) && desc.length < 200 && !desc.includes('\n')))
    out.GAP.push({ name: e.name, id: e.id, category: e.category, issue: 'possibly truncated: "' + desc.slice(-40) + '"' });
}

// META — placeholder / self-referential language
const META_PHRASES = [/\bTODO\b/i, /\bTBD\b/i, /\bFIXME\b/i, /lorem ipsum/i, /placeholder/i, /this (section|entry|document) (establishes|describes|outlines)/i, /in this (article|page)/i, /as (mentioned|noted|described) (above|below)/i];
for (const e of world) {
  const text = (e.description || '') + ' ' + (e.fields || []).map((f) => f.value).join(' ');
  for (const re of META_PHRASES) {
    const m = text.match(re);
    if (m) { out.META.push({ name: e.name, id: e.id, match: m[0] }); break; }
  }
}

// CONTRADICTION — entries claiming a different "Nth/only" for the same unique thing
const uniqueClaims = [/\bfirst (and only )?(angel.?demon )?hybrid/i, /\bonly (angel.?demon )?hybrid/i, /\bsecond hybrid\b/i];
const claimBuckets = new Map();
for (const e of world) {
  const text = (e.description || '') + ' ' + (e.fields || []).map((f) => f.value).join(' ');
  for (const re of uniqueClaims) {
    const m = text.match(re);
    if (m) {
      const key = m[0].toLowerCase();
      if (!claimBuckets.has(key)) claimBuckets.set(key, []);
      claimBuckets.get(key).push({ name: e.name, id: e.id });
    }
  }
}
for (const [claim, arr] of claimBuckets) out.CONTRADICTION.push({ claim, sources: arr.map((a) => a.name + ' (' + a.id + ')') });

// Report
const order = ['CONTRADICTION', 'BROKEN-REF', 'DUPLICATE', 'DRIFT', 'GAP', 'META'];
console.log('HUB CANON AUDIT');
console.log('entries=' + world.length + '  story-links=' + links.length + '  relationships=' + rels.length);
let total = 0;
for (const key of order) {
  const arr = out[key];
  total += arr.length;
  console.log('\n===== ' + key + ' (' + arr.length + ') =====');
  for (const x of arr.slice(0, 50)) console.log('  ' + JSON.stringify(x));
  if (arr.length > 50) console.log('  ... +' + (arr.length - 50) + ' more');
}
console.log('\nTotal findings: ' + total);

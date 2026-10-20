/**
 * Hub canon audit — CLI wrapper around the shared rules in canon-rules.js.
 * Adapted from the Worldbuilding Codex audit methodology
 * (github.com/alainator/worldcodex, MIT): scope -> scan -> triage -> verify.
 *
 * Checks the Half-Made World archive for:
 *   CONTRADICTION  conflicting "first / only" claims about a unique thing
 *   BROKEN-REF     story-link / relationship endpoints that resolve to no entry
 *   DUPLICATE      two entries sharing a name
 *   DRIFT          near-identical entry names (typo / casing / spacing variants)
 *   GAP            truncated or empty descriptions
 *   META           meta-commentary / placeholder language in canon text
 *
 * Usage:  node server/audit-canon.js [--all]
 *   --all also reports the informational ORPHAN / SUGGESTED-LINK rules.
 * Exit code 0 always (report-only; it never edits files).
 */
const fs = require('fs');
const path = require('path');
const { lintArchive } = require('./canon-rules');

const D = path.join(__dirname, 'data');
const world = JSON.parse(fs.readFileSync(path.join(D, 'world.json'), 'utf8'));
const links = JSON.parse(fs.readFileSync(path.join(D, 'story-links.json'), 'utf8'));
const rels = JSON.parse(fs.readFileSync(path.join(D, 'relationships.json'), 'utf8'));

const findings = lintArchive({ world, links, rels });
const all = process.argv.includes('--all');

const order = all
  ? ['CONTRADICTION', 'BROKEN-REF', 'DUPLICATE', 'DRIFT', 'GAP', 'META', 'ORPHAN', 'SUGGESTED-LINK']
  : ['CONTRADICTION', 'BROKEN-REF', 'DUPLICATE', 'DRIFT', 'GAP', 'META'];

const buckets = {};
for (const key of order) buckets[key] = [];
for (const f of findings) if (buckets[f.rule]) buckets[f.rule].push(f);

console.log('HUB CANON AUDIT');
console.log('entries=' + world.length + '  story-links=' + links.length + '  relationships=' + rels.length);
let total = 0;
for (const key of order) {
  const arr = buckets[key];
  total += arr.length;
  console.log('\n===== ' + key + ' (' + arr.length + ') =====');
  for (const x of arr.slice(0, 50)) {
    const { rule, severity, message, ...rest } = x;
    console.log('  ' + JSON.stringify(rest));
  }
  if (arr.length > 50) console.log('  ... +' + (arr.length - 50) + ' more');
}
console.log('\nTotal findings: ' + total);

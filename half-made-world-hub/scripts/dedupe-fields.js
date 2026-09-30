// Field-vs-description dedupe: remove sentences from FIELD values that
// duplicate (exactly or near-verbatim) sentences in the entry description.
// The description keeps the content; fields keep only unique text.
// Usage: node scripts/dedupe-fields.js            (report)
//        node scripts/dedupe-fields.js --apply    (trim + save)
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'server', 'data', 'world.json');
const APPLY = process.argv.includes('--apply');
const world = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const now = new Date().toISOString();

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

function similarity(a, b) {
  const na = norm(a), nb = norm(b);
  if (na === nb) return 1;
  const wa = na.split(' ');
  const wb = nb.split(' ');
  if (wa.length < 4 || wb.length < 4) return 0;
  const grams = new Set();
  for (let i = 0; i <= wa.length - 4; i++) grams.add(wa.slice(i, i + 4).join(' '));
  let hits = 0, total = 0;
  for (let i = 0; i <= wb.length - 4; i++) {
    total++;
    if (grams.has(wb.slice(i, i + 4).join(' '))) hits++;
  }
  return total ? hits / total : 0;
}

const THRESHOLD = 0.85; // near-verbatim
let trims = 0, removedFields = 0, touched = 0;
const report = [];

for (const e of world) {
  const desc = e.description || '';
  if (!desc) continue;
  const descSentences = desc.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 25);

  let entryChanged = false;
  const keepFields = [];
  for (const f of e.fields || []) {
    const orig = f.value || '';
    const sentences = orig.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim());
    const kept = [];
    let removed = [];
    for (const s of sentences) {
      const dup = descSentences.some((d) => similarity(d, s) >= THRESHOLD);
      if (dup) removed.push(s.trim().slice(0, 70));
      else kept.push(s);
    }
    if (removed.length) {
      trims += removed.length;
      const newValue = kept.join(' ').replace(/\s{2,}/g, ' ').trim();
      report.push({ entry: e.name, field: f.label, removed, newValue });
      entryChanged = true;
      if (newValue.length < 3) {
        removedFields++;
        continue; // drop the field entirely — content lives in description
      }
      keepFields.push({ ...f, value: newValue });
    } else {
      keepFields.push(f);
    }
  }
  if (entryChanged && APPLY) {
    e.fields = keepFields;
    e.updatedAt = now;
    touched++;
  }
}

console.log(APPLY ? 'APPLIED:' : 'WOULD TRIM (run with --apply):');
for (const r of report) {
  console.log('  [' + r.entry + '] field "' + r.field + '" — removed ' + r.removed.length + ' duplicated sentence(s):');
  for (const s of r.removed) console.log('      x ' + s);
  if (r.newValue) console.log('      kept: ' + r.newValue.slice(0, 100));
  else console.log('      (field removed entirely)');
}
console.log('');
console.log('Summary: ' + trims + ' duplicated sentences across fields; ' + removedFields + ' fields removed entirely; ' + touched + ' entries touched.');

if (APPLY) {
  fs.writeFileSync(DATA, JSON.stringify(world, null, 2) + '\n');
  console.log('Saved. Total entries:', world.length);
}

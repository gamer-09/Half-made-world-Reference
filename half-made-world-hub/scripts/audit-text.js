// Text-quality audit for the Half-Made World archive.
// Finds: doubled words ("the the"), consecutive duplicate lines,
// and exact repeated sentences within an entry.
// Usage: node scripts/audit-text.js          (report only)
//        node scripts/audit-text.js --apply  (fix doubled words + consecutive dup lines)
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'server', 'data', 'world.json');
const APPLY = process.argv.includes('--apply');
const world = JSON.parse(fs.readFileSync(DATA, 'utf8'));

const stats = { doubledWords: 0, dupLines: 0, dupSentences: 0, entriesTouched: 0 };
const report = [];

function scanText(text) {
  if (typeof text !== 'string' || !text) return { text, issues: [] };
  const issues = [];
  let out = text;

  // 1) Doubled words: "the the", "and and" (case-insensitive, same word twice)
  const doubled = out.match(/\b([A-Za-z]{3,})(\s+)\1\b/gi) || [];
  if (doubled.length) {
    issues.push({ type: 'doubled words', samples: [...new Set(doubled)].slice(0, 5) });
    if (APPLY) out = out.replace(/\b([A-Za-z]{3,})(\s+)\1\b/gi, '$1');
  }

  // 2) Consecutive duplicate lines (non-empty, >10 chars, identical)
  const lines = out.split(/\r?\n/);
  const kept = [];
  let dups = 0;
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i].trim();
    const prev = kept.length ? kept[kept.length - 1].trim() : '';
    if (cur.length > 10 && cur === prev) { dups++; continue; }
    kept.push(lines[i]);
  }
  if (dups) {
    issues.push({ type: 'consecutive duplicate lines', samples: [dups + ' line(s) removed'] });
    if (APPLY) out = kept.join('\n');
  }

  // 3) Exact repeated sentences (>25 chars, appears 2+ times) — report only
  const sentences = out.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Map();
  const dupes = new Set();
  for (const s of sentences) {
    const key = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key.length < 25) continue;
    if (seen.has(key)) dupes.add(s);
    else seen.set(key, s);
  }
  if (dupes.size) {
    issues.push({ type: 'repeated sentences', samples: [...dupes].slice(0, 3).map((s) => s.slice(0, 90)) });
  }

  return { text: out, issues };
}

function scanEntry(entry) {
  const fields = [['description', entry.description || '']];
  for (const f of entry.fields || []) fields.push(['field:' + f.label, f.value || '']);

  let changed = false;
  for (const [fieldName, text] of fields) {
    const { text: fixed, issues } = scanText(text);
    for (const i of issues) {
      report.push({ entry: entry.name, category: entry.category, field: fieldName, ...i });
      if (i.type === 'doubled words') stats.doubledWords++;
      if (i.type === 'consecutive duplicate lines') stats.dupLines++;
      if (i.type === 'repeated sentences') stats.dupSentences++;
    }
    if (APPLY && fixed !== text) {
      if (fieldName === 'description') entry.description = fixed;
      else {
        const f = entry.fields.find((x) => 'field:' + x.label === fieldName);
        if (f) f.value = fixed;
      }
      entry.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) stats.entriesTouched++;
}

for (const e of world) scanEntry(e);

// --- print report ---
const byType = {};
for (const r of report) byType[r.type] = (byType[r.type] || 0) + 1;

console.log(APPLY ? 'APPLIED FIXES:' : 'ISSUES FOUND (run with --apply to fix doubled words + dup lines):');
for (const r of report) {
  console.log('  [' + r.category + '] ' + r.entry + ' :: ' + r.field + ' — ' + r.type);
  for (const s of r.samples) console.log('      ' + s);
}
if (!report.length) console.log('  (none)');

console.log('');
console.log('Summary:', JSON.stringify(stats));
console.log('Repeated sentences are REPORT-ONLY (auto-rewriting sentences risks changing meaning).');

if (APPLY) {
  fs.writeFileSync(DATA, JSON.stringify(world, null, 2) + '\n');
  console.log('Saved. Total entries:', world.length);
}

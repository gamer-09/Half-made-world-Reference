// Deep text audit: fuzzy near-duplicate sentences within entries,
// cross-entry duplicate descriptions, and formatting glitches.
// Usage: node scripts/audit-text-deep.js
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'server', 'data', 'world.json');
const world = JSON.parse(fs.readFileSync(DATA, 'utf8'));

// --- helpers ---
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// shingle-based similarity (word 4-grams)
function similarity(a, b) {
  const wa = norm(a).split(' ');
  const wb = norm(b).split(' ');
  if (wa.length < 4 || wb.length < 4) return norm(a) === norm(b) ? 1 : 0;
  const grams = new Set();
  for (let i = 0; i <= wa.length - 4; i++) grams.add(wa.slice(i, i + 4).join(' '));
  let hits = 0;
  let total = 0;
  for (let i = 0; i <= wb.length - 4; i++) {
    total++;
    if (grams.has(wb.slice(i, i + 4).join(' '))) hits++;
  }
  return total ? hits / total : 0;
}

console.log('=== 1) NEAR-DUPLICATE SENTENCES WITHIN ENTRIES (similarity > 0.75) ===');
for (const e of world) {
  const text = (e.description || '') + '\n' + (e.fields || []).map((f) => f.value).join('\n');
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 40);
  const found = [];
  for (let i = 0; i < sentences.length && found.length < 4; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const sim = similarity(sentences[i], sentences[j]);
      if (sim > 0.75) {
        found.push({ a: sentences[i], b: sentences[j], sim });
        break;
      }
    }
  }
  for (const f of found) {
    console.log('\n[' + e.category + '] ' + e.name + '  (sim ' + f.sim.toFixed(2) + ')');
    console.log('   A: ' + f.a.slice(0, 130));
    console.log('   B: ' + f.b.slice(0, 130));
  }
}

console.log('\n=== 2) CROSS-ENTRY DUPLICATE DESCRIPTIONS ===');
const seen = new Map();
for (const e of world) {
  const key = norm(e.description || '').slice(0, 300);
  if (key.length < 80) continue;
  if (seen.has(key)) {
    console.log('DUPLICATE: [' + e.category + '] ' + e.name + '  ==  [' + seen.get(key).category + '] ' + seen.get(key).name);
  } else {
    seen.set(key, e);
  }
}

console.log('\n=== 3) FORMATTING GLITCHES ===');
const glitches = {
  'stray markdown chars (*** or __ or ]( )': /(\*\*\*|__|\]\()/,
  'double punctuation ( .. or !! or ?? )': /([.!?]){2,}/,
  'space before punctuation (word ,)': /\s[,.;:!?]/,
  'missing space after period (word.Word)': /[a-z]\.[A-Z][a-z]/,
  'triple+ blank lines': /\n{4,}/,
  'unfinished template markers ({{ or }} or < PLACEHOLDER)': /(\{\{|\}\}|PLACEHOLDER|TODO|TBD|LOREM)/i,
  'unbalanced markdown heading (####text without space)': /^#{4,}[^\s#]/m,
};
for (const e of world) {
  const texts = [['description', e.description || '']];
  for (const f of e.fields || []) texts.push(['field:' + f.label, f.value || '']);
  for (const [label, t] of texts) {
    for (const [glitch, re] of Object.entries(glitches)) {
      const m = t.match(re);
      if (m) {
        console.log('[' + e.category + '] ' + e.name + ' (' + label + '): ' + glitch + '  e.g. ' + JSON.stringify(m[0].slice(0, 40)));
        break; // one glitch type per field
      }
    }
  }
}
console.log('\n(done)');

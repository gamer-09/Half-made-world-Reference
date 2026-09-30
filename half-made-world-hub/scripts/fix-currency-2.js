// Pass 2: rewrite Currency System fields to Sigil canon + fix "+"-prefixed old acronyms.
// Usage: node scripts/fix-currency-2.js [--apply]
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'server', 'data', 'world.json');
const APPLY = process.argv.includes('--apply');
const world = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const now = new Date().toISOString();
let changes = [];

// --- 1) Currency System: replace cc/sc/gc/pc fields with Sigil canon ---
const cs = world.find((x) => x.name === 'Currency System');
if (cs) {
  const sigilFields = [
    { label: 'Silver Sigil (ss)', value: 'Base unit. Standard daily currency — meals, inn stays, basic gear, everyday services.' },
    { label: 'Gold Sigil (gs)', value: '100 Silver Sigil = 1 Gold Sigil. Significant purchases — weapons, enchantments, Broker contracts.' },
    { label: 'Platinum Sigil (ps)', value: '1,000 Gold Sigil = 1 Platinum Sigil. Rare. High-value transactions — artifact deals, realm-spanning contracts.' },
    { label: 'Exchange Rates', value: '1 ps = 1,000 gs = 100,000 ss. Older records may mention an obsolete copper tier (cc/sc/gc/pc 10:1 system) — that system is retired; all prices today are quoted in Sigils.' },
    { label: 'Black Market Premium', value: 'Corrupted items, smuggled goods, and illegal services command 2-5x normal prices.' },
  ];
  const before = JSON.stringify(cs.fields);
  if (APPLY) {
    cs.fields = sigilFields;
    cs.updatedAt = now;
  }
  changes.push('Economy :: Currency System [fields rewritten to Sigil canon] ' + (before === JSON.stringify(sigilFields) ? '(no change needed)' : '(was cc/sc/gc/pc)'));
  // description: remove the "(Older records...)" aside if present, keep clean 3-tier text
  if (APPLY && cs.description.includes('(Older records and texts sometimes mention')) {
    cs.description = cs.description.replace(/\s*\(Older records and texts sometimes mention[^)]*\)/, ' Older records sometimes mention an obsolete copper tier — copper pieces are no longer minted.');
    cs.updatedAt = now;
  }
}

// --- 2) "+"-suffixed old acronyms: 10+ sm -> 10+ ss, 500+ gc -> 500+ gs, etc. ---
const PLUS_RE = /(\d+)\s*\+\s*(cp|sm|gc|sp|gp)\b/gi;
function fixPlus(text) {
  return text.replace(PLUS_RE, (m, num, unit) => {
    const u = unit.toLowerCase();
    if (u === 'cp') return num + '+ ss';
    if (u === 'sm' || u === 'sp') return num + '+ ss';
    return num + '+ gs'; // gc / gp
  });
}
for (const e of world) {
  const b = e.description || '';
  const a = fixPlus(b);
  if (a !== b) {
    changes.push(e.category + ' :: ' + e.name + ' [description +' + (b.match(PLUS_RE) || []).length + ']');
    if (APPLY) {
      e.description = a;
      e.updatedAt = now;
    }
  }
  if (Array.isArray(e.fields)) {
    for (const f of e.fields) {
      const fb = f.value || '';
      const fa = fixPlus(fb);
      if (fa !== fb) {
        changes.push(e.category + ' :: ' + e.name + ' [field: ' + f.label + ']');
        if (APPLY) {
          f.value = fa;
          e.updatedAt = now;
        }
      }
    }
  }
}

// --- 3) Report-only: remaining copper/crown-as-currency suspects ---
const suspects = [];
for (const e of world) {
  const t = (e.description || '') + ' ' + (e.fields || []).map((f) => f.value).join(' ');
  const m = t.match(/[^.]*(?:\b\d+\s*(?:cp|sm|gc)\b|\bcopper pieces?\b|\bcopper coins?\b)[^.]*/gi) || [];
  if (m.length) suspects.push(e.category + ' :: ' + e.name + ' -> ' + m.slice(0, 2).join(' // ').slice(0, 200));
}

console.log(APPLY ? 'APPLIED:' : 'WOULD CHANGE:');
console.log(changes.map((c) => '  ' + c).join('\n'));
console.log('');
console.log('Remaining old-currency suspects (check by hand):');
console.log(suspects.length ? suspects.map((s) => '  ' + s).join('\n') : '  (none)');

if (APPLY) {
  fs.writeFileSync(DATA, JSON.stringify(world, null, 2) + '\n');
  console.log('\nSaved. Total entries:', world.length);
}

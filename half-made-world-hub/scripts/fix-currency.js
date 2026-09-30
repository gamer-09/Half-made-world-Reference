// One-off audit + fix for old currency references across the archive.
// Usage: node scripts/fix-currency.js [--apply]   (default: report only)
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'server', 'data', 'world.json');
const APPLY = process.argv.includes('--apply');

const world = JSON.parse(fs.readFileSync(DATA, 'utf8'));

// --- Conversion map from the old system to the current Sigil canon ---
// Old tiers: copper piece (cp) < silver mark (sm) < gold crown (gc) < platinum? (never used)
// Current canon: 100 Silver Sigil (ss) = 1 Gold Sigil (gs); 1000 gs = 1 Platinum Sigil (ps)
// Old exchange (per Currency System's "copper for basics"): assumed 10 cp = 1 sm, 10 sm = 1 gc.
// Conversions are rounded to sensible shop prices: cp -> ss (nearest whole, min 1),
// sm -> ss (1:1-ish value shift keeps wages readable), gc -> gs (1:1).
function convertValue(num, unit) {
  const u = unit.toLowerCase();
  const n = parseFloat(num);
  if (u === 'cp') return { v: Math.max(1, Math.round(n / 10)), unit: 'ss' }; // 10 cp = 1 ss
  if (u === 'sm') return { v: Math.round(n), unit: 'ss' };                    // silver mark -> Silver Sigil
  if (u === 'gc') return { v: Math.round(n), unit: 'gs' };                    // gold crown -> Gold Sigil
  if (u === 'gp') return { v: Math.round(n), unit: 'gs' };
  if (u === 'sp') return { v: Math.round(n), unit: 'ss' };
  if (u === 'gm') return { v: Math.round(n), unit: 'gs' };
  return { v: num, unit: unit };
}

// Matches prices like "5 cp", "5cp", "2-5 gc", "10-15 sm", "1.5 sm"
const PRICE_RE = /\b(\d+(?:\.\d+)?)(\s*[-\u2013]\s*(\d+(?:\.\d+)?))?(\s*)(cp|sp|sm|gc|gp|gm)\b/g;

function fixText(text) {
  return text.replace(PRICE_RE, (m, a, _dash, b, space, unit) => {
    const lo = convertValue(a, unit);
    if (b == null) return `${lo.v}${space}${lo.unit}`;
    const hi = convertValue(b, unit);
    if (lo.unit === hi.unit) return `${lo.v}-${hi.v}${space}${lo.unit}`;
    return `${lo.v}${space}${lo.unit}-${hi.v}${space}${hi.unit}`;
  });
}

let changes = [];
for (const e of world) {
  const before = e.description || '';
  const after = fixText(before);
  if (after !== before) {
    changes.push({ name: e.name, category: e.category, diffs: countDiffs(before, after) });
    if (APPLY) {
      e.description = after;
      e.updatedAt = new Date().toISOString();
    }
  }
  // fields too
  if (Array.isArray(e.fields)) {
    for (const f of e.fields) {
      const fb = f.value || '';
      const fa = fixText(fb);
      if (fa !== fb) {
        changes.push({ name: e.name + ' [field: ' + f.label + ']', category: e.category, diffs: countDiffs(fb, fa) });
        if (APPLY) {
          f.value = fa;
          e.updatedAt = new Date().toISOString();
        }
      }
    }
  }
}

function countDiffs(a, b) {
  const am = a.match(PRICE_RE) || [];
  const bm = b.match(PRICE_RE) || [];
  return am.length;
}

// --- Sigil-as-metal fixes (Mining & Raw Materials etc.) ---
const METAL_FIXES = [
  {
    name: 'Mining & Raw Materials',
    from: 'Metals: Iron, copper, tin, and Gold Sigil are mined from mountain ranges in all three realms. The Human Realm\'s Ashvein Mountains are the largest mining region, producing iron and copper. Silver Sigil comes from the Angel Realm\'s Moonpeak range. Gold Sigil is rare and found only in deep mines in the Demon Realm\'s volcanic regions.',
    to: 'Metals: Iron, copper, tin, silver, and gold are mined from mountain ranges in all three realms. The Human Realm\'s Ashvein Mountains are the largest mining region, producing iron and copper. Silver comes from the Angel Realm\'s Moonpeak range. Gold is rare and found only in deep mines in the Demon Realm\'s volcanic regions. (The minted coins — Silver Sigil, Gold Sigil, Platinum Sigil — are named after the sigil mark stamped on them, not the metal alone: a Gold Sigil coin is gold alloy stamped with the realm\'s sigil.)',
  },
];

for (const fix of METAL_FIXES) {
  const e = world.find((x) => x.name === fix.name);
  if (e && (e.description || '').includes(fix.from)) {
    changes.push({ name: fix.name + ' [metal wording]', category: e.category, diffs: 1 });
    if (APPLY) {
      e.description = e.description.replace(fix.from, fix.to);
      e.updatedAt = new Date().toISOString();
    }
  }
}

// --- Currency System: drop the copper tier (not in Coins category canon) ---
const cs = world.find((x) => x.name === 'Currency System');
if (cs && cs.description.includes('Copper for basics')) {
  const from = 'The four-tier coinage system used across all realms. Copper for basics, Silver Sigil for daily life, Gold Sigil for significant purchases, Platinum Sigil for rare high-value deals.';
  const to = 'The three-tier coinage system used across all realms. Silver Sigil for daily life, Gold Sigil for significant purchases, Platinum Sigil for rare high-value deals. (Older records and texts sometimes mention an obsolete copper tier — copper pieces are no longer minted; the smallest coin today is the Silver Sigil.)';
  if ((cs.description || '').includes(from)) {
    changes.push({ name: 'Currency System [drop copper tier]', category: cs.category, diffs: 1 });
    if (APPLY) {
      cs.description = cs.description.replace(from, to);
      cs.updatedAt = new Date().toISOString();
    }
  } else {
    changes.push({ name: 'Currency System [TEXT MISMATCH — fix manually]', category: cs.category, diffs: 0 });
  }
}

// --- Price Guide: wage header mentions old acronyms? show what's left ---
console.log(APPLY ? 'APPLIED CHANGES:' : 'WOULD CHANGE (run with --apply to write):');
for (const c of changes) console.log('  ' + c.category + ' :: ' + c.name + '  (' + c.diffs + ' price refs)');

// post-check
const leftover = [];
for (const e of world) {
  const t = (e.description || '') + ' ' + (e.fields || []).map((f) => f.value).join(' ');
  const m = t.match(/\b\d+(?:\.\d+)?\s*(?:-\s*\d+(?:\.\d+)?\s*)?(?:cp|sm|gc)\b/gi);
  if (m) leftover.push(e.category + ' :: ' + e.name + ' -> ' + m.slice(0, 5).join(', '));
}
console.log('');
console.log(APPLY ? 'LEFTOVER old-acronym refs:' : 'WOULD-BE LEFTOVER (same as above):');
console.log(leftover.length ? leftover.join('\n') : '  (none)');

if (APPLY) {
  fs.writeFileSync(DATA, JSON.stringify(world, null, 2) + '\n');
  console.log('');
  console.log('Saved. Total entries:', world.length);
}

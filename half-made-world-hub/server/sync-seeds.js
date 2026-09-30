/**
 * Seed sync — keeps the three seed files in sync with server/data/*.json.
 *
 * Modes:
 *   node server/sync-seeds.js          → regenerate seed files if data changed
 *   node server/sync-seeds.js --check  → exit 1 if seeds are stale (for CI)
 *
 * "Stale" = regenerating would produce different bytes than what's on disk.
 * The generator output must be deterministic (same data → same bytes).
 */
const fs = require('fs');
const path = require('path');
const { generateSeeds } = require('./seed-generator');

const DATA = path.join(__dirname, 'data');

const TARGETS = [
  { out: path.join(__dirname, 'seed.js'), key: 'seed', source: 'world.json' },
  { out: path.join(__dirname, 'seed-story-links.js'), key: 'links', source: 'story-links.json' },
  { out: path.join(__dirname, 'seed-relationships.js'), key: 'rels', source: 'relationships.json' },
];

const CHECK = process.argv.includes('--check');

// Load current data
const world = JSON.parse(fs.readFileSync(path.join(DATA, 'world.json'), 'utf8'));
const links = JSON.parse(fs.readFileSync(path.join(DATA, 'story-links.json'), 'utf8'));
const rels = JSON.parse(fs.readFileSync(path.join(DATA, 'relationships.json'), 'utf8'));

// Generate what the seed files SHOULD be
const generated = generateSeeds({ world, links, rels });

let stale = [];
for (const t of TARGETS) {
  const current = fs.existsSync(t.out) ? fs.readFileSync(t.out, 'utf8') : '';
  if (current !== generated[t.key]) stale.push(path.basename(t.out));
}

if (stale.length === 0) {
  console.log('Seeds are in sync with server/data/*.json');
  process.exit(0);
}

if (CHECK) {
  console.error('Seed files are STALE — data changed without regenerating seeds:');
  for (const s of stale) console.error('  ' + s);
  console.error('');
  console.error('Fix locally with: npm run seeds:sync');
  process.exit(1);
}

// Regenerate the stale files
for (const t of TARGETS) {
  if (stale.includes(path.basename(t.out))) {
    fs.writeFileSync(t.out, generated[t.key], 'utf8');
  }
}
console.log('Regenerated ' + stale.length + ' seed file(s): ' + stale.join(', '));

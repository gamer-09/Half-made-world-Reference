/**
 * Force-regenerate the three seed files from the live JSON data
 * (world.json, story-links.json, relationships.json).
 *
 * The content logic lives in seed-generator.js so this script and
 * sync-seeds.js always produce byte-identical output.
 *
 * Prefer `npm run seeds:sync` for everyday use — it only rewrites files
 * that actually changed. This script always rewrites all three.
 */
const fs = require('fs');
const path = require('path');
const { generateSeeds } = require('./seed-generator');

const DATA = path.join(__dirname, 'data');

const world = JSON.parse(fs.readFileSync(path.join(DATA, 'world.json'), 'utf8'));
const links = JSON.parse(fs.readFileSync(path.join(DATA, 'story-links.json'), 'utf8'));
const rels = JSON.parse(fs.readFileSync(path.join(DATA, 'relationships.json'), 'utf8'));

const generated = generateSeeds({ world, links, rels });

fs.writeFileSync(path.join(__dirname, 'seed.js'), generated.seed, 'utf8');
fs.writeFileSync(path.join(__dirname, 'seed-story-links.js'), generated.links, 'utf8');
fs.writeFileSync(path.join(__dirname, 'seed-relationships.js'), generated.rels, 'utf8');

console.log('Regenerated seed.js (' + world.length + ' entries), seed-story-links.js (' + links.length + ' links), seed-relationships.js (' + rels.length + ' rels).');

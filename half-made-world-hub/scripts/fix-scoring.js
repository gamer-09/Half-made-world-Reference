// Remove the stray `");` and the duplicated scoring block left by earlier repairs.
const fs = require('fs');
const p = require('path').join(__dirname, '..', 'server', 'index.js');
const src = fs.readFileSync(p, 'utf8');

const TAIL = '.map((s) => s.entry);';
const GARBAGE = 's.entry);");';

const g = src.indexOf(GARBAGE);
if (g === -1) { console.log('garbage marker not found — nothing to do?'); process.exit(0); }

// End of the DUPLICATE block = next occurrence of TAIL after the garbage.
const dupEnd = src.indexOf(TAIL, g + GARBAGE.length);
if (dupEnd === -1) { console.log('duplicate tail not found'); process.exit(1); }

const keepHead = src.slice(0, g + 's.entry);'.length); // first block, clean ending
const rest = src.slice(dupEnd + TAIL.length);           // everything after duplicate block

const out = keepHead + rest;
fs.writeFileSync(p, out, 'utf8');

// sanity: exactly one escapeRe, one wordRes, one scoredEntries
const count = (s) => (out.match(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
console.log('escapeRe count:', count('const escapeRe'));
console.log('wordRes count:', count('const wordRes'));
console.log('scoredEntries count:', count('const scoredEntries'));
console.log('scoredRels count:', count('const scoredRels'));

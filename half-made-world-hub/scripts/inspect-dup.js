// Trim the cross-field duplicated sentence, verify, save.
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'server', 'data', 'world.json');
const world = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const e = world.find((x) => x.name === 'Fallen Angel');

const dupSentence =
  ' Clint knew the Sanctuary Break would have consumed Ordium within a year.';

const ck = e.fields.find((f) => f.label === "Clint's Knowledge");
if (!ck || !ck.value.endsWith(dupSentence)) {
  console.log('PATTERN NOT FOUND in Clint\'s Knowledge — no change made');
  console.log('current value:', ck && ck.value);
  process.exit(1);
}

const before = ck.value.length;
ck.value = ck.value.slice(0, -dupSentence.length);
e.updatedAt = new Date().toISOString();

fs.writeFileSync(DATA, JSON.stringify(world, null, 2) + '\n');
console.log("Clint's Knowledge:", before, '->', ck.value.length, 'chars');
console.log('new value:', ck.value);

// confirm the sentence now exists exactly once in the whole entry
const total =
  (e.description.split(dupSentence).length - 1) +
  e.fields.reduce((n, f) => n + (f.value || '').split(dupSentence).length - 1, 0);
console.log('sentence occurrences across entry now:', total, '(should be 1)');

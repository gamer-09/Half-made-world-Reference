// Numeric-consistency audit for the Half-Made World archive.
// Usage: node scripts/audit-numbers.js [topic]
// Topics: distances, timeline, anatomy, counts, ages, all (default)
const fs = require('fs');
const path = require('path');
const world = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'server', 'data', 'world.json'), 'utf8'));
const topicArg = process.argv[2] || 'all';

function* sentences() {
  for (const e of world) {
    const text = (e.description || '') + '\n' + (e.fields || []).map((f) => f.label + ': ' + f.value).join('\n');
    for (const raw of text.split(/(?<=[.!?])\s+|\n+/)) {
      const s = raw.trim();
      if (/\d/.test(s)) yield { entry: e, s };
    }
  }
}

const TOPICS = {
  distances: {
    title: 'DISTANCES & SIZES',
    match: (s) => /\b\d+\s*(mile|league|kilometer|km|feet|ft|meters?|m)\b/i.test(s),
    group: (s) => {
      if (/shattered lands/i.test(s)) return 'Shattered Lands';
      if (/umbrage|forest/i.test(s)) return 'Forests';
      if (/human realm|capital|city/i.test(s)) return 'Human Realm geography';
      if (/demon realm|volcan/i.test(s)) return 'Demon Realm geography';
      if (/angel realm|moonpeak/i.test(s)) return 'Angel Realm geography';
      if (/hidden realm|veil/i.test(s)) return 'Hidden Realm';
      return 'Other distances';
    },
  },
  timeline: {
    title: 'TIMELINE (years, ages of events)',
    match: (s) => /\b(?:year|years|ago|century|centuries|millennia)\b/i.test(s) && /\b\d+\b/.test(s),
    group: (s) => {
      if (/sundering/i.test(s)) return 'The Sundering';
      if (/academy|elyndor/i.test(s)) return 'Elyndor Academy';
      if (/rebellion|aldric|crown/i.test(s)) return 'Broken Crown Rebellion';
      if (/aelthar/i.test(s)) return 'Aelthar history';
      if (/founded|established|creation/i.test(s)) return 'Foundings';
      return 'Other timeline';
    },
  },
  anatomy: {
    title: 'ANATOMY (wings, horns, halos by rank)',
    match: (s) => /\b(wings?|horns?|halo)\b/i.test(s) && /\b\d+\b/.test(s) && /(rank|serapharch|aetherblade|virtue|lumen|mordrach|bloodward|scourge|gnash|form)/i.test(s),
    group: (s) => {
      if (/serapharch|aetherblade|virtue|lumen/i.test(s)) return 'Angel ranks';
      if (/mordrach|bloodward|scourge|gnash/i.test(s)) return 'Demon ranks';
      if (/jaiden/i.test(s)) return 'Jaiden forms';
      return 'General anatomy';
    },
  },
  counts: {
    title: 'COUNTS (populations, armies, quantities)',
    match: (s) => /\b\d{2,}(?:,\d{3})*\+?\b/.test(s) && /(population|soldiers|troops|army|members|people|inhabitants|guild|clan|soldier|guard)/i.test(s),
    group: (s) => {
      if (/army|soldier|troop|guard|legion|division/i.test(s)) return 'Military numbers';
      if (/population|inhabitants|people|residents/i.test(s)) return 'Populations';
      if (/guild|clan|members|brothers|order/i.test(s)) return 'Organizations';
      return 'Other counts';
    },
  },
  ages: {
    title: 'AGES & LIFESPANS',
    match: (s) => /\b\d+\s*(?:-\s*\d+\s*)?(?:years?\s+old|years?|decades?)\b/i.test(s) && /(age|lifespan|live[sd]?|old|die|die at|mortal|maturity|adult)/i.test(s),
    group: (s) => {
      if (/angel/i.test(s)) return 'Angels';
      if (/demon/i.test(s)) return 'Demons';
      if (/human|elf|dwarf/i.test(s)) return 'Humans & others';
      return 'General ages';
    },
  },
};

const topics = topicArg === 'all' ? Object.keys(TOPICS) : [topicArg];

for (const t of topics) {
  const cfg = TOPICS[t];
  if (!cfg) { console.log('Unknown topic: ' + t + ' (use: ' + Object.keys(TOPICS).join(', ') + ' or all)'); continue; }

  const groups = {};
  for (const { entry, s } of sentences()) {
    if (!cfg.match(s)) continue;
    const g = cfg.group(s);
    (groups[g] = groups[g] || []).push({ entry: entry.name + ' (' + entry.category + ')', s: s.replace(/\s+/g, ' ').slice(0, 220) });
  }

  console.log('\n========== ' + cfg.title + ' ==========');
  for (const g of Object.keys(groups).sort()) {
    console.log('\n--- ' + g + ' (' + groups[g].length + ' claims)');
    const seen = new Set();
    for (const c of groups[g]) {
      const key = c.s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      console.log('  [' + c.entry + ']');
      console.log('    ' + c.s);
    }
  }
}

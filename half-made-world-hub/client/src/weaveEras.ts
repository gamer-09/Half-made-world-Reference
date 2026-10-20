import type { Entry, StoryLink } from './types';
import { findCharacter } from './nameMatch';

// ── Timeline Explorer data ─────────────────────────────────────────────
// Eras mirror the chronology inside the "Major Historical Events" entry
// (server/data/world.json), from the Age of the Aelthar to the coming
// Fourth Turning. Each era carries a curated, ordered list of real entry
// names so the Constellation can filter the archive to what belongs to
// that moment in history.
export interface EraAnchor {
  label: string;
  detail: string;
}

export interface Era {
  id: string;
  name: string;
  span: string;
  tagline: string;
  material: string[];
  anchors: EraAnchor[];
}

export const ERAS: Era[] = [
  {
    id: 'aelthar',
    name: 'The Age of the Aelthar',
    span: 'Before Year 0',
    tagline: 'The elder race rules — and reaches too far.',
    material: [
      'The Aelthar',
      'World Eater',
      'The Creation of the World',
      'The World Core',
      'The Hidden Realm',
      'The Shudon',
    ],
    anchors: [
      { label: 'The Aelthar rule', detail: 'The original elder race governs the Half-Made World.' },
      { label: 'The World Eater is found', detail: 'The Aelthar discover the entity that will undo them.' },
      { label: 'The Hidden Realm is made', detail: 'A weapon-realm is forged — and the world nearly ends.' },
    ],
  },
  {
    id: 'sundering',
    name: 'The Sundering',
    span: 'Year 0',
    tagline: 'The world breaks and is half-made.',
    material: [
      'The Sundering',
      'Vireth',
      'Vireth\u2019s Five Eyes',
      'The Void',
      'The Sundering Echoes',
      'The World Barrier',
    ],
    anchors: [
      { label: 'Hidden Realm creation', detail: 'The Sundering nearly destroys the world.' },
      { label: 'Aelthar wiped out', detail: 'The elder race falls; the World Barrier is raised.' },
      { label: 'Vireth\u2019s eyes scattered', detail: 'The corrupted sword is broken into five eyes.' },
    ],
  },
  {
    id: 'first-turning',
    name: 'The First Turning',
    span: 'Year 500',
    tagline: 'The Veil forms and the writings scatter.',
    material: [
      'First Turning',
      'The Veil',
      'The Sealed Writings',
      'The Aelthar',
      'The Hidden Realm',
    ],
    anchors: [
      { label: 'The Veil forms', detail: 'A boundary settles over the broken world.' },
      { label: 'Hidden Realm sealed', detail: 'The weapon-realm is closed off.' },
      { label: 'Sealed Writings scattered', detail: 'Recorded truth is dispersed and hidden.' },
    ],
  },
  {
    id: 'human-rise',
    name: 'The Rise of Humanity',
    span: 'Years 800\u20131200',
    tagline: 'Mankind expands over the ruins.',
    material: [
      'The Human Realm',
      'The Sundering Altar',
      'The Aelthar',
      'The Sealed Writings',
    ],
    anchors: [
      { label: 'Human expansion', detail: 'Humanity spreads across the three realms.' },
      { label: 'Aelthar survivors hunted', detail: 'An unnamed ruler conquers the last of the elders.' },
      { label: 'Three-realm system forms', detail: 'Human, Angel, and Demon realms take shape.' },
    ],
  },
  {
    id: 'second-turning',
    name: 'The Second Turning',
    span: 'Year 1000',
    tagline: 'The first gate opens between realms.',
    material: [
      'Second Turning',
      'Realm Gate',
      'The Broker\u2019s Guild',
      'Travel',
      'The Angel Realm',
      'The Human Realm',
    ],
    anchors: [
      { label: 'First Realm Gate', detail: 'A Human\u2013Angel gate is created.' },
      { label: 'Cross-realm travel', detail: 'Peoples and goods begin to move between realms.' },
    ],
  },
  {
    id: 'academy',
    name: 'The Academy Era',
    span: 'Years ~1300\u20131500',
    tagline: 'Elyndor rises and time is standardised.',
    material: [
      'Elyndor Academy',
      'Kael von Ashen',
      'The Veyn Calendar',
      'The Sundering Altar',
      'The Founding of Elyndor Academy',
      'The First Veyn Storm Catastrophe',
    ],
    anchors: [
      { label: 'Elyndor Academy founded', detail: 'Kael von Ashen builds the institution that shapes the world.' },
      { label: 'Both Sundering Altars built', detail: 'The Awakening rite is formalised.' },
      { label: 'The Veyn Calendar', detail: 'A common dating system is imposed across all realms.' },
      { label: 'First Veyn Storm', detail: 'The largest storm in history kills over ten thousand.' },
    ],
  },
  {
    id: 'third-turning',
    name: 'The Third Turning',
    span: 'Year 1500',
    tagline: 'The Demon Realm expands and borders burn.',
    material: [
      'Third Turning',
      'The Demon Realm',
      'Obsidian Spires',
      'The Human Realm',
      'The Angel Realm',
      'Border Conflicts',
    ],
    anchors: [
      { label: 'Demon Realm grows', detail: 'The realm expands by a fifth.' },
      { label: 'Obsidian Spires established', detail: 'New strongholds rise along the borders.' },
      { label: 'Border conflicts', detail: 'Tension with the Human and Angel realms sharpens.' },
    ],
  },
  {
    id: 'civil-war',
    name: 'The Angel Civil War',
    span: 'Years ~1550\u20131580',
    tagline: 'Purity against Outreach — and a prophecy found.',
    material: [
      'The Angel Civil War',
      'The Prophecy of the Half-Made',
      'The Seer\u2019s Order',
      'The Angel Realm',
      'Purity Faction',
      'Outreach Faction',
    ],
    anchors: [
      { label: 'Thirty years of war', detail: 'A third of the Angel population is killed.' },
      { label: 'Isolationism deepens', detail: 'The Angel Realm turns inward.' },
      { label: 'Prophecy discovered', detail: 'The Seer\u2019s Order finds the Half-Made tablet.' },
    ],
  },
  {
    id: 'demon-wars',
    name: 'The Demon Unification Wars',
    span: 'Years ~1950\u20131965',
    tagline: 'Sixty clans become twenty.',
    material: [
      'Demon Unification Wars',
      'The Demon Realm',
      'Clan',
      'Obsidian Spires',
    ],
    anchors: [
      { label: 'Sixty clans', detail: 'Fifteen years of war begin.' },
      { label: 'Twenty remain', detail: 'The clans are unified by conquest.' },
    ],
  },
  {
    id: 'broken-crown',
    name: 'The Broken Crown Rebellion',
    span: 'Year ~2150',
    tagline: 'A coup fails and reforms follow.',
    material: [
      'Broken Crown Rebellion',
      'Aldric Thornwall',
      'The Human Realm',
      'Politics',
      'Laws & Justice',
    ],
    anchors: [
      { label: 'Aldric\u2019s coup', detail: 'A six-month rebellion shakes the crown.' },
      { label: 'Political reforms', detail: 'The failed coup leaves lasting change.' },
    ],
  },
  {
    id: 'trade-accord',
    name: 'The Angel\u2013Human Trade Accord',
    span: 'Year ~2250',
    tagline: 'Commerce binds old enemies.',
    material: [
      'Angel-Human Trade Accord',
      "The Broker\u2019s Guild",
      'Economy',
      'The Angel Realm',
      'The Human Realm',
    ],
    anchors: [
      { label: 'Formal trade agreement', detail: 'A regulated accord opens the realms to each other.' },
      { label: 'Broker\u2019s Guild oversight', detail: 'The guild enforces the accord.' },
    ],
  },
  {
    id: 'fourth-turning',
    name: 'The Fourth Turning (approaching)',
    span: '~2350 VC \u2014 now',
    tagline: 'The Half-Made must be found, controlled, or destroyed.',
    material: [
      'The Fourth Turning',
      'The Prophecy of the Half-Made',
      'Jaiden Marlock',
      'Vasric Kaine',
      'Wener Leger',
      'The Sundering Prophecy Cycle',
      'The Three Great Catastrophes',
    ],
    anchors: [
      { label: 'Every faction prepares', detail: 'A ticking clock drives the present day.' },
      { label: 'The Half-Made', detail: 'The first Hybrid lies at the centre of every plan.' },
    ],
  },
];

const norm = (s: string): string => s.toLowerCase().trim();

// Resolve one curated name to a real entry name: exact (case-insensitive),
// then character-prefix, then a loose "name contains token" fallback.
export function resolveName(raw: string, entries: Entry[]): string | null {
  const n = norm(raw);
  if (!n) return null;
  const exact = entries.find((e) => norm(e.name) === n);
  if (exact) return exact.name;
  const ch = findCharacter(entries, raw);
  if (ch) return ch.name;
  const loose = entries.find((e) => norm(e.name).includes(n));
  return loose ? loose.name : null;
}

// Within one era, pick the next unresolved name after the most recently
// placed one — used to make the "↻ Shuffle" button walk through the era's
// material instead of repeating the same head entry.
export function pickNextUnplaced(material: string[], entries: Entry[], placed: Set<string>): Entry | null {
  for (const raw of material) {
    const resolved = resolveName(raw, entries);
    if (resolved && !placed.has(resolved)) {
      return entries.find((e) => e.name === resolved) ?? null;
    }
  }
  return null;
}

// Return every resolvable entry for an era (deduped, in curated order).
export function eraEntries(era: Era, entries: Entry[]): Entry[] {
  const seen = new Set<string>();
  const out: Entry[] = [];
  for (const raw of era.material) {
    const resolved = resolveName(raw, entries);
    if (!resolved || seen.has(resolved)) continue;
    const entry = entries.find((e) => e.name === resolved);
    if (entry) {
      seen.add(resolved);
      out.push(entry);
    }
  }
  return out;
}

// A self-contained "stub" entry built from a timeline anchor, so the oracle
// still has something to surface for eras whose anchors have no linked page.
export function stubFromAnchor(anchor: EraAnchor, era: Era): Entry {
  return {
    id: `stub-${era.id}-${anchor.label}`,
    category: 'Calendar',
    name: anchor.label,
    subtitle: `${era.name} \u00b7 ${era.span}`,
    description: anchor.detail,
    fields: [],
    tags: ['timeline'],
    createdAt: '',
    updatedAt: '',
  };
}

export interface OraclePick {
  entry: Entry;
  sourceLabel: string;
}

// The Lore Oracle: choose a starting entry, then surface one of the entries
// it links to (falling back to the entry itself, then to the timeline).
export function revealOracle(
  era: Era,
  entries: Entry[],
  links: StoryLink[],
  exclude: string | null,
): OraclePick {
  const pool = eraEntries(era, entries);
  const entryByName = new Map(entries.map((e) => [e.name, e]));

  const candidates = pool.length
    ? pool.filter((e) => e.name !== exclude)
    : [];
  const start = candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : pool[0] ?? null;

  if (start) {
    const neighbors: Entry[] = [];
    for (const l of links) {
      if (l.source === start.name && entryByName.has(l.target)) neighbors.push(entryByName.get(l.target)!);
      else if (l.target === start.name && entryByName.has(l.source)) neighbors.push(entryByName.get(l.source)!);
    }
    if (neighbors.length) {
      const target = neighbors[Math.floor(Math.random() * neighbors.length)];
      return { entry: target, sourceLabel: `via ${start.name}` };
    }
    return { entry: start, sourceLabel: era.name };
  }

  // No material resolved for this era — fall back to a timeline anchor.
  const anchor = era.anchors[Math.floor(Math.random() * era.anchors.length)] ?? era.anchors[0];
  return { entry: stubFromAnchor(anchor, era), sourceLabel: era.name };
}

// One-line teaser used by the oracle card, trimmed to a tidy length.
export function oracleTeaser(entry: Entry, max = 200): string {
  const raw = (entry.description || entry.subtitle || '').replace(/\s+/g, ' ').trim();
  return raw.length > max ? `${raw.slice(0, max - 1)}\u2026` : raw;
}

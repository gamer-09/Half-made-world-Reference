export interface StoryLinkType {
  label: string;
  color: string;
  dashed?: boolean;
}

// ── Link type families ─────────────────────────────────────────────────
// The archive has 280+ distinct link type strings. Instead of styling each
// one individually, types are grouped into families by MEANING. Any type not
// listed here falls back to a deterministic color derived from its text, so
// nothing renders as unstyled gray.
const FAMILY_COLORS = {
  relation: '#c8a876',     // generic association (related to, about, ...)
  containment: '#7f8fa3',  // part of / includes / contains
  place: '#34d399',        // geography (located in, home of, lives in...)
  possession: '#facc15',   // ownership (owned by, held by, sold by...)
  membership: '#38bdf8',   // belonging (member of, class of, rank of...)
  power: '#c084fc',        // abilities (skill of, grants, innate of...)
  danger: '#f87171',       // harm (kills, threatens, causes...)
  origin: '#fb923c',       // creation/derivation (made from, fused from...)
  protection: '#4ade80',   // safety (guards, protects, seals...)
  influence: '#a78bfa',    // governance (rules, governs, leads...)
  movement: '#6b9bd1',     // travel (portal to, travels to...)
};

// Exact-match styling for the most common and most important types.
export const STORY_LINK_TYPES: Record<string, StoryLinkType> = {
  // generic association — the workhorse type (1996 links)
  'related to': { label: 'Related to', color: FAMILY_COLORS.relation },
  'relates to': { label: 'Relates to', color: FAMILY_COLORS.relation },
  'connected to': { label: 'Connected to', color: FAMILY_COLORS.relation },
  'connected through': { label: 'Connected through', color: FAMILY_COLORS.relation },
  about: { label: 'About', color: FAMILY_COLORS.relation },
  About: { label: 'About', color: FAMILY_COLORS.relation },
  describes: { label: 'Describes', color: FAMILY_COLORS.relation },
  'describes for': { label: 'Describes for', color: FAMILY_COLORS.relation },
  'details for': { label: 'Details for', color: FAMILY_COLORS.relation },
  details: { label: 'Details', color: FAMILY_COLORS.relation },
  explains: { label: 'Explains', color: FAMILY_COLORS.relation },
  'explains for': { label: 'Explains for', color: FAMILY_COLORS.relation },
  'explains process of': { label: 'Explains process of', color: FAMILY_COLORS.relation },
  'expands on': { label: 'Expands on', color: FAMILY_COLORS.relation },
  documents: { label: 'Documents', color: FAMILY_COLORS.relation },
  maps: { label: 'Maps', color: FAMILY_COLORS.relation },
  involves: { label: 'Involves', color: FAMILY_COLORS.relation },
  'involved in': { label: 'Involved in', color: FAMILY_COLORS.relation },
  mirrors: { label: 'Mirrors', color: FAMILY_COLORS.relation },
  'parallel to': { label: 'Parallel to', color: FAMILY_COLORS.relation },
  'compared to': { label: 'Compared to', color: FAMILY_COLORS.relation },
  example: { label: 'Example', color: FAMILY_COLORS.relation },
  'example of': { label: 'Example of', color: FAMILY_COLORS.relation },
  is: { label: 'Is', color: FAMILY_COLORS.relation },
  was: { label: 'Was', color: FAMILY_COLORS.relation },
  foretells: { label: 'Foretells', color: FAMILY_COLORS.relation },

  // containment — whole/part (900+ links)
  'part of': { label: 'Part of', color: FAMILY_COLORS.containment },
  includes: { label: 'Includes', color: FAMILY_COLORS.containment },
  contains: { label: 'Contains', color: FAMILY_COLORS.containment },
  'composed of': { label: 'Composed of', color: FAMILY_COLORS.containment },
  'formed from': { label: 'Formed from', color: FAMILY_COLORS.containment },
  'branches from': { label: 'Branches from', color: FAMILY_COLORS.containment },
  'barrier within': { label: 'Barrier within', color: FAMILY_COLORS.containment },
  'distinct from': { label: 'Distinct from', color: FAMILY_COLORS.containment },

  // geography — the biggest themed group (300+ links)
  'located in': { label: 'Located in', color: FAMILY_COLORS.place },
  'located at': { label: 'Located at', color: FAMILY_COLORS.place },
  'found in': { label: 'Found in', color: FAMILY_COLORS.place },
  'found at': { label: 'Found at', color: FAMILY_COLORS.place },
  'found near': { label: 'Found near', color: FAMILY_COLORS.place },
  'home of': { label: 'Home of', color: FAMILY_COLORS.place },
  'lives in': { label: 'Lives in', color: FAMILY_COLORS.place },
  'dwells in': { label: 'Dwells in', color: FAMILY_COLORS.place },
  'resides in': { label: 'Resides in', color: FAMILY_COLORS.place },
  'inhabited by': { label: 'Inhabited by', color: FAMILY_COLORS.place },
  inhabit: { label: 'Inhabits', color: FAMILY_COLORS.place },
  'native to': { label: 'Native to', color: FAMILY_COLORS.place },
  'grows in': { label: 'Grows in', color: FAMILY_COLORS.place },
  'operates in': { label: 'Operates in', color: FAMILY_COLORS.place },
  'operates at': { label: 'Operates at', color: FAMILY_COLORS.place },
  'operated by': { label: 'Operated by', color: FAMILY_COLORS.place },
  operates: { label: 'Operates', color: FAMILY_COLORS.place },
  'occurs in': { label: 'Occurs in', color: FAMILY_COLORS.place },
  'occurs at': { label: 'Occurs at', color: FAMILY_COLORS.place },
  'took place in': { label: 'Took place in', color: FAMILY_COLORS.place },
  'takes place at': { label: 'Takes place at', color: FAMILY_COLORS.place },
  'conducted at': { label: 'Conducted at', color: FAMILY_COLORS.place },
  'practiced in': { label: 'Practiced in', color: FAMILY_COLORS.place },
  'practiced at': { label: 'Practiced at', color: FAMILY_COLORS.place },
  'practiced by': { label: 'Practiced by', color: FAMILY_COLORS.place },
  'studied at': { label: 'Studied at', color: FAMILY_COLORS.place },
  'capital of': { label: 'Capital of', color: FAMILY_COLORS.place },
  'hides in': { label: 'Hides in', color: FAMILY_COLORS.place, dashed: true },
  'born in': { label: 'Born in', color: FAMILY_COLORS.place },
  'primary in': { label: 'Primary in', color: FAMILY_COLORS.place },
  'sold in': { label: 'Sold in', color: FAMILY_COLORS.place },
  'produced in': { label: 'Produced in', color: FAMILY_COLORS.place },
  'cultural bond with': { label: 'Cultural bond with', color: FAMILY_COLORS.place },
  'coexist with': { label: 'Coexists with', color: FAMILY_COLORS.place },

  // possession & commerce
  'owned by': { label: 'Owned by', color: FAMILY_COLORS.possession },
  'owner of': { label: 'Owner of', color: FAMILY_COLORS.possession },
  'held by': { label: 'Held by', color: FAMILY_COLORS.possession },
  'Sold by': { label: 'Sold by', color: FAMILY_COLORS.possession },
  sells: { label: 'Sells', color: FAMILY_COLORS.possession },
  'wielded by': { label: 'Wielded by', color: FAMILY_COLORS.possession },
  wields: { label: 'Wields', color: FAMILY_COLORS.possession },
  'worn by': { label: 'Worn by', color: FAMILY_COLORS.possession },
  wears: { label: 'Wears', color: FAMILY_COLORS.possession },
  'valued by': { label: 'Valued by', color: FAMILY_COLORS.possession },
  'given to': { label: 'Given to', color: FAMILY_COLORS.possession },
  'passed down': { label: 'Passed down', color: FAMILY_COLORS.possession },
  'insurance of': { label: 'Insurance of', color: FAMILY_COLORS.possession },

  // membership & identity
  'class of': { label: 'Class of', color: FAMILY_COLORS.membership },
  'rank of': { label: 'Rank of', color: FAMILY_COLORS.membership },
  'member of': { label: 'Member of', color: FAMILY_COLORS.membership },
  'belongs to': { label: 'Belongs to', color: FAMILY_COLORS.membership },
  Joined: { label: 'Joined', color: FAMILY_COLORS.membership },
  'holds title': { label: 'Holds title', color: FAMILY_COLORS.membership },
  'form of': { label: 'Form of', color: FAMILY_COLORS.membership },
  'has form': { label: 'Has form', color: FAMILY_COLORS.membership },
  'unique to': { label: 'Unique to', color: FAMILY_COLORS.membership },

  // power & abilities
  'skill of': { label: 'Skill of', color: FAMILY_COLORS.power },
  'has skill': { label: 'Has skill', color: FAMILY_COLORS.power },
  uses: { label: 'Uses', color: FAMILY_COLORS.power },
  'used by': { label: 'Used by', color: FAMILY_COLORS.power },
  'Used by': { label: 'Used by', color: FAMILY_COLORS.power },
  'innate of': { label: 'Innate of', color: FAMILY_COLORS.power },
  'can use': { label: 'Can use', color: FAMILY_COLORS.power },
  'uniquely possesses': { label: 'Uniquely possesses', color: FAMILY_COLORS.power },
  channels: { label: 'Channels', color: FAMILY_COLORS.power },
  fuels: { label: 'Fuels', color: FAMILY_COLORS.power },
  'powered by': { label: 'Powered by', color: FAMILY_COLORS.power },
  'converts to': { label: 'Converts to', color: FAMILY_COLORS.power },
  'converts from': { label: 'Converts from', color: FAMILY_COLORS.power },
  transforms: { label: 'Transforms', color: FAMILY_COLORS.power },
  enables: { label: 'Enables', color: FAMILY_COLORS.power },
  'granted by': { label: 'Granted by', color: FAMILY_COLORS.power },
  blessed: { label: 'Blessed', color: FAMILY_COLORS.power },
  'Teacher at': { label: 'Teacher at', color: FAMILY_COLORS.power },
  'trains in': { label: 'Trains in', color: FAMILY_COLORS.power },
  'trains as': { label: 'Trains as', color: FAMILY_COLORS.power },
  trains: { label: 'Trains', color: FAMILY_COLORS.power },
  'trained by': { label: 'Trained by', color: FAMILY_COLORS.power },
  'Trainer of': { label: 'Trainer of', color: FAMILY_COLORS.power },
  'advances from': { label: 'Advances from', color: FAMILY_COLORS.power },
  'advances to': { label: 'Advances to', color: FAMILY_COLORS.power },
  'Evolve to': { label: 'Evolve to', color: FAMILY_COLORS.power },
  'evolves from': { label: 'Evolves from', color: FAMILY_COLORS.power },
  'evolves to': { label: 'Evolves to', color: FAMILY_COLORS.power },
  'progresses to': { label: 'Progresses to', color: FAMILY_COLORS.power },
  'can develop': { label: 'Can develop', color: FAMILY_COLORS.power },
};

export const FALLBACK_LINK = { label: 'Related to', color: FAMILY_COLORS.relation };

// Keyword → family fallback for types not in the exact table. Order matters:
// first matching keyword wins.
const KEYWORD_FAMILIES: Array<[string[], string]> = [
  [['kill', 'threaten', 'danger', 'harm', 'curse', 'drain', 'vulnerab', 'repel', 'counter', 'block'], FAMILY_COLORS.danger],
  [['guard', 'protect', 'seal', 'defend', 'shield', 'ward', 'safe', 'pacif', 'calm', 'sooth'], FAMILY_COLORS.protection],
  [['rule', 'govern', 'lead', 'command', 'control', 'manage', 'determine', 'found', 'leader', 'master', 'pillar', 'finger', 'ruler', 'king'], FAMILY_COLORS.influence],
  [['made from', 'crafted', 'forged', 'created', 'refined', 'corrupt', 'fused', 'origin', 'born from', 'component', 'ingredient', 'ingredient of', 'needed for', 'result'], FAMILY_COLORS.origin],
  [['portal', 'travel', 'journey', 'road', 'path', 'transport', 'move'], FAMILY_COLORS.movement],
  [['located', 'home', 'live', 'found in', 'inhabit', 'native', 'capital', 'realm', 'region', 'forest', 'city'], FAMILY_COLORS.place],
  [['skill', 'abilit', 'power', 'magic', 'innate', 'evolve', 'progress', 'train', 'grade', 'rank of'], FAMILY_COLORS.power],
  [['owned', 'held', 'sell', 'sold', 'wield', 'wear', 'given', 'passed'], FAMILY_COLORS.possession],
  [['member', 'class of', 'rank', 'joined', 'title', 'form of'], FAMILY_COLORS.membership],
  [['part of', 'include', 'contain', 'compose', 'branch'], FAMILY_COLORS.containment],
];

const fallbackCache = new Map<string, StoryLinkType>();

/** Style for a link type: exact table first, then keyword family, then hash color. */
export function storyLinkType(type: string): StoryLinkType {
  const exact = STORY_LINK_TYPES[type];
  if (exact) return exact;

  const cached = fallbackCache.get(type);
  if (cached) return cached;

  const lower = type.toLowerCase();
  let result: StoryLinkType | undefined;
  for (const [keywords, color] of KEYWORD_FAMILIES) {
    if (keywords.some((k) => lower.includes(k))) {
      result = { label: type, color };
      break;
    }
  }
  if (!result) {
    // deterministic hue from the type text so it's stable across renders
    let hash = 0;
    for (let i = 0; i < type.length; i += 1) hash = (hash * 31 + type.charCodeAt(i)) >>> 0;
    result = { label: type, color: FALLBACK_LINK.color };
  }
  fallbackCache.set(type, result);
  return result;
}

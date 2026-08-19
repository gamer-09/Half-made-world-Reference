export interface StoryLinkType {
  label: string;
  color: string;
  dashed?: boolean;
}

export const STORY_LINK_TYPES: Record<string, StoryLinkType> = {
  'home of': { label: 'Home of', color: '#22d3ee' },
  'lives in': { label: 'Lives in', color: '#38bdf8' },
  'part of': { label: 'Part of', color: '#94a3b8' },
  'located in': { label: 'Located in', color: '#34d399' },
  'portal to': { label: 'Portal to', color: '#a78bfa' },
  guards: { label: 'Guards', color: '#4ade80' },
  protects: { label: 'Protects', color: '#4ade80' },
  rules: { label: 'Rules', color: '#fbbf24' },
  'rank of': { label: 'Rank of', color: '#facc15' },
  serves: { label: 'Serves', color: '#c084fc' },
  chooses: { label: 'Chooses', color: '#fbbf24' },
  uses: { label: 'Uses', color: '#2dd4bf' },
  'corrupted from': { label: 'Corrupted from', color: '#a855f7' },
  causes: { label: 'Causes', color: '#f87171' },
  'fused from': { label: 'Fused from', color: '#e879f9' },
  studies: { label: 'Studies', color: '#4ade80' },
  kills: { label: 'Can kill', color: '#f87171' },
  'sealed in': { label: 'Sealed in', color: '#38bdf8' },
  'lost in': { label: 'Lost in', color: '#94a3b8', dashed: true },
  'found in': { label: 'Found in', color: '#f97316' },
  'crafted by': { label: 'Crafted by', color: '#f472b6' },
  seals: { label: 'Seals', color: '#fb923c' },
  produces: { label: 'Produces', color: '#c084fc' },
  'made from': { label: 'Made from', color: '#facc15' },
  'refined from': { label: 'Refined from', color: '#38bdf8' },
  'ingredient of': { label: 'Ingredient of', color: '#4ade80' },
  'needed for': { label: 'Needed for', color: '#fb923c' },
  'story of': { label: 'Story of', color: '#c084fc' },
  'innate of': { label: 'Innate of', color: '#2dd4bf' },
  about: { label: 'About', color: '#94a3b8' },
  'hungers like': { label: 'Hungers like', color: '#fbbf24' },
  'given to': { label: 'Given to', color: '#fb923c' },
  'found by': { label: 'Found by', color: '#34d399' },
  'passed down': { label: 'Passed down', color: '#818cf8' },
  'owned by': { label: 'Owned by', color: '#f472b6' },
  'skill of': { label: 'Skill of', color: '#4ade80' },
  'form of': { label: 'Form of', color: '#f472b6' },
  'class of': { label: 'Class of', color: '#38bdf8' },
  'progresses to': { label: 'Progresses to', color: '#818cf8' },
  'Leader of': { label: 'Leader of', color: '#fbbf24' },
  About: { label: 'About', color: '#94a3b8' },
  "Can't": { label: "Can't", color: '#f87171' },
  'Evolve to': { label: 'Evolve to', color: '#818cf8' },
  'Goes to': { label: 'Goes to', color: '#38bdf8' },
  Joined: { label: 'Joined', color: '#4ade80' },
  'Sold by': { label: 'Sold by', color: '#f472b6' },
  'Teacher at': { label: 'Teacher at', color: '#2dd4bf' },
  'Used by': { label: 'Used by', color: '#2dd4bf' },
  'head master of': { label: 'Head Master of', color: '#facc15' },
  'held by': { label: 'Held by', color: '#fbbf24' },
  'hides in': { label: 'Hides in', color: '#94a3b8' },
  'cursed by': { label: 'Cursed by', color: '#a855f7' },
};

export const FALLBACK_STORY = { label: 'Related to', color: '#94a3b8' };

export function storyLinkType(type: string): StoryLinkType {
  return STORY_LINK_TYPES[type] ?? { label: type, color: FALLBACK_STORY.color };
}

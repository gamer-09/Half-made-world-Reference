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
  'given to': { label: 'Given to', color: '#fb923c' },
  'found by': { label: 'Found by', color: '#34d399' },
  'passed down': { label: 'Passed down', color: '#818cf8' },
  'owned by': { label: 'Owned by', color: '#f472b6' },
  'skill of': { label: 'Skill of', color: '#4ade80' },
  'form of': { label: 'Form of', color: '#f472b6' },
  'class of': { label: 'Class of', color: '#38bdf8' },
};

export const FALLBACK_STORY = { label: 'Related to', color: '#94a3b8' };

export function storyLinkType(type: string): StoryLinkType {
  return STORY_LINK_TYPES[type] ?? { label: type, color: FALLBACK_STORY.color };
}

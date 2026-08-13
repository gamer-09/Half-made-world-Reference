export interface StoryLinkType {
  label: string;
  color: string;
  dashed?: boolean;
}

export const STORY_LINK_TYPES: Record<string, StoryLinkType> = {
  'home of': { label: 'Home of', color: '#2f6f8f' },
  'lives in': { label: 'Lives in', color: '#2a5f8f' },
  'part of': { label: 'Part of', color: '#8a8273' },
  'located in': { label: 'Located in', color: '#1f7a68' },
  'portal to': { label: 'Portal to', color: '#7a4fb0' },
  guards: { label: 'Guards', color: '#3a8a46' },
  protects: { label: 'Protects', color: '#3a8a46' },
  rules: { label: 'Rules', color: '#a9781f' },
  'rank of': { label: 'Rank of', color: '#a08a2f' },
  serves: { label: 'Serves', color: '#8a5fc0' },
  studies: { label: 'Studies', color: '#3a8a46' },
  kills: { label: 'Can kill', color: '#b02a2a' },
  'sealed in': { label: 'Sealed in', color: '#2f7fb0' },
  'lost in': { label: 'Lost in', color: '#8a8273', dashed: true },
  'found in': { label: 'Found in', color: '#a5602a' },
  'crafted by': { label: 'Crafted by', color: '#b0365c' },
  seals: { label: 'Seals', color: '#b06a2a' },
  produces: { label: 'Produces', color: '#8a3fb0' },
  'made from': { label: 'Made from', color: '#a08a2f' },
  'refined from': { label: 'Refined from', color: '#2f7fb0' },
  'ingredient of': { label: 'Ingredient of', color: '#3a8a46' },
  'needed for': { label: 'Needed for', color: '#b06a2a' },
  'story of': { label: 'Story of', color: '#8f4a9e' },
  'given to': { label: 'Given to', color: '#b06a2a' },
  'found by': { label: 'Found by', color: '#1f7a68' },
  'passed down': { label: 'Passed down', color: '#4a5f9e' },
  'owned by': { label: 'Owned by', color: '#a8264a' },
  'skill of': { label: 'Skill of', color: '#4a8a1f' },
  'form of': { label: 'Form of', color: '#c0247a' },
  'class of': { label: 'Class of', color: '#2a7a9e' },
};

export const FALLBACK_STORY = { label: 'Related to', color: '#8a8273' };

export function storyLinkType(type: string): StoryLinkType {
  return STORY_LINK_TYPES[type] ?? { label: type, color: FALLBACK_STORY.color };
}

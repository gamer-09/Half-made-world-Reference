export interface StoryLinkType {
  label: string;
  color: string;
  dashed?: boolean;
}

export const STORY_LINK_TYPES: Record<string, StoryLinkType> = {
  'home of': { label: 'Home of', color: '#8fd0e8' },
  'lives in': { label: 'Lives in', color: '#6ab7e8' },
  'part of': { label: 'Part of', color: '#9aa7c0' },
  'located in': { label: 'Located in', color: '#5fd4c7' },
  'portal to': { label: 'Portal to', color: '#a06cd5' },
  guards: { label: 'Guards', color: '#8ad08f' },
  protects: { label: 'Protects', color: '#8ad08f' },
  rules: { label: 'Rules', color: '#e8c56a' },
  'rank of': { label: 'Rank of', color: '#d4b64f' },
  serves: { label: 'Serves', color: '#b08ae0' },
  studies: { label: 'Studies', color: '#8ad08f' },
  kills: { label: 'Can kill', color: '#e0525f' },
  'sealed in': { label: 'Sealed in', color: '#7ec8f0' },
  'lost in': { label: 'Lost in', color: '#8b93a7', dashed: true },
  'found in': { label: 'Found in', color: '#e89a6a' },
  'crafted by': { label: 'Crafted by', color: '#e87aa0' },
  seals: { label: 'Seals', color: '#f0a868' },
  produces: { label: 'Produces', color: '#c78ae8' },
  'made from': { label: 'Made from', color: '#f0d06a' },
  'refined from': { label: 'Refined from', color: '#7ec8f0' },
  'ingredient of': { label: 'Ingredient of', color: '#8ad08f' },
  'needed for': { label: 'Needed for', color: '#f0a868' },
  'story of': { label: 'Story of', color: '#c0a0f0' },
  'given to': { label: 'Given to', color: '#ff9f43' },
  'found by': { label: 'Found by', color: '#63e6be' },
  'passed down': { label: 'Passed down', color: '#748ffc' },
  'owned by': { label: 'Owned by', color: '#d6336c' },
  'skill of': { label: 'Skill of', color: '#70e000' },
  'form of': { label: 'Form of', color: '#f72585' },
  'class of': { label: 'Class of', color: '#4cc9f0' },
};

export const FALLBACK_STORY = { label: 'Related to', color: '#9aa7c0' };

export function storyLinkType(type: string): StoryLinkType {
  return STORY_LINK_TYPES[type] ?? { label: type, color: FALLBACK_STORY.color };
}

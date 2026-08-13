export interface RelType {
  label: string;
  color: string;
  dashed?: boolean;
}

export const RELATIONSHIP_TYPES: Record<string, RelType> = {
  'child of': { label: 'Child of', color: '#a9781f' },
  'parent of': { label: 'Parent of', color: '#a9781f' },
  loves: { label: 'Loves', color: '#b0365c' },
  knows: { label: 'Knows', color: '#2f6f8f' },
  'unaware of': { label: 'Unaware of', color: '#8a8273', dashed: true },
  'guardian of': { label: 'Guardian of', color: '#3a8a46' },
  'right-hand of': { label: 'Right-hand of', color: '#7a4fb0' },
  serves: { label: 'Serves', color: '#8a5fc0' },
  'ruler of': { label: 'Ruler of', color: '#1f7a68' },
  betrayed: { label: 'Betrayed', color: '#b06a2a' },
  demoted: { label: 'Demoted', color: '#a5602a' },
  'ordered killed': { label: 'Ordered killed', color: '#b02a2a' },
  'rival of': { label: 'Rival of', color: '#c2473a' },
};

export const FALLBACK_REL = { label: 'Related to', color: '#8a8273' };

export function relationshipType(type: string): RelType {
  return RELATIONSHIP_TYPES[type] ?? { label: type, color: FALLBACK_REL.color };
}

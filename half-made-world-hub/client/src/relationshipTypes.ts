export interface RelType {
  label: string;
  color: string;
  dashed?: boolean;
}

export const RELATIONSHIP_TYPES: Record<string, RelType> = {
  'child of': { label: 'Child of', color: '#e8c56a' },
  'parent of': { label: 'Parent of', color: '#e8c56a' },
  loves: { label: 'Loves', color: '#e87aa0' },
  knows: { label: 'Knows', color: '#8fd0e8' },
  'unaware of': { label: 'Unaware of', color: '#8b93a7', dashed: true },
  'guardian of': { label: 'Guardian of', color: '#8ad08f' },
  'right-hand of': { label: 'Right-hand of', color: '#a06cd5' },
  serves: { label: 'Serves', color: '#b08ae0' },
  'ruler of': { label: 'Ruler of', color: '#5fd4c7' },
  betrayed: { label: 'Betrayed', color: '#f0a868' },
  demoted: { label: 'Demoted', color: '#e89a6a' },
  'ordered killed': { label: 'Ordered killed', color: '#e0525f' },
  'rival of': { label: 'Rival of', color: '#f07a6a' },
};

export const FALLBACK_REL = { label: 'Related to', color: '#9aa7c0' };

export function relationshipType(type: string): RelType {
  return RELATIONSHIP_TYPES[type] ?? { label: type, color: FALLBACK_REL.color };
}

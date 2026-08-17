export interface RelType {
  label: string;
  color: string;
  dashed?: boolean;
}

export const RELATIONSHIP_TYPES: Record<string, RelType> = {
  'child of': { label: 'Child of', color: '#fbbf24' },
  'parent of': { label: 'Parent of', color: '#fbbf24' },
  loves: { label: 'Loves', color: '#f472b6' },
  knows: { label: 'Knows', color: '#22d3ee' },
  'unaware of': { label: 'Unaware of', color: '#94a3b8', dashed: true },
  'guardian of': { label: 'Guardian of', color: '#4ade80' },
  'right-hand of': { label: 'Right-hand of', color: '#a78bfa' },
  serves: { label: 'Serves', color: '#c084fc' },
  'ruler of': { label: 'Ruler of', color: '#34d399' },
  betrayed: { label: 'Betrayed', color: '#fb923c' },
  demoted: { label: 'Demoted', color: '#f97316' },
  'ordered killed': { label: 'Ordered killed', color: '#f87171' },
  'rival of': { label: 'Rival of', color: '#f87171' },
  opposes: { label: 'Opposes', color: '#f87171' },
  watches: { label: 'Watches', color: '#94a3b8', dashed: true },
  drained: { label: 'Drained', color: '#c084fc' },
};

export const FALLBACK_REL = { label: 'Related to', color: '#94a3b8' };

export function relationshipType(type: string): RelType {
  return RELATIONSHIP_TYPES[type] ?? { label: type, color: FALLBACK_REL.color };
}

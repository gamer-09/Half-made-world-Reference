export const CATEGORY_COLORS: Record<string, string> = {
  Realms: '#8fd0e8',
  Locations: '#5fd4c7',
  Monsters: '#f07a6a',
  Beings: '#b08ae0',
  Angels: '#e8c56a',
  Demons: '#c78ae8',
  Humans: '#f0a868',
  'Magic Systems': '#7ec8f0',
  'Rules & Notes': '#9aa7c0',
  Classes: '#8ad08f',
  Items: '#e89a6a',
  'Hidden Realm': '#a0b4e8',
  Artifacts: '#f0d06a',
  Characters: '#e87aa0',
  Plot: '#c0a0f0',
  'Angel Skills': '#aee3f5',
  'Demon Skills': '#dcb0f5',
  'Character Forms': '#f5b3c5',
  'Artifact Skills': '#f5e08a',
};

export const FALLBACK_COLOR = '#8b93a7';

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? FALLBACK_COLOR;
}

/** Deterministic soft accent derived from a name (for brand-new categories). */
export function categoryAccent(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  const palette = ['#8fd0e8', '#c78ae8', '#8ad08f', '#f0a868', '#f07a6a', '#5fd4c7'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

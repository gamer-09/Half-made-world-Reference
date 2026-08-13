export const CATEGORY_COLORS: Record<string, string> = {
  Realms: '#2f6f8f',
  Locations: '#1f7a68',
  Monsters: '#c2473a',
  Beings: '#7a4fb0',
  Angels: '#a9781f',
  Demons: '#8a3fb0',
  Humans: '#b06a2a',
  'Magic Systems': '#2f7fb0',
  'Rules & Notes': '#6f6a5e',
  Classes: '#3a8a46',
  Items: '#a5602a',
  'Hidden Realm': '#4a5f9e',
  Artifacts: '#a08a2f',
  Characters: '#b0365c',
  Plot: '#8f4a9e',
  'Angel Skills': '#3a7a9e',
  'Demon Skills': '#8a4a9e',
  'Character Forms': '#b0526a',
  'Artifact Skills': '#7a8a2f',
};

export const FALLBACK_COLOR = '#8a8273';

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? FALLBACK_COLOR;
}

/** Deterministic soft accent derived from a name (for brand-new categories). */
export function categoryAccent(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  const palette = ['#2f6f8f', '#7a4fb0', '#3a8a46', '#b06a2a', '#c2473a', '#1f7a68'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

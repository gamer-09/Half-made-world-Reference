export const CATEGORY_COLORS: Record<string, string> = {
  Realms: '#c8a876',
  Locations: '#c8a876',
  Monsters: '#c25e4a',
  Beings: '#c8a876',
  Angels: '#c8a876',
  Demons: '#c25e4a',
  Humans: '#c8a876',
  'Magic Systems': '#c8a876',
  'Rules & Notes': '#7f8fa3',
  Classes: '#c8a876',
  Items: '#c8a876',
  'Hidden Realm': '#7f8fa3',
  Artifacts: '#c8a876',
  Characters: '#c8a876',
  Plot: '#c25e4a',
  'Angel Skills': '#c8a876',
  'Demon Skills': '#c25e4a',
  'Character Forms': '#c8a876',
  'Artifact Skills': '#c8a876',
  Coins: '#c8a876',
  'Hybrid Skills': '#c8a876',
  'Class Skills': '#c8a876',
  'Grade System': '#c8a876',
  'Rune Star Circles': '#c8a876',
  'Class Progression': '#6b8e6b',
};

export const FALLBACK_COLOR = '#7f8fa3';

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? FALLBACK_COLOR;
}

/** Deterministic brass accent derived from a name (for brand-new categories). */
export function categoryAccent(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  const palette = ['#c8a876', '#c25e4a', '#6b8e6b', '#7f8fa3', '#8f6b3c', '#c8a876'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

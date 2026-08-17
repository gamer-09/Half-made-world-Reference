export const CATEGORY_COLORS: Record<string, string> = {
  Realms: '#22d3ee',
  Locations: '#34d399',
  Monsters: '#f87171',
  Beings: '#a78bfa',
  Angels: '#fbbf24',
  Demons: '#c084fc',
  Humans: '#fb923c',
  'Magic Systems': '#38bdf8',
  'Rules & Notes': '#94a3b8',
  Classes: '#4ade80',
  Items: '#fbbf24',
  'Hidden Realm': '#818cf8',
  Artifacts: '#facc15',
  Characters: '#f472b6',
  Plot: '#c084fc',
  'Angel Skills': '#7dd3fc',
  'Demon Skills': '#d8b4fe',
  'Character Forms': '#fda4af',
  'Artifact Skills': '#bef264',
  Coins: '#fde047',
  'Hybrid Skills': '#e879f9',
};

export const FALLBACK_COLOR = '#94a3b8';

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? FALLBACK_COLOR;
}

/** Deterministic neon accent derived from a name (for brand-new categories). */
export function categoryAccent(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  const palette = ['#22d3ee', '#a78bfa', '#4ade80', '#fb923c', '#f87171', '#34d399'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

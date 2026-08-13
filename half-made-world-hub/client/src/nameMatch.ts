import type { Entry } from './types';

/**
 * Match a raw name (e.g. "Jaiden") to a character entry whose name may carry
 * a suffix (e.g. "Jaiden Marlock — Normal"). Case-insensitive prefix match.
 */
export function findCharacter(entries: Entry[], name: string): Entry | undefined {
  const n = name.toLowerCase().trim();
  if (!n) return undefined;
  return entries.find((e) => {
    if (e.category !== 'Characters') return false;
    const en = e.name.toLowerCase();
    return (
      en === n ||
      en.startsWith(n + ' ') ||
      en.startsWith(n + '(') ||
      en.startsWith(n + '（') ||
      en.startsWith(n + '-')
    );
  });
}

export function isCharacter(entries: Entry[], name: string): boolean {
  return findCharacter(entries, name) !== undefined;
}

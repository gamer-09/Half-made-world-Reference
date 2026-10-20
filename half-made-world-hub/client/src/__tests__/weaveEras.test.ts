import { describe, it, expect } from 'vitest';
import type { Entry, StoryLink } from '../types';
import {
  ERAS,
  resolveName,
  pickNextUnplaced,
  eraEntries,
  revealOracle,
  oracleTeaser,
} from '../weaveEras';

const mkEntry = (name: string, over: Partial<Entry> = {}): Entry => ({
  id: `e-${name}`,
  category: 'Lore & Myths',
  name,
  subtitle: '',
  description: `A sentence about ${name}.`,
  fields: [],
  tags: [],
  createdAt: '',
  updatedAt: '',
  ...over,
});

const mkLink = (source: string, target: string): StoryLink => ({
  id: `l-${source}-${target}`,
  source,
  target,
  type: 'related',
  label: '',
  description: '',
  createdAt: '',
  updatedAt: '',
});

describe('ERAS', () => {
  it('exposes a unique, non-empty era for every timeline stage', () => {
    const ids = ERAS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ERAS.length).toBeGreaterThanOrEqual(10);
    for (const era of ERAS) {
      expect(era.name.length).toBeGreaterThan(0);
      expect(era.anchors.length).toBeGreaterThan(0);
      expect(era.material.length).toBeGreaterThan(0);
    }
  });

  it('is ordered from the Age of the Aelthar to the Fourth Turning', () => {
    expect(ERAS[0].id).toBe('aelthar');
    expect(ERAS[ERAS.length - 1].id).toBe('fourth-turning');
  });
});

describe('resolveName', () => {
  const entries = [
    mkEntry('The Aelthar'),
    mkEntry('Jaiden Marlock', { category: 'Characters' }),
    mkEntry('The Sundering'),
  ];

  it('resolves an exact case-insensitive name', () => {
    expect(resolveName('the aelthar', entries)).toBe('The Aelthar');
  });

  it('resolves a character via prefix match', () => {
    expect(resolveName('Jaiden', entries)).toBe('Jaiden Marlock');
  });

  it('falls back to a contains match', () => {
    expect(resolveName('Sundering', entries)).toBe('The Sundering');
  });

  it('returns null for an unknown name', () => {
    expect(resolveName('Nonexistent Thing', entries)).toBeNull();
  });
});

describe('eraEntries', () => {
  const era = ERAS[0];
  it('returns resolvable entries in curated order and dedupes', () => {
    const entries = [mkEntry('World Eater'), mkEntry('The Aelthar'), mkEntry('The Hidden Realm')];
    const out = eraEntries(era, entries);
    const names = out.map((e) => e.name);
    expect(names.length).toBe(new Set(names).size);
    for (const n of names) expect(entries.some((e) => e.name === n)).toBe(true);
  });

  it('returns an empty list when nothing matches', () => {
    expect(eraEntries(era, [mkEntry('Unrelated')])).toEqual([]);
  });
});

describe('pickNextUnplaced', () => {
  it('skips already-placed entries', () => {
    const entries = [mkEntry('The Aelthar'), mkEntry('World Eater')];
    const era = ERAS[0];
    const first = pickNextUnplaced(era.material, entries, new Set());
    expect(first).not.toBeNull();
    const second = pickNextUnplaced(era.material, entries, new Set([first!.name]));
    expect(second?.name).not.toBe(first!.name);
  });

  it('returns null when every match is placed', () => {
    const entries = [mkEntry('The Aelthar')];
    expect(pickNextUnplaced(['The Aelthar'], entries, new Set(['The Aelthar']))).toBeNull();
  });
});

describe('revealOracle', () => {
  it('prefers a linked neighbour of the chosen entry', () => {
    const entries = [mkEntry('The Aelthar'), mkEntry('World Eater')];
    const links = [mkLink('The Aelthar', 'World Eater')];
    for (let i = 0; i < 5; i += 1) {
      const pick = revealOracle(ERAS[0], entries, links, null);
      expect(['The Aelthar', 'World Eater']).toContain(pick.entry.name);
    }
  });

  it('falls back to a timeline stub when the era has no material', () => {
    const pick = revealOracle(ERAS[0], [mkEntry('Unrelated')], [], null);
    expect(pick.entry.tags).toContain('timeline');
    expect(pick.entry.name.length).toBeGreaterThan(0);
  });
});

describe('oracleTeaser', () => {
  it('trims long text with an ellipsis', () => {
    const long = mkEntry('X', { description: 'word '.repeat(100) });
    const teaser = oracleTeaser(long, 50);
    expect(teaser.length).toBeLessThanOrEqual(50);
    expect(teaser.endsWith('…')).toBe(true);
  });
});

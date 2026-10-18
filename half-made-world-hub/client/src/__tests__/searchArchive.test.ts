import { describe, it, expect } from 'vitest';
import { searchArchive, type SearchArchiveData } from '../search';

const data: SearchArchiveData = {
  entries: [
    {
      id: '1',
      category: 'Characters',
      name: 'Ordium',
      subtitle: 'The Awakened',
      description: 'Ordium is the protagonist of the story.',
      fields: [],
      tags: ['main character'],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: '2',
      category: 'Race Types',
      name: 'Angel Sustenance',
      subtitle: '',
      description: 'Angels do not eat mortal food; they feed on Ren.',
      fields: [{ label: 'Diet', value: 'Ren' }],
      tags: ['angel'],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: '3',
      category: 'Places',
      name: 'Umbrage Forest',
      subtitle: '',
      description: 'A dark forest on the edge of the known world.',
      fields: [],
      tags: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ],
  relationships: [
    {
      id: 'r1',
      source: 'Ordium',
      target: 'Lisa',
      type: 'ally',
      label: 'helped',
      description: '',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ],
  storyLinks: [
    {
      id: 's1',
      source: 'Ordium',
      target: 'Umbrage Forest',
      type: 'journey',
      label: 'travelled to',
      description: '',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ],
};

describe('searchArchive', () => {
  it('ranks an exact name hit first and attaches matching links', () => {
    const result = searchArchive('Ordium', data);
    expect(result.entries[0].name).toBe('Ordium');
    expect(result.relationships.map((r) => r.id)).toContain('r1');
    expect(result.storyLinks.map((l) => l.id)).toContain('s1');
  });

  it('tolerates natural-language stop words', () => {
    const result = searchArchive('who is ordium?', data);
    expect(result.entries[0].name).toBe('Ordium');
  });

  it('matches a plural via stemming and synonyms', () => {
    const result = searchArchive('what do angels eat', data);
    expect(result.entries[0].name).toBe('Angel Sustenance');
  });

  it('expands shorthand keywords ("mc" -> "main character")', () => {
    const result = searchArchive('mc', data);
    expect(result.keywords).toContain('main character');
    expect(result.entries[0].name).toBe('Ordium');
  });

  it('reports real totals alongside the capped lists', () => {
    const result = searchArchive('Ordium', data);
    expect(result.totals).toEqual({ entries: 1, relationships: 1, storyLinks: 1 });
  });

  it('returns an empty result for a stop-word-only query', () => {
    const result = searchArchive('the and of', data);
    expect(result.entries).toEqual([]);
    expect(result.relationships).toEqual([]);
    expect(result.storyLinks).toEqual([]);
  });

  it('returns an empty result for a blank query', () => {
    const result = searchArchive('   ', data);
    expect(result.entries).toEqual([]);
    expect(result.query).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain CommonJS server module, no type declarations.
import canonRules from '../../../server/canon-rules.js';
import type { CanonFinding } from '../types';

const { lintArchive, lintEntry } = canonRules as {
  lintArchive: (data: { world: object[]; links?: object[]; rels?: object[] }) => CanonFinding[];
  lintEntry: (data: { world: object[]; links?: object[]; rels?: object[]; entry: object }) => CanonFinding[];
};

const entry = (over: Record<string, unknown> = {}) => ({
  id: 'e1',
  category: 'Test',
  name: 'Alpha',
  subtitle: '',
  description: 'A complete sentence about Alpha.',
  fields: [],
  tags: [],
  ...over,
});

describe('lintArchive', () => {
  it('flags nothing for a clean, lirop-free archive', () => {
    const world = [entry(), entry({ id: 'e2', name: 'Beta', description: 'Another full sentence.' })];
    const links = [{ id: 'l1', source: 'Alpha', target: 'Beta' }];
    expect(lintArchive({ world, links, rels: [] })).toEqual([]);
  });

  it('flags BROKEN-REF for a link pointing at a missing entry', () => {
    const world = [entry()];
    const links = [{ id: 'l1', source: 'Alpha', target: 'Ghost' }];
    const out = lintArchive({ world, links, rels: [] });
    expect(out.some((f) => f.rule === 'BROKEN-REF' && f.name === 'Ghost')).toBe(true);
  });

  it('flags ORPHAN for an entry with no links', () => {
    const out = lintArchive({ world: [entry()], links: [], rels: [] });
    expect(out.some((f) => f.rule === 'ORPHAN' && f.name === 'Alpha')).toBe(true);
  });

  it('flags DUPLICATE for two entries sharing a name', () => {
    const world = [entry(), entry({ id: 'e2' })];
    const out = lintArchive({ world, links: [], rels: [] });
    expect(out.some((f) => f.rule === 'DUPLICATE')).toBe(true);
  });

  it('flags GAP for a truncated description', () => {
    const world = [entry({ description: 'This description just stops mid-sentence and' })];
    const out = lintArchive({ world, links: [], rels: [] });
    expect(out.some((f) => f.rule === 'GAP')).toBe(true);
  });

  it('flags SUGGESTED-LINK when an entry names an under-connected entry', () => {
    const world = [
      entry({ description: 'Alpha bows before Betaname here.' }),
      entry({ id: 'e2', name: 'Betaname' }),
    ];
    const out = lintArchive({ world, links: [], rels: [] });
    expect(
      out.some((f) => f.rule === 'SUGGESTED-LINK' && f.name === 'Alpha' && f.otherName === 'Betaname'),
    ).toBe(true);
  });

  it('does NOT suggest a link to a well-connected entry', () => {
    const world = [
      entry({ description: 'Alpha bows before Betaname here.' }),
      entry({ id: 'e2', name: 'Betaname' }),
      entry({ id: 'e3', name: 'Gamma' }),
    ];
    // Betaname is already linked to two entries — mentioning it isn't actionable.
    const links = [
      { id: 'l1', source: 'Betaname', target: 'Gamma' },
      { id: 'l2', source: 'Betaname', target: 'Alpha' },
    ];
    const out = lintArchive({ world, links, rels: [] });
    expect(out.some((f) => f.rule === 'SUGGESTED-LINK' && f.otherName === 'Betaname')).toBe(false);
  });

  it('ignores short common-word names that match ordinary prose', () => {
    const world = [
      entry({ description: 'The humans rally against the elves in every chapter.' }),
      entry({ id: 'e2', name: 'Humans' }),
      entry({ id: 'e3', name: 'Elves' }),
    ];
    const out = lintArchive({ world, links: [], rels: [] });
    expect(out.some((f) => f.rule === 'SUGGESTED-LINK')).toBe(false);
  });
  it('marks known-benign hybrid claims as benign (not errors)', () => {
    const world = [
      entry({ name: 'Jaiden', description: 'Jaiden is the first angel-demon hybrid.' }),
    ];
    const out = lintArchive({ world, links: [], rels: [] });
    const hit = out.find((f) => f.rule === 'CONTRADICTION' && f.claim);
    expect(hit?.benign).toBe(true);
    expect(hit?.severity).toBe('info');
  });
});

describe('lintEntry', () => {
  it('scopes findings to the draft entry', () => {
    const world = [entry(), entry({ id: 'e2', name: 'Betaname' })];
    const draft = entry({ id: 'draft', name: 'Betaname', description: 'A copy of an existing name.' });
    const out = lintEntry({ world, links: [], rels: [], entry: draft });
    expect(out.every((f) => f.name.toLowerCase() === 'betaname')).toBe(true);
    expect(out.some((f) => f.rule === 'DUPLICATE' || f.rule === 'DRIFT')).toBe(true);
  });

  it('flags a contradiction claim made by the draft', () => {
    const world = [
      entry({
        name: 'Jaiden',
        description: 'Jaiden is the first angel-demon hybrid everyone knows.',
        fields: [],
      }),
    ];
    const draft = entry({
      id: 'draft',
      name: 'Impostor',
      description: 'Impostor claims to be the only angel-demon hybrid.',
    });
    const out = lintEntry({ world, links: [], rels: [], entry: draft });
    expect(out.some((f) => f.rule === 'CONTRADICTION' && f.name === 'Impostor')).toBe(true);
  });
});

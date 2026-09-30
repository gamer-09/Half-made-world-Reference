import { describe, it, expect } from 'vitest';
import {
  parseInline,
  parseDescription,
  chunkSentences,
  findSections,
  findIntroBlocks,
  isLongDescription,
} from '../descriptionParser';

// ── parseInline ───────────────────────────────────────────────────────

describe('parseInline', () => {
  it('converts **bold** to <strong>', () => {
    expect(parseInline('a **bold** word')).toBe('a <strong>bold</strong> word');
  });

  it('converts *italic* to <em> but not inside bold', () => {
    expect(parseInline('*soft* voice')).toBe('<em>soft</em> voice');
    expect(parseInline('**bold** and *soft*')).toBe('<strong>bold</strong> and <em>soft</em>');
  });

  it('converts `code` to an inline code element', () => {
    expect(parseInline('the `Auralis Ruby` glows')).toBe(
      'the <code class="desc-inline-code">Auralis Ruby</code> glows',
    );
  });

  it('leaves plain text untouched', () => {
    expect(parseInline('no markers here')).toBe('no markers here');
  });

  it('handles multiple bold segments in one string', () => {
    expect(parseInline('**a** and **b**')).toBe('<strong>a</strong> and <strong>b</strong>');
  });
});

// ── parseDescription: headings ────────────────────────────────────────

describe('parseDescription — headings', () => {
  it('parses ## headings with their level', () => {
    const blocks = parseDescription('## Appearance');
    expect(blocks).toEqual([{ type: 'heading', level: 2, text: 'Appearance' }]);
  });

  it('parses ### as level 3', () => {
    const blocks = parseDescription('### Sub-section');
    expect(blocks).toEqual([{ type: 'heading', level: 3, text: 'Sub-section' }]);
  });

  it('trims heading text', () => {
    const blocks = parseDescription('##   Spaced heading   ');
    expect(blocks[0]).toMatchObject({ type: 'heading', text: 'Spaced heading' });
  });

  it('does not treat # without space as a heading', () => {
    const blocks = parseDescription('##hashtag');
    expect(blocks).toEqual([{ type: 'paragraph', html: '##hashtag', raw: '##hashtag' }]);
  });
});

// ── parseDescription: lists ───────────────────────────────────────────

describe('parseDescription — lists', () => {
  it('parses consecutive - lines into one unordered list', () => {
    const blocks = parseDescription('- first\n- second\n- third');
    expect(blocks).toEqual([
      { type: 'list', items: ['first', 'second', 'third'], ordered: false },
    ]);
  });

  it('parses * and + bullets as unordered items too', () => {
    const blocks = parseDescription('* star\n+ plus');
    expect(blocks).toEqual([
      { type: 'list', items: ['star', 'plus'], ordered: false },
    ]);
  });

  it('parses numbered lines into an ordered list', () => {
    const blocks = parseDescription('1. wake\n2. train\n3. fight');
    expect(blocks).toEqual([
      { type: 'list', items: ['wake', 'train', 'fight'], ordered: true },
    ]);
  });

  it('keeps two lists separate when a paragraph sits between them', () => {
    const blocks = parseDescription('- one\n\ntext\n\n- two');
    expect(blocks).toEqual([
      { type: 'list', items: ['one'], ordered: false },
      { type: 'paragraph', html: 'text', raw: 'text' },
      { type: 'list', items: ['two'], ordered: false },
    ]);
  });

  it('preserves inline markdown inside list items', () => {
    const blocks = parseDescription('- the **Auralis Ruby** seal');
    const list = blocks[0];
    expect(list.type === 'list' && list.items[0]).toBe('the **Auralis Ruby** seal');
  });
});

// ── parseDescription: dividers & paragraphs ──────────────────────────

describe('parseDescription — dividers and paragraphs', () => {
  it('parses --- as a divider', () => {
    expect(parseDescription('---')).toEqual([{ type: 'divider' }]);
  });

  it('parses *** and ___ as dividers too', () => {
    expect(parseDescription('***')).toEqual([{ type: 'divider' }]);
    expect(parseDescription('___')).toEqual([{ type: 'divider' }]);
  });

  it('joins consecutive non-empty lines into one paragraph', () => {
    const blocks = parseDescription('line one\nline two');
    expect(blocks).toEqual([{ type: 'paragraph', html: 'line one line two', raw: 'line one line two' }]);
  });

  it('splits paragraphs on blank lines', () => {
    const blocks = parseDescription('first para\n\nsecond para');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: 'paragraph', raw: 'first para' });
    expect(blocks[1]).toMatchObject({ type: 'paragraph', raw: 'second para' });
  });

  it('ignores leading/trailing blank lines', () => {
    const blocks = parseDescription('\n\n  hello  \n\n');
    expect(blocks).toEqual([{ type: 'paragraph', html: 'hello', raw: 'hello' }]);
  });

  it('returns empty array for empty input', () => {
    expect(parseDescription('')).toEqual([]);
    expect(parseDescription('\n\n')).toEqual([]);
  });

  it('applies inline markdown within paragraphs', () => {
    const blocks = parseDescription('He wears **six horns** and a *split* halo.');
    expect(blocks[0]).toMatchObject({
      html: 'He wears <strong>six horns</strong> and a <em>split</em> halo.',
    });
  });
});

// ── parseDescription: mixed documents ────────────────────────────────

describe('parseDescription — mixed documents', () => {
  it('parses a full entry shape: intro, heading, list, divider, heading, paragraph', () => {
    const raw = [
      'Jaiden Marlock is the protagonist.',
      '',
      '## APPEARANCE',
      '- dark hair',
      '- grey eyes',
      '',
      '---',
      '',
      '## ABILITIES',
      'He channels both auras.',
    ].join('\n');

    const blocks = parseDescription(raw);
    expect(blocks.map((b) => b.type)).toEqual([
      'paragraph', 'heading', 'list', 'divider', 'heading', 'paragraph',
    ]);
  });

  it('produces no duplicated blocks for any input (invariant)', () => {
    const raw = 'intro\n\n## A\n\nbody a\n\n## B\n\n- item\n\n---\n\nmore';
    const blocks = parseDescription(raw);
    // same object identity never repeats
    const ids = new Set(blocks.map((b) => JSON.stringify(b)));
    expect(ids.size).toBe(blocks.length);
  });
});

// ── chunkSentences ────────────────────────────────────────────────────

describe('chunkSentences', () => {
  it('returns one chunk for short text', () => {
    expect(chunkSentences('Short text.')).toEqual(['Short text.']);
  });

  it('returns one chunk when text is exactly at maxLen', () => {
    const text = 'a'.repeat(250);
    expect(chunkSentences(text, 250)).toEqual([text]);
  });

  it('splits long text at sentence boundaries', () => {
    const text =
      'First sentence here. Second sentence adds more words to the mix. Third sentence pushes the total over the limit. Fourth sentence follows.';
    const chunks = chunkSentences(text, 80);
    expect(chunks.length).toBeGreaterThan(1);
    // every sentence survives the split exactly once
    const rejoined = chunks.join(' ');
    for (const s of ['First sentence here.', 'Second sentence adds more words to the mix.', 'Third sentence pushes the total over the limit.', 'Fourth sentence follows.']) {
      expect(rejoined).toContain(s);
    }
  });

  it('never splits mid-sentence when a single sentence exceeds maxLen', () => {
    const longSentence = 'word '.repeat(60).trim() + '.';
    const chunks = chunkSentences(longSentence, 50);
    expect(chunks).toEqual([longSentence]);
  });

  it('keeps all content when rejoining chunks (invariant)', () => {
    const text =
      'One. Two. Three. Four. Five. Six. Seven. Eight. Nine. Ten. Eleven. Twelve. Thirteen. Fourteen. Fifteen.';
    const chunks = chunkSentences(text, 30);
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    expect(normalize(chunks.join(' '))).toBe(normalize(text));
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('produces no empty chunks', () => {
    const chunks = chunkSentences('A. B. C. D. E. F. G. H. I. J.', 8);
    for (const c of chunks) expect(c.trim().length).toBeGreaterThan(0);
  });

  it('handles question and exclamation boundaries', () => {
    const text = 'Is this a question? Yes it is! And more text follows here to overflow the limit quickly.';
    const chunks = chunkSentences(text, 40);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(' ')).toContain('Is this a question?');
  });
});

// ── findSections & findIntroBlocks ───────────────────────────────────

describe('findSections', () => {
  it('splits blocks on level-2 headings', () => {
    const blocks = parseDescription('## A\n\nbody a\n\n## B\n\nbody b');
    const sections = findSections(blocks);
    expect(sections).toEqual([
      { heading: 'A', body: [expect.objectContaining({ type: 'paragraph' })] },
      { heading: 'B', body: [expect.objectContaining({ type: 'paragraph' })] },
    ]);
  });

  it('keeps content after a level-3 heading inside the current section', () => {
    const blocks = parseDescription('## A\n\nintro\n\n### detail\n\ndeep');
    const sections = findSections(blocks);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe('A');
    expect(sections[0].body).toHaveLength(3); // paragraph, heading(3), paragraph
  });

  it('returns empty array when there are no headings', () => {
    const blocks = parseDescription('just text');
    expect(findSections(blocks)).toEqual([]);
  });

  it('does not duplicate section bodies (invariant)', () => {
    const blocks = parseDescription('## X\n\none\n\ntwo\n\n## Y\n\nthree');
    const sections = findSections(blocks);
    const allBodyText = sections.map((s) => s.body.map((b) => JSON.stringify(b)).join()).join();
    expect(allBodyText).not.toContain('"raw":"one","html"');
    // count occurrences of each raw text across ALL sections
    for (const raw of ['one', 'two', 'three']) {
      const count = sections.filter((s) =>
        s.body.some((b) => b.type === 'paragraph' && b.raw === raw),
      ).length;
      expect(count).toBeLessThanOrEqual(1);
    }
  });
});

describe('findIntroBlocks', () => {
  it('returns everything before the first ## heading', () => {
    const blocks = parseDescription('intro line\n\n## A\n\nbody');
    const intro = findIntroBlocks(blocks);
    expect(intro).toHaveLength(1);
    expect(intro[0]).toMatchObject({ type: 'paragraph', raw: 'intro line' });
  });

  it('returns empty when text starts with a ## heading', () => {
    const blocks = parseDescription('## A\n\nbody');
    expect(findIntroBlocks(blocks)).toEqual([]);
  });

  it('returns all blocks when there are no headings (minus any headings)', () => {
    const blocks = parseDescription('one\n\ntwo');
    expect(findIntroBlocks(blocks)).toHaveLength(2);
  });
});

// ── isLongDescription ────────────────────────────────────────────────

describe('isLongDescription', () => {
  it('is false for short text', () => {
    expect(isLongDescription('short')).toBe(false);
  });

  it('is true past the 350-char threshold', () => {
    expect(isLongDescription('x'.repeat(351))).toBe(true);
    expect(isLongDescription('x'.repeat(350))).toBe(false);
  });
});

// ── end-to-end: the original duplication bug stays dead ─────────────

describe('renderer input pipeline (regression)', () => {
  it('parse + chunk covers the full text exactly once', () => {
    const raw =
      'Jaiden is fifteen. He has trained for years. The ruby pulses. Something wakes. The world shakes. He stands ready.';
    const blocks = parseDescription(raw);
    const paragraphs = blocks.filter((b) => b.type === 'paragraph');
    const joined = paragraphs.map((b) => (b.type === 'paragraph' ? b.raw : '')).join(' ');
    const chunks = chunkSentences(joined, 60);

    // chunks rejoin to the full paragraph text — nothing lost, nothing doubled
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    expect(normalize(chunks.join(' '))).toBe(normalize(joined));
  });
});

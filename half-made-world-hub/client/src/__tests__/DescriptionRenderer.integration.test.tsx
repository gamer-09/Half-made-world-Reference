import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DescriptionRenderer } from '../components/DescriptionRenderer';

// @testing-library/react needs jsdom — configured in vitest.config.ts

const LONG_NO_SECTIONS = Array.from({ length: 30 }, (_, i) =>
  `Paragraph ${i + 1}: the world core sleeps beneath everything and its dreams shape the ley lines that feed every mage's power. Zmarker${i + 1}Z sentence end.`,
).join('\n\n');

describe('DescriptionRenderer — save-then-expand regression (integration)', () => {
  afterEach(() => cleanup());

  it('renders chunk 0 once and hides the rest when collapsed', () => {
    render(<DescriptionRenderer text={LONG_NO_SECTIONS} />);
    // first chunk is visible exactly once
    expect(screen.getAllByText(/Zmarker1Z/).length).toBe(1);
    // hidden chunks are NOT rendered at all when collapsed
    expect(screen.queryAllByText(/Zmarker20Z/).length).toBe(0);
  });

  it('renders each paragraph exactly ONCE after expanding fully', () => {
    render(<DescriptionRenderer text={LONG_NO_SECTIONS} />);
    // click "Read full description" (the global expand)
    fireEvent.click(screen.getByText(/Read full description/));

    // every marker must appear EXACTLY once in the whole document
    for (let i = 1; i <= 30; i++) {
      const matches = screen.getAllByText(new RegExp(`Zmarker${i}Z`));
      expect(matches.length).toBe(1);
    }
    // "Show less" is now available
    expect(screen.getByText(/Show less/)).toBeTruthy();
  });

  it('renders each paragraph exactly ONCE via progressive "Continue reading…" reveals', () => {
    render(<DescriptionRenderer text={LONG_NO_SECTIONS} />);
    // click through Continue reading until exhausted
    for (let clicks = 0; clicks < 40; clicks++) {
      const btn = screen.queryByText(/Continue reading…/);
      if (!btn) break;
      fireEvent.click(btn);
    }
    for (let i = 1; i <= 30; i++) {
      expect(screen.getAllByText(new RegExp(`Zmarker${i}Z`)).length).toBe(1);
    }
  });

  it('handles a saved entry with ## sections without duplication', () => {
    const withSections = Array.from({ length: 8 }, (_, i) => {
      const part = Array.from({ length: 6 }, (_, j) =>
        `Section paragraph with Zsecmark${i + 1}x${j + 1}Z for testing section rendering.`,
      ).join(' ');
      return `## SECTION ${i + 1}\n\n${part}`;
    }).join('\n\n');

    render(<DescriptionRenderer text={withSections} />);
    // expand all
    fireEvent.click(screen.getByText(/Expand all sections/));
    // each unique marker appears exactly once
    for (let i = 1; i <= 8; i++) {
      for (let j = 1; j <= 6; j++) {
        const matches = screen.getAllByText(new RegExp(`Zsecmark${i}x${j}Z`));
        expect(matches.length).toBe(1);
      }
    }
  });

  it('round-trips a realistic API-saved description (long, with edits appended)', () => {
    // Mimic: original long entry + user appends sentences via the edit form
    const original = Array.from({ length: 20 }, (_, i) =>
      `Original paragraph describing the faith of the world core with Zorig${i + 1}Z.`,
    ).join('\n\n');
    const edited =
      original +
      '\n\nNewly edited sentence with Zedit1Z. Another edited sentence Zedit2Z. A third one Zedit3Z to make the tail long enough to chunk.';

    render(<DescriptionRenderer text={edited} />);
    fireEvent.click(screen.getByText(/Read full description/));

    // originals appear once (exact tokens — no prefix collisions)
    for (let i = 1; i <= 20; i++) {
      expect(screen.getAllByText(new RegExp(`Zorig${i}Z`)).length).toBe(1);
    }
    // the appended edit appears once — not duplicated by the save
    for (const m of ['Zedit1Z', 'Zedit2Z', 'Zedit3Z']) {
      expect(screen.getAllByText(new RegExp(m)).length).toBe(1);
    }
  });
});

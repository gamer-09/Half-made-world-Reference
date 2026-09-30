/**
 * Pure description parser — shared by the DescriptionRenderer component.
 *
 * Parses a raw entry description into structured, readable blocks.
 * Works for ALL entries — short or long, with or without ## sections.
 *
 * Supports:
 *   ## HEADER
 *   --- (divider)
 *   **bold text**
 *   *italic text*
 *   - bullet items
 *   1. numbered items
 *
 * Everything here is a PURE function: text in → data out. No React, no DOM.
 * Unit tests live in src/__tests__/descriptionParser.test.ts.
 */

export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'divider' }
  | { type: 'paragraph'; html: string; raw: string }
  | { type: 'list'; items: string[]; ordered: boolean };

/** Inline markdown → HTML (bold, italic, inline code). Returns HTML string. */
export function parseInline(text: string): string {
  let out = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  out = out.replace(/`(.+?)`/g, '<code class="desc-inline-code">$1</code>');
  return out;
}

/** Parse raw description text into an ordered list of blocks. */
export function parseDescription(raw: string): Block[] {
  const lines = raw.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') { i++; continue; }

    // Divider: --- or ___ or ***
    if (/^[-_*]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // Heading: ## or ### etc
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // Unordered list: - item
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', items, ordered: false });
      continue;
    }

    // Ordered list: 1. item
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', items, ordered: true });
      continue;
    }

    // Paragraph — accumulate consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trim();
      if (l === '' || /^#{1,6}\s/.test(l) || /^[-_*]{3,}$/.test(l) || /^[-*+]\s+/.test(l) || /^\d+\.\s+/.test(l)) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length) {
      const joined = paraLines.join(' ');
      blocks.push({ type: 'paragraph', html: parseInline(joined), raw: joined });
    }
  }

  return blocks;
}

/** Split a long paragraph string into sentence chunks of ~maxLen chars. */
export function chunkSentences(text: string, maxLen: number = 250): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  // Split on sentence boundaries: period/exclamation/question followed by space or end
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + ' ' + sentence : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.length ? chunks : [text];
}

/** Group blocks into ## sections (level-2 headings start a new section). */
export function findSections(blocks: Block[]): { heading: string; body: Block[] }[] {
  const sections: { heading: string; body: Block[] }[] = [];
  let current: { heading: string; body: Block[] } | null = null;

  for (const block of blocks) {
    if (block.type === 'heading' && block.level === 2) {
      if (current) sections.push(current);
      current = { heading: block.text, body: [] };
    } else if (current) {
      current.body.push(block);
    }
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * Extract intro blocks — everything before the first level-2 heading
 * (headings themselves excluded). Empty array when the text starts
 * with a ## heading.
 */
export function findIntroBlocks(blocks: Block[]): Block[] {
  const firstH2 = blocks.findIndex((b) => b.type === 'heading' && b.level === 2);
  if (firstH2 === -1) return blocks.filter((b) => b.type !== 'heading' || b.level !== 2);
  return blocks.slice(0, firstH2);
}

/** True when the renderer should use the collapsible long-form layout. */
export function isLongDescription(text: string, threshold = 350): boolean {
  return text.length > threshold;
}

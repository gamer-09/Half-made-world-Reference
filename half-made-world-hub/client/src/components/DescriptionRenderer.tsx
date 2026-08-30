import { useState, useCallback, useMemo } from 'react';

/**
 * Parses a raw description into structured, readable blocks.
 * Works for ALL entries — short or long, with or without ## sections.
 *
 * Supports:
 *   ## HEADER
 *   --- (divider)
 *   **bold text**
 *   *italic text*
 *   - bullet items
 *   1. numbered items
 *   Auto-chunking: long paragraphs are split into collapsible sentence groups.
 */
type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'divider' }
  | { type: 'paragraph'; html: string; raw: string }
  | { type: 'list'; items: string[]; ordered: boolean };

function parseInline(text: string): string {
  let out = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  out = out.replace(/`(.+?)`/g, '<code class="desc-inline-code">$1</code>');
  return out;
}

function parseDescription(raw: string): Block[] {
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

/** Split a long paragraph string into sentence chunks of ~maxLen chars */
function chunkSentences(text: string, maxLen: number = 250): string[] {
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

/** Find logical sections — split on ## headings */
function findSections(blocks: Block[]): { heading: string; body: Block[] }[] {
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

interface DescriptionRendererProps {
  text: string;
}

export function DescriptionRenderer({ text }: DescriptionRendererProps) {
  const blocks = useMemo(() => parseDescription(text), [text]);
  const sections = useMemo(() => findSections(blocks), [blocks]);
  const hasSections = sections.length > 0;

  const isLong = text.length > 350;
  const [expanded, setExpanded] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());

  const toggleChunk = useCallback((key: string) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // If short — just render everything plainly with markdown formatting
  if (!isLong) {
    return (
      <div className="desc-rendered">
        {blocks.map((block, i) => (
          <RenderBlock key={i} block={block} />
        ))}
      </div>
    );
  }

  // Long with ## sections — use collapsible section accordions
  if (hasSections) {
    const introBlocks = blocks.filter((b, idx) => {
      if (b.type === 'heading' && b.level === 2) return false;
      // Everything before the first ## heading
      const firstH2 = blocks.findIndex((x) => x.type === 'heading' && x.level === 2);
      return idx < firstH2;
    });

    return (
      <div className="desc-rendered desc-long">
        {introBlocks.length > 0 && (
          <div className="desc-intro">
            {introBlocks.map((block, i) => (
              <RenderBlock key={i} block={block} />
            ))}
          </div>
        )}

        <div className="desc-sections">
          {sections.map((section, idx) => {
            const key = `section-${idx}`;
            const isOpen = expanded || expandedChunks.has(key);
            return (
              <div key={idx} className={`desc-section${isOpen ? ' open' : ''}`}>
                <button
                  className="desc-section-toggle"
                  onClick={() => toggleChunk(key)}
                  aria-expanded={isOpen}
                >
                  <span className="desc-section-chevron">▾</span>
                  <span className="desc-section-title">{section.heading}</span>
                </button>
                {isOpen && (
                  <div className="desc-section-body">
                    {section.body.map((block, bi) => (
                      <RenderBlock key={bi} block={block} />
                    ))}
                  </div>
                )}
                {!isOpen && (
                  <p className="desc-section-preview">
                    {section.body
                      .filter((b) => b.type === 'paragraph')
                      .map((b) => b.raw)
                      .join(' ')
                      .slice(0, 140)}…
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button className="desc-expand-btn" onClick={() => setExpanded((p) => !p)}>
          {expanded ? '▾ Collapse all' : '▸ Expand all sections'}
        </button>
      </div>
    );
  }

  // Long WITHOUT sections — auto-chunk paragraphs into collapsible groups
  const allParagraphs = blocks.filter((b) => b.type === 'paragraph');
  const nonParagraphs = blocks.filter((b) => b.type !== 'paragraph');
  const joined = allParagraphs.map((b) => b.raw).join(' ');
  const chunks = chunkSentences(joined, 280);

  return (
    <div className="desc-rendered desc-long">
      {/* Show non-paragraph blocks (dividers, lists) */}
      {nonParagraphs.length > 0 && (
        <div className="desc-intro">
          {nonParagraphs.map((block, i) => (
            <RenderBlock key={i} block={block} />
          ))}
        </div>
      )}

      {/* Show first chunk expanded */}
      {chunks.length > 0 && (
        <div className="desc-chunks">
          {chunks.map((chunk, idx) => {
            const key = `chunk-${idx}`;
            const isExpanded = expanded || expandedChunks.has(key);
            const isLast = idx === chunks.length - 1;
            const isHidden = !isExpanded && idx > 0;

            if (isHidden && !isLast) return null;

            // First chunk or expanded — show content
            if (idx === 0 || isExpanded) {
              return (
                <div key={idx} className="desc-chunk">
                  <p
                    className="desc-para"
                    dangerouslySetInnerHTML={{ __html: parseInline(chunk) }}
                  />
                  {!expanded && chunks.length > 1 && idx === 0 && (
                    <button className="desc-expand-more" onClick={() => toggleChunk(key)}>
                      ▸ Continue reading…
                    </button>
                  )}
                  {isExpanded && !expanded && (
                    <button className="desc-expand-more" onClick={() => setExpandedChunks((p) => { const n = new Set(p); n.delete(key); return n; })}>
                      ▾ Show less
                    </button>
                  )}
                </div>
              );
            }

            return null;
          })}

          {/* If expanded, show all remaining chunks */}
          {expanded && chunks.slice(1).map((chunk, idx) => (
            <div key={idx + 1} className="desc-chunk">
              <p
                className="desc-para"
                dangerouslySetInnerHTML={{ __html: parseInline(chunk) }}
              />
            </div>
          ))}
        </div>
      )}

      {chunks.length > 1 && (
        <button className="desc-expand-btn" onClick={() => setExpanded((p) => !p)}>
          {expanded ? '▾ Show less' : '▸ Read full description'}
        </button>
      )}
    </div>
  );
}

function RenderBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      if (block.level <= 2) {
        return <h4 className="desc-h2">{block.text}</h4>;
      }
      return <h5 className="desc-h3">{block.text}</h5>;
    case 'divider':
      return <hr className="desc-divider" />;
    case 'paragraph':
      return <p className="desc-para" dangerouslySetInnerHTML={{ __html: block.html }} />;
    case 'list':
      if (block.ordered) {
        return (
          <ol className="desc-list">
            {block.items.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
            ))}
          </ol>
        );
      }
      return (
        <ul className="desc-list">
          {block.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
          ))}
        </ul>
      );
    default:
      return null;
  }
}

import { useState, useCallback, useMemo } from 'react';
import {
  parseInline,
  parseDescription,
  chunkSentences,
  findSections,
  findIntroBlocks,
  isLongDescription,
  type Block,
} from '../descriptionParser';

interface DescriptionRendererProps {
  text: string;
}

export function DescriptionRenderer({ text }: DescriptionRendererProps) {
  const blocks = useMemo(() => parseDescription(text), [text]);
  const sections = useMemo(() => findSections(blocks), [blocks]);
  const hasSections = sections.length > 0;

  const isLong = isLongDescription(text);
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
    const introBlocks = findIntroBlocks(blocks);

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

  // Long WITHOUT sections — auto-chunk paragraphs into collapsible groups.
  // IMPORTANT: each chunk renders EXACTLY ONCE. (The old code rendered all
  // chunks in the main map and then rendered chunks.slice(1) AGAIN when
  // expanded, so every paragraph after the first appeared twice.)
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

      {chunks.length > 0 && (
        <div className="desc-chunks">
          {chunks.map((chunk, idx) => {
            // Collapsed: only the first chunk is visible.
            // Expanded (global toggle or per-chunk toggle): chunk is visible.
            const isExpanded = expanded || expandedChunks.has(`chunk-${idx}`) || idx === 0;
            if (!isExpanded) return null;

            return (
              <div key={idx} className="desc-chunk">
                <p
                  className="desc-para"
                  dangerouslySetInnerHTML={{ __html: parseInline(chunk) }}
                />
                {/* "Continue reading" sits at the end of the last visible chunk while collapsed */}
                {!expanded && idx === 0 && chunks.length > 1 && (
                  <button className="desc-expand-more" onClick={() => setExpanded(true)}>
                    ▸ Continue reading…
                  </button>
                )}
              </div>
            );
          })}
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

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { queryArchive, askAiExplore } from '../api';
import type { SearchResult, SearchMatch } from '../api';
import { categoryColor } from '../theme';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  results?: SearchResult;
}

interface QueryChatRoomProps {
  onOpenEntry?: (name: string) => void;
  entryNames?: string[];
}

// Reduce a natural-language question to a short readable term for narration
// (e.g. "Who is Ordium?" -> "ordium"). The server does the real matching;
// this is only used to word the answer text.
function extractQuery(question: string): string {
  let q = question.trim().toLowerCase();

  // Remove a leading question word.
  q = q.replace(/^(who|what|where|when|why|how|is|are|was|were|does|do|did|can|could|would|should|may|might|shall|will|tell me about|what is|who is|where is|when did|why did|how did|does|do|did|can|could|would)\b/i, '');

  // Remove punctuation.
  q = q.replace(/[?!,;:'\"()]/g, '');

  // Remove common stop words so the remaining tokens can match.
  q = q.replace(/\b(the|a|an|of|in|on|to|for|with|and|or|that|this|it|i|me|my|we|you|your|he|she|they|its|his|her|their|be|been|being|have|has|had|from|by|at|as|if|into|not)\b/gi, '');

  // Collapse whitespace and trim.
  q = q.replace(/\s+/g, ' ').trim();

  // If we're left with nothing, fall back to the original.
  return q || question.trim();
}

function firstMatchDescription(match: SearchMatch): string {
  if (match.description) return match.description;
  for (const hit of match.matchIn) {
    if (hit.field === 'description' && hit.snippet) return hit.snippet;
  }
  return '';
}

function excerpt(text: string, maxLen = 240): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const last = cut.lastIndexOf('.');
  if (last > 60) return cut.slice(0, last + 1);
  return cut.replace(/\s\S*$/, '') + '…';
}

// Mirrors the server's stem() so queried plurals match entry-name words.
function stemWord(w: string): string {
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('sses')) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

// True when the entry name IS the searched term ("Ordium"), or every
// significant word of the name was searched ("The Umbrage Forest").
function nameMatches(name: string, kwSet: Set<string>, display: string): boolean {
  const n = name.toLowerCase();
  if (n === display.toLowerCase() || kwSet.has(n)) return true;
  const words = n
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !['the', 'and', 'for', 'with', 'of', 'in', 'on', 'to'].includes(w));
  if (words.length < 2) return false;
  return words.every((w) => kwSet.has(w) || kwSet.has(stemWord(w)));
}

// Build the answer from the search results directly — Query mode never
// depends on the AI.
function assistantText(result: SearchResult, originalQuestion: string): string {
  const display = extractQuery(originalQuestion);
  const kwSet = new Set((result.keywords || []).map((s) => s.toLowerCase()));
  const entries = result.entries;
  const rels = result.relationships;
  const links = result.storyLinks;
  const total = entries.length + rels.length + links.length;

  if (total === 0) {
    return `Nothing in the archive matches "${display}". Try a character or place name (for example "Ordium" or "Umbrage Forest") or fewer words — or switch to Explore mode and ask in natural language.`;
  }

  // --- Exact (or near-exact) name hit → lead with the matching entry ---
  const nameMatch = entries.find((e) => e.name && nameMatches(e.name, kwSet, display));
  if (nameMatch) {
    const desc = firstMatchDescription(nameMatch);
    const summary = desc ? excerpt(desc, 320) : `No description written yet for ${nameMatch.name}.`;
    const parts: string[] = [`**${nameMatch.name}** is in the **${nameMatch.category}** category. ${summary}`];
    const extra = buildExtra(nameMatch, display);
    if (extra) parts.push(extra);
    const involving = [...rels, ...links].filter(
      (r) => r.source === nameMatch.name || r.target === nameMatch.name,
    );
    if (involving.length) {
      parts.push(`Matches involving ${nameMatch.name}:`);
      for (const r of involving.slice(0, 5)) {
        parts.push(`- ${r.source} ${r.label ? `(${r.label}) ` : ''}${r.type} ${r.target}.`);
      }
      if (involving.length > 5) parts.push(`- …and ${involving.length - 5} more.`);
    }
    const others = entries.filter((e) => e !== nameMatch);
    if (others.length) {
      const shown = others.slice(0, 4).map((e) => e.name);
      parts.push(`Other matching entries: ${shown.join(', ')}${others.length > 4 ? ', …' : ''}`);
    }
    return parts.join('\n');
  }

  // --- No exact name hit → narrate what matched, best first ---
  const totals = result.totals;
  const parts: string[] = [];
  if (entries.length > 0) {
    const t = totals?.entries ?? entries.length;
    const note = t > entries.length ? ` — showing the top ${entries.length}` : '';
    parts.push(`${t} ${t === 1 ? 'entry matches' : 'entries match'} "${display}"${note}:`);
    for (const e of entries.slice(0, 5)) {
      const d = firstMatchDescription(e);
      parts.push(`- **${e.name}**${d ? ` — ${excerpt(d, 160)}` : ''}`);
    }
    if (entries.length > 5) {
      parts.push(
        t > entries.length
          ? `…and ${t - 5} more in total.`
          : `…and ${entries.length - 5} more — see the full matches below.`,
      );
    }
  }
  if (rels.length > 0) {
    const t = totals?.relationships ?? rels.length;
    const note = t > rels.length ? ` — showing the top ${rels.length}` : '';
    parts.push(`${t} relationship${t === 1 ? '' : 's'}${note}:`);
    for (const r of rels.slice(0, 4)) {
      parts.push(`- ${r.source} ${r.label ? `(${r.label}) ` : ''}${r.type} ${r.target}.`);
    }
    if (rels.length > 4) {
      parts.push(t > rels.length ? `- …and ${t - 4} more in total.` : `- …and ${rels.length - 4} more below.`);
    }
  }
  if (links.length > 0) {
    const t = totals?.storyLinks ?? links.length;
    const note = t > links.length ? ` — showing the top ${links.length}` : '';
    parts.push(`${t} story link${t === 1 ? '' : 's'}${note}:`);
    for (const l of links.slice(0, 4)) {
      parts.push(`- ${l.source} ${l.label ? `(${l.label}) ` : ''}${l.type} ${l.target}.`);
    }
    if (links.length > 4) {
      parts.push(t > links.length ? `- …and ${t - 4} more in total.` : `- …and ${links.length - 4} more below.`);
    }
  }
  return parts.join('\n');
}

function buildExtra(entry: SearchMatch, q: string): string {
  const extras: string[] = [];
  if (entry.subtitle) extras.push(`Subtitle: ${entry.subtitle}`);
  const tagHits = entry.tags?.filter((t) => t.toLowerCase().includes(q.toLowerCase()));
  if (tagHits && tagHits.length) extras.push(`Tagged: ${tagHits.join(', ')}`);
  const fieldHits = entry.fields?.filter(
    (f) => !f.label.toLowerCase().includes(q.toLowerCase()) && !f.value.toLowerCase().includes(q.toLowerCase()),
  );
  if (fieldHits && fieldHits.length) {
    const shown = fieldHits.slice(0, 3);
    extras.push(`Other fields: ${shown.map((f) => `${f.label} — ${f.value}`).join('; ')}`);
  }
  return extras.length ? ` ${extras.join(' ')}` : '';
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- GFM table helpers -----------------------------------------------------

// Split a table row into trimmed cells, tolerating optional leading/trailing
// border pipes ("| a | b |" and "a | b" both parse the same).
function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

// The "|---|:--:|--:|" separator that makes a table a table (not just a
// paragraph that happens to contain a pipe).
function isTableDelimiterRow(line: string): boolean {
  if (!line.includes('|') || !line.includes('-')) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
}

type ColAlign = 'left' | 'center' | 'right' | undefined;
function tableAlignments(delimiter: string): ColAlign[] {
  return splitTableRow(delimiter).map((c) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return undefined;
  });
}

// Wrap known entry names in a clickable link so the reader can jump to the
// source entry. Longest names first so nested names match greedily.
function renderNames(
  text: string,
  onOpenEntry: ((name: string) => void) | undefined,
  nameRe: RegExp | null,
): React.ReactNode[] {
  if (!nameRe || !onOpenEntry || !text) return [text];
  const parts = text.split(nameRe);
  return parts.map((part, i) =>
    i % 2 === 1 && part ? (
      <button type="button" key={`n${i}`} className="chat-inline-link" onClick={() => onOpenEntry(part)}>
        {part}
      </button>
    ) : (
      part
    ),
  );
}

// Inline markdown: **bold**, *italic* / _italic_, `code`, plus entry-name links.
function renderInline(
  text: string,
  onOpenEntry: ((name: string) => void) | undefined,
  nameRe: RegExp | null,
): React.ReactNode[] {
  // Models sometimes emit <br> inside table cells for line breaks; honour it
  // instead of printing the tag. Split on it and join with real breaks.
  const segments = text.split(/<br\s*\/?>/gi);
  if (segments.length === 1) return renderInlineMd(text, onOpenEntry, nameRe);
  const out: React.ReactNode[] = [];
  segments.forEach((seg, i) => {
    if (i > 0) out.push(<br key={`br${i}`} />);
    out.push(...renderInlineMd(seg, onOpenEntry, nameRe));
  });
  return out;
}

function renderInlineMd(
  text: string,
  onOpenEntry: ((name: string) => void) | undefined,
  nameRe: RegExp | null,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const mdRe = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let idx = 0;
  let m: RegExpExecArray | null;
  while ((m = mdRe.exec(text)) !== null) {
    if (m.index > last) out.push(...renderNames(text.slice(last, m.index), onOpenEntry, nameRe));
    const tok = m[0];
    if (tok.startsWith('**')) {
      out.push(<strong key={idx++}>{renderNames(tok.slice(2, -2), onOpenEntry, nameRe)}</strong>);
    } else if (tok.startsWith('`')) {
      out.push(
        <code key={idx++} className="chat-md-code">
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      out.push(<em key={idx++}>{renderNames(tok.slice(1, -1), onOpenEntry, nameRe)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(...renderNames(text.slice(last), onOpenEntry, nameRe));
  return out;
}

// Block-level markdown: headings, bullet/numbered lists, tables, paragraphs.
export function Markdown({
  text,
  onOpenEntry,
  nameRe,
}: {
  text: string;
  onOpenEntry?: (name: string) => void;
  nameRe: RegExp | null;
}) {
  const nodes: React.ReactNode[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let key = 0;
  let i = 0;
  const isListItem = (l: string) => /^\s*([-*]|\d+[.)])\s+/.test(l);
  const isHeading = (l: string) => /^#{1,6}\s+/.test(l);
  // A GFM table is a row line immediately followed by a |---| delimiter row.
  const startsTable = (idx: number) =>
    lines[idx].includes('|') && idx + 1 < lines.length && isTableDelimiterRow(lines[idx + 1]);

  while (i < lines.length) {
    const line = lines[i];

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(h[1].length + 2, 6);
      const Tag = `h${level}` as React.ElementType;
      nodes.push(
        <Tag key={key++} className="chat-md-h">
          {renderInline(h[2], onOpenEntry, nameRe)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={key++} className="chat-md-list">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, onOpenEntry, nameRe)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i++;
      }
      nodes.push(
        <ol key={key++} className="chat-md-list">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, onOpenEntry, nameRe)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (startsTable(i)) {
      const header = splitTableRow(line);
      const aligns = tableAlignments(lines[i + 1]);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      const alignStyle = (ci: number): React.CSSProperties =>
        aligns[ci] ? { textAlign: aligns[ci] } : {};
      nodes.push(
        <div key={key++} className="chat-md-table-wrap">
          <table className="chat-md-table">
            <thead>
              <tr>
                {header.map((cell, ci) => (
                  <th key={ci} style={alignStyle(ci)}>
                    {renderInline(cell, onOpenEntry, nameRe)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {header.map((_, ci) => (
                    <td key={ci} style={alignStyle(ci)}>
                      {renderInline(row[ci] ?? '', onOpenEntry, nameRe)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !isListItem(lines[i]) &&
      !isHeading(lines[i]) &&
      !startsTable(i)
    ) {
      para.push(lines[i]);
      i++;
    }
    nodes.push(
      <p key={key++} className="chat-md-p">
        {renderInline(para.join(' '), onOpenEntry, nameRe)}
      </p>,
    );
  }

  return <div className="chat-md">{nodes}</div>;
}

export function QueryChatRoom({ onOpenEntry, entryNames = [] }: QueryChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'query' | 'explore'>('query');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const nameRe = useMemo(() => {
    const names = [...new Set(entryNames.filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!names.length) return null;
    try {
      return new RegExp('(?<![A-Za-z0-9])(' + names.map(escapeRe).join('|') + ')(?![A-Za-z0-9])', 'gi');
    } catch {
      return null;
    }
  }, [entryNames]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError('');
    const userMsg: ChatMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      let answer: string;
      let results: SearchResult | undefined;

      if (mode === 'explore') {
        // Explore mode: the AI searches the whole archive on its own.
        try {
          const ai = await askAiExplore(text);
          answer = ai.answer;
        } catch (aiErr) {
          const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
          const preface =
            msg.includes('not configured') || msg.includes('GROQ_API_KEY')
              ? "The AI isn't configured yet — add your GROQ_API_KEY to the server's .env file. Here's what the archive found on its own:"
              : `The AI ran into an issue (${msg}). Here's what the archive found on its own:`;
          // Fall back to the plain keyword lookup so the question still gets
          // an answer built from archive data.
          try {
            const searchResult = await queryArchive(text);
            results = searchResult;
            answer = `${preface}\n\n${assistantText(searchResult, text)}`;
          } catch {
            answer = preface;
          }
        }
      } else {
        // Query mode: a direct keyword lookup over the archive — no AI involved.
        const searchResult = await queryArchive(text);
        results = searchResult;
        answer = assistantText(searchResult, text);
      }

      const assistant: ChatMessage = { role: 'assistant', text: answer, results };
      setMessages((prev) => [...prev, assistant]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Something went wrong while searching the archive.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const clear = useCallback(() => {
    setMessages([]);
    setError('');
    setInput('');
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-room">
      <header className="chat-header">
        <div className="chat-header-row">
          <h2 className="chat-title">Query the Archive</h2>
          <div className="chat-header-actions">
            <div className="chat-mode-toggle">
              <button
                className={`mode-btn${mode === 'query' ? ' active' : ''}`}
                onClick={() => setMode('query')}
                title="Search the archive directly — keyword lookup, no AI involved"
              >
                Query
              </button>
              <button
                className={`mode-btn${mode === 'explore' ? ' active' : ''}`}
                onClick={() => setMode('explore')}
                title="Give the AI the full archive and let it find answers on its own"
              >
                Explore
              </button>
            </div>
            <button
              className="chat-clear-btn"
              onClick={clear}
              disabled={!messages.length && !error}
              title="Clear the conversation"
            >
              Clear
            </button>
          </div>
        </div>
        <p className="chat-sub">
          {mode === 'query'
            ? 'Search the archive directly — a keyword lookup over everything written in it, no AI involved. The archive only knows what has been put into it.'
            : 'The AI reads the entire archive and finds answers on its own — great for vague questions like "who is the mc".'}
        </p>
      </header>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Try asking things like:</p>
            <ul className="chat-suggestions">
              {mode === 'query' ? (
                <>
                  <li>Who is Ordium?</li>
                  <li>What lives in the Umbrage Forest?</li>
                  <li>What is the Sentient River?</li>
                  <li>Who betrayed Lisa?</li>
                  <li>Where is Vireth sealed?</li>
                </>
              ) : (
                <>
                  <li>Who is the mc?</li>
                  <li>Who are the main characters?</li>
                  <li>What is the world about?</li>
                  <li>Tell me about the Healers</li>
                  <li>What conflicts exist in the world?</li>
                </>
              )}
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg--${m.role}`}>
            <div className="chat-msg-bubble">
              {m.role === 'assistant' ? (
                <Markdown text={m.text} onOpenEntry={onOpenEntry} nameRe={nameRe} />
              ) : (
                <p className="chat-msg-text">{m.text}</p>
              )}
              {m.role === 'assistant' && m.results && (
                <ChatResultList results={m.results} mode={mode} onOpenEntry={onOpenEntry} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg chat-msg--assistant">
            <div className="chat-msg-bubble">
              <p className="chat-msg-text">
                <span className="typing-dots" aria-label="Thinking">
                  <span></span><span></span><span></span>
                </span>
                Reading through the archive…
              </p>
            </div>
          </div>
        )}

        {error && <div className="chat-error">{error}</div>}
      </div>

      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ask about the world…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>
          {loading ? '…' : 'Ask'}
        </button>
      </div>
    </div>
  );
}

// --- Results display ---

function ChatResultList({
  results,
  mode,
  onOpenEntry,
}: {
  results: SearchResult;
  mode: 'query' | 'explore';
  onOpenEntry?: (name: string) => void;
}) {
  if (mode === 'explore') {
    // Explore mode: the AI answer already cites specific entries and
    // relationships in its text. Show a compact "mentioned in the answer"
    // list of entries rather than a scattered flat list of all matches.
    const matchedNames = results.entries
      .filter((e) => e.name && results.entries.length > 0)
      // We can't easily parse the AI text for names, so show the top
      // entries that were likely referenced — sort by how connected they are.
      .slice(0, 10);

    if (matchedNames.length === 0) return null;

    return (
      <div className="chat-results">
        <div className="chat-result-group">
          <div className="chat-result-group-head">
            <span className="chip" style={{ color: '#c8a876', borderColor: '#c8a87655', background: '#c8a87614' }}>
              Archive matches ({matchedNames.length})
            </span>
          </div>
          <div className="chat-result-items">
            {matchedNames.map((e) => (
              <ChatResultItem key={e.id} match={e} color={categoryColor(e.category || '')} onOpenEntry={onOpenEntry} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Query mode: split entries into "key" (those that appear in relationships
  // or story links) and "other", so the most relevant ones surface first.
  const relSourceTargets = new Set([
    ...results.relationships.map((r) => r.source),
    ...results.relationships.map((r) => r.target),
  ]);
  const linkSourceTargets = new Set([
    ...results.storyLinks.map((l) => l.source),
    ...results.storyLinks.map((l) => l.target),
  ]);
  const connectedNames = new Set([...relSourceTargets, ...linkSourceTargets]);

  const keyEntries = results.entries.filter((e) => connectedNames.has(e.name));
  const otherEntries = results.entries.filter((e) => !connectedNames.has(e.name));

  if (!results.entries.length && !results.relationships.length && !results.storyLinks.length) return null;

  return (
    <div className="chat-results">
      {keyEntries.length > 0 && (
        <div className="chat-result-group">
          <div className="chat-result-group-head">
            <span className="chip" style={{ color: '#c8a876', borderColor: '#c8a87655', background: '#c8a87614' }}>
              Key entries ({keyEntries.length})
            </span>
          </div>
          <div className="chat-result-items">
            {keyEntries.map((e) => (
              <ChatResultItem key={e.id} match={e} color={categoryColor(e.category || '')} onOpenEntry={onOpenEntry} />
            ))}
          </div>
        </div>
      )}
      {otherEntries.length > 0 && (
        <div className="chat-result-group">
          <div className="chat-result-group-head">
            <span className="chip" style={{ color: '#7f8fa3', borderColor: '#7f8fa355', background: '#7f8fa314' }}>
              Other entries ({otherEntries.length})
            </span>
          </div>
          <div className="chat-result-items">
            {otherEntries.map((e) => (
              <ChatResultItem key={e.id} match={e} color={categoryColor(e.category || '')} onOpenEntry={onOpenEntry} />
            ))}
          </div>
        </div>
      )}
      {results.relationships.length > 0 && (
        <div className="chat-result-group">
          <div className="chat-result-group-head">
            <span className="chip" style={{ color: '#c25e4a', borderColor: '#c25e4a55', background: '#c25e4a14' }}>
              Relationships ({results.relationships.length})
            </span>
          </div>
          <div className="chat-result-items">
            {results.relationships.map((r) => (
              <RelationshipItem key={r.id} rel={r} onOpenEntry={onOpenEntry} />
            ))}
          </div>
        </div>
      )}
      {results.storyLinks.length > 0 && (
        <div className="chat-result-group">
          <div className="chat-result-group-head">
            <span className="chip" style={{ color: '#5a8f7c', borderColor: '#5a8f7c55', background: '#5a8f7c14' }}>
              Story links ({results.storyLinks.length})
            </span>
          </div>
          <div className="chat-result-items">
            {results.storyLinks.map((l) => (
              <StoryLinkItem key={l.id} link={l} onOpenEntry={onOpenEntry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatResultItem({
  match,
  color,
  onOpenEntry,
}: {
  match: SearchMatch;
  color: string;
  onOpenEntry?: (name: string) => void;
}) {
  const accent = match.category ? categoryColor(match.category) : color;
  const clickable = !!onOpenEntry && !!match.name;
  // One short summary instead of the whole entry: the description (excerpted),
  // falling back to the matched description snippet or the subtitle.
  const summary = excerpt(firstMatchDescription(match) || match.subtitle || '', 200);

  return (
    <div
      className={`chat-result-item${clickable ? ' chat-result-item--link' : ''}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onOpenEntry!(match.name!) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenEntry!(match.name!);
              }
            }
          : undefined
      }
    >
      <div className="chat-result-item-head">
        {match.category && (
          <span className="chip" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}14` }}>
            {match.category}
          </span>
        )}
        {match.name && <NameLink name={match.name} color={accent} onOpenEntry={onOpenEntry} />}
        {match.createdAt && <span className="chat-result-date">{formatDate(match.createdAt)}</span>}
        {clickable && <span className="chat-result-open">Open ↗</span>}
      </div>

      {summary && <p className="chat-rel-desc">{summary}</p>}
    </div>
  );
}

function NameLink({
  name,
  color,
  onOpenEntry,
}: {
  name: string;
  color: string;
  onOpenEntry?: (n: string) => void;
}) {
  if (!onOpenEntry) {
    return (
      <span className="chat-result-name" style={{ color }}>
        {name}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="chat-result-name chat-result-name--link"
      style={{ color }}
      onClick={() => onOpenEntry(name)}
    >
      {name}
    </button>
  );
}

function RelationshipItem({ rel, onOpenEntry }: { rel: SearchMatch; onOpenEntry?: (n: string) => void }) {
  const color = categoryColor('Characters');
  return (
    <div className="chat-result-item relationship">
      <div className="chat-result-item-head">
        {rel.source && <NameLink name={rel.source} color={color} onOpenEntry={onOpenEntry} />}
        {rel.label && (
          <span className="chat-rel-label">{rel.label}</span>
        )}
        {rel.type && (
          <span className="chip" style={{ color: '#c25e4a', borderColor: '#c25e4a55', background: '#c25e4a14' }}>
            {rel.type}
          </span>
        )}
        {rel.target && <NameLink name={rel.target} color={color} onOpenEntry={onOpenEntry} />}
        {rel.createdAt && <span className="chat-result-date">{formatDate(rel.createdAt)}</span>}
      </div>
      {rel.description && (
        <p className="chat-rel-desc">{rel.description}</p>
      )}
    </div>
  );
}

function StoryLinkItem({ link, onOpenEntry }: { link: SearchMatch; onOpenEntry?: (n: string) => void }) {
  const color = categoryColor('Characters');
  return (
    <div className="chat-result-item story-link">
      <div className="chat-result-item-head">
        {link.source && <NameLink name={link.source} color={color} onOpenEntry={onOpenEntry} />}
        {link.label && (
          <span className="chat-rel-label">{link.label}</span>
        )}
        {link.type && (
          <span className="chip" style={{ color: '#5a8f7c', borderColor: '#5a8f7c55', background: '#5a8f7c14' }}>
            {link.type}
          </span>
        )}
        {link.target && <NameLink name={link.target} color={color} onOpenEntry={onOpenEntry} />}
        {link.createdAt && <span className="chat-result-date">{formatDate(link.createdAt)}</span>}
      </div>
      {link.description && (
        <p className="chat-rel-desc">{link.description}</p>
      )}
    </div>
  );
}

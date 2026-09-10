import { useState, useCallback, useEffect, useRef } from 'react';
import { queryArchive, askAi } from '../api';
import type { SearchResult, SearchMatch } from '../api';
import { categoryColor } from '../theme';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  results?: SearchResult;
}

// Reduce a natural-language question to a search term that actually
// matches the archive. Strips question words, articles, and common
// stop words so "Who is Ordium?" becomes "Ordium".
function extractQuery(question: string): string {
  let q = question.trim().toLowerCase();

  // Remove a leading question word.
  q = q.replace(/^(who|what|where|when|why|how|is|are|was|were|does|do|did|can|could|would|should|may|might|shall|will|tell me about|what is|who is|where is|when did|why did|how did|does|do|did|can|could|would)/i, '');

  // Remove punctuation.
  q = q.replace(/[?!,;:'"()]/g, '');

  // Remove common stop words so the remaining tokens can match.
  q = q.replace(/\b(the|a|an|of|in|on|to|for|with|and|or|that|this|it|i|me|my|we|you|your|he|she|they|its|his|her|their|be|been|being|have|has|had|from|by|at|as|if|into|not)/gi, '');

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

function assistantText(result: SearchResult, originalQuestion: string): string {
  const q = result.query;
  const entries = result.entries;
  const rels = result.relationships;
  const links = result.storyLinks;
  const total = entries.length + rels.length + links.length;

  if (total === 0) {
    return `I don't have anything in the archive that answers “${originalQuestion}”. Nothing written in the archive matches that.`;
  }

  // --- Name-like query → lead with the matching entry ---
  const nameMatch = entries.find(
    (e) => e.name && e.name.toLowerCase() === q.toLowerCase(),
  );
  if (nameMatch) {
    const desc = firstMatchDescription(nameMatch);
    const summary = desc ? excerpt(desc) : `No description written yet for ${nameMatch.name}.`;
    const cat = nameMatch.category;
    const parts: string[] = [`${nameMatch.name} is in the **${cat}** category. ${summary}`];
    const extra = buildExtra(nameMatch, q);
    if (extra) parts.push(extra);
    return parts.join(' ');
  }

  // --- "who X" / relationship-style query ---
  const whoQuery = /(who|what|where|when|why|how)\b/i.test(q);
  if (whoQuery && (rels.length > 0 || links.length > 0)) {
    const sentences: string[] = [];
    if (rels.length > 0) {
      sentences.push(`I found ${rels.length} relationship${rels.length === 1 ? '' : 's'} that involve ${q}:`);
      for (const r of rels.slice(0, 4)) {
        sentences.push(`- ${r.source} ${r.label ? `(${r.label}) ` : ''}${r.type} ${r.target}.`);
      }
      if (rels.length > 4) sentences.push(`- …and ${rels.length - 4} more relationship${rels.length - 4 === 1 ? '' : 's'}.`);
    }
    if (links.length > 0) {
      sentences.push(`I also found ${links.length} story link${links.length === 1 ? '' : 's'}:`);
      for (const l of links.slice(0, 4)) {
        sentences.push(`- ${l.source} ${l.label ? `(${l.label}) ` : ''}${l.type} ${l.target}.`);
      }
      if (links.length > 4) sentences.push(`- …and ${links.length - 4} more story link${links.length - 4 === 1 ? '' : 's'}.`);
    }
    if (entries.length > 0) {
      const entryNames = entries.map((e) => e.name).join(', ');
      sentences.push(`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} also mention “${q}”: ${entryNames}.`);
    }
    return sentences.join('\n');
  }

  // --- General search: narrate what was found ---
  const parts: string[] = [];
  if (entries.length > 0) {
    const names = entries.map((e) => e.name).join(', ');
    parts.push(`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} mention “${q}”: ${names}.`);
    const withDesc = entries.find((e) => firstMatchDescription(e));
    if (withDesc) {
      parts.push(`On ${withDesc.name}, the archive says: ${excerpt(firstMatchDescription(withDesc), 300)}.`);
    }
  }
  if (rels.length > 0) {
    const sample = rels.slice(0, 3);
    parts.push(`${rels.length} relationship${rels.length === 1 ? '' : 's'} reference “${q}”. ${sample.map((r) => `${r.source} ${r.type} ${r.target}.`).join(' ')}`);
    if (rels.length > 3) parts.push(`…and ${rels.length - 3} more.`);
  }
  if (links.length > 0) {
    const sample = links.slice(0, 3);
    parts.push(`${links.length} story link${links.length === 1 ? '' : 's'}: ${sample.map((l) => `${l.source} ${l.type} ${l.target}.`).join(' ')}`);
    if (links.length > 3) parts.push(`…and ${links.length - 3} more.`);
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

export function QueryChatRoom() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError('');
    const userMsg: ChatMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const query = extractQuery(text);
      const searchResult = await queryArchive(query);
      let answer: string;
      const hasData = searchResult.entries.length || searchResult.relationships.length || searchResult.storyLinks.length;
      if (!hasData) {
        answer = `I don't have anything in the archive that answers “${text}”. Nothing written in the archive matches that.`;
      } else {
        try {
          const ai = await askAi(text, searchResult);
          answer = ai.answer;
        } catch (aiErr) {
          const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
          if (msg.includes('not configured') || msg.includes('GROQ_API_KEY')) {
            answer = `The AI isn't configured yet — add your GROQ_API_KEY to the server's .env file. In the meantime, here's what the archive says:`;
          } else {
            answer = `The AI ran into an issue, so here's what the archive says instead:`;
          }
          answer += '\n\n' + assistantText(searchResult, text);
        }
      }
      const assistant: ChatMessage = { role: 'assistant', text: answer, results: searchResult };
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-room">
      <header className="chat-header">
        <h2 className="chat-title">Query the Archive</h2>
        <p className="chat-sub">Ask questions about anything written in the world. The archive only knows what's been put into it.</p>
      </header>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Try asking things like:</p>
            <ul className="chat-suggestions">
              <li>Who is Ordium?</li>
              <li>What lives in the Umbrage Forest?</li>
              <li>What is the Sentient River?</li>
              <li>Who betrayed Lisa?</li>
              <li>Where is Vireth sealed?</li>
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg--${m.role}`}>
            <div className="chat-msg-bubble">
              <p className="chat-msg-text">{m.text}</p>
              {m.role === 'assistant' && m.results && (
                <ChatResultList results={m.results} />
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

function ChatResultList({ results }: { results: SearchResult }) {
  const { entries, relationships, storyLinks } = results;
  if (!entries.length && !relationships.length && !storyLinks.length) return null;

  return (
    <div className="chat-results">
      {entries.length > 0 && <ChatResultGroup label="Entries" color="#7f8fa3" matches={entries} />}
      {relationships.length > 0 && <ChatResultGroup label="Relationships" color="#c25e4a" matches={relationships} />}
      {storyLinks.length > 0 && <ChatResultGroup label="Story Links" color="#5a8f7c" matches={storyLinks} />}
    </div>
  );
}

function ChatResultGroup({ label, color, matches }: { label: string; color: string; matches: SearchMatch[] }) {
  return (
    <div className="chat-result-group">
      <div className="chat-result-group-head">
        <span className="chip" style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
          {label} <span className="conn-count">{matches.length}</span>
        </span>
      </div>
      <div className="chat-result-items">
        {matches.map((m) => (
          <ChatResultItem key={m.id} match={m} color={color} />
        ))}
      </div>
    </div>
  );
}

function ChatResultItem({ match, color }: { match: SearchMatch; color: string }) {
  const accent = match.category ? categoryColor(match.category) : color;

  return (
    <div className="chat-result-item">
      <div className="chat-result-item-head">
        {match.category && (
          <span className="chip" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}14` }}>
            {match.category}
          </span>
        )}
        {match.name && (
          <span className="chat-result-name" style={{ color: accent }}>
            {match.name}
          </span>
        )}
        {match.source && (
          <span className="chat-result-link">
            {match.source} → {match.target}
          </span>
        )}
        {match.createdAt && <span className="chat-result-date">{formatDate(match.createdAt)}</span>}
      </div>

      {match.matchIn.length > 0 && (
        <ul className="chat-match-list">
          {match.matchIn.map((hit, i) => (
            <li key={i} className="chat-match">
              <span className="chat-match-field">{hit.field}</span>
              <span className="chat-match-snippet">{hit.snippet}</span>
            </li>
          ))}
        </ul>
      )}

      {match.fields && match.fields.length > 0 && (
        <dl className="chat-fields">
          {match.fields.map((f, i) => (
            <div className="chat-field" key={i}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {match.tags && match.tags.length > 0 && (
        <div className="chat-tags">
          {match.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

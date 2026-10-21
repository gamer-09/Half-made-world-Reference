import { useCallback, useRef, useState } from 'react';
import { findFlavor, AiRateLimitError } from '../api';
import type { FlavorMode, FlavorResult } from '../api';
import { formatCountdown } from './QueryChatRoom';

const EXAMPLES = [
  'walked slowly',
  'a cold room',
  'she was angry',
  'the sword cut the air',
  'raining hard',
  'he laughed',
  'the forest at night',
];

export function FlavorFinder() {
  const [mode, setMode] = useState<FlavorMode>('descriptors');
  const [subject, setSubject] = useState('');
  const [result, setResult] = useState<FlavorResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [limitInfo, setLimitInfo] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const startCountdown = useCallback((seconds: number) => {
    setLimitInfo(seconds);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setLimitInfo((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const run = useCallback(
    async (text: string, runMode: FlavorMode) => {
      const clean = text.trim();
      if (!clean || busy) return;
      setBusy(true);
      setError('');
      setResult(null);
      setCopied('');
      try {
        const data = await findFlavor(clean, runMode);
        setResult(data);
      } catch (err) {
        if (err instanceof AiRateLimitError) {
          setError(err.message);
          startCountdown(err.retryAfterSeconds);
        } else {
          setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, startCountdown],
  );

  const copy = useCallback(async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied((c) => (c === what ? '' : c)), 1500);
    } catch {
      setCopied('');
    }
  }, []);

  const switchMode = (next: FlavorMode) => {
    if (next === mode) return;
    setMode(next);
    setError('');
    setResult(null);
    setCopied('');
  };

  const ready = limitInfo === null;

  return (
    <div className="plan-room">
      <div className="plan-header">
        <div className="plan-header-row">
          <h2 className="plan-title">
            <i className="fa-solid fa-feather-pointed" style={{ fontSize: 16, marginRight: 8, color: '#c8a876' }} />
            Flavor Finder
          </h2>
          <span className="plan-badge">dev only</span>
        </div>
        <p className="plan-sub">
          Give it a word, phrase, or action and get one‑ or two‑word descriptors a novelist would reach
          for — or paste a whole scene and get it rewritten with more flavor. Nothing is saved; this is
          a drafting aid.
        </p>
      </div>

      <div className="plan-scroll">
        <div className="chat-mode-toggle" style={{ alignSelf: 'flex-start' }}>
          <button
            className={`view-toggle-btn${mode === 'descriptors' ? ' active' : ''}`}
            onClick={() => switchMode('descriptors')}
          >
            <i className="fa-solid fa-book" style={{ fontSize: 12 }} /> Descriptors
          </button>
          <button
            className={`view-toggle-btn${mode === 'scene' ? ' active' : ''}`}
            onClick={() => switchMode('scene')}
          >
            <i className="fa-solid fa-scroll" style={{ fontSize: 12 }} /> Enrich a scene
          </button>
        </div>

        <form
          className="flavor-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(subject, mode);
          }}
        >
          <label className="flavor-label" htmlFor="flavor-input">
            {mode === 'scene' ? 'Paste your scene' : 'Word, phrase, or action'}
          </label>
          {mode === 'scene' ? (
            <textarea
              id="flavor-input"
              className="flavor-textarea"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Paste a scene or paragraph — events, dialogue and all. It comes back with the same story, more flavor."
              rows={9}
            />
          ) : (
            <input
              id="flavor-input"
              className="flavor-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. walked slowly, a cold room, she was angry"
            />
          )}

          {mode === 'descriptors' && !subject.trim() && (
            <div className="flavor-examples">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="filter-chip"
                  onClick={() => setSubject(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          <div className="flavor-actions">
            <button className="btn btn-primary" type="submit" disabled={busy || !subject.trim() || !ready}>
              {busy ? (
                <>
                  <span className="loading-orb" aria-hidden="true" /> Working…
                </>
              ) : mode === 'scene' ? (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 12 }} /> Enrich scene
                </>
              ) : (
                <>
                  <i className="fa-solid fa-feather-pointed" style={{ fontSize: 12 }} /> Find flavor words
                </>
              )}
            </button>
            {subject.trim() && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSubject('');
                  setResult(null);
                  setError('');
                  setCopied('');
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {!ready && limitInfo !== null && (
          <div className="chat-limit">
            <div className="chat-limit-text">
              <strong>The AI is busy.</strong> Next attempt in {formatCountdown(limitInfo)}.
            </div>
          </div>
        )}

        {error && <div className="chat-error">{error}</div>}

        {busy && !result && (
          <div className="loading">
            <span className="loading-orb" aria-hidden="true" />
            <p>{mode === 'scene' ? 'Rewriting your scene…' : 'Searching for the right words…'}</p>
          </div>
        )}

        {result && result.descriptors.length > 0 && (
          <section className="flavor-result">
            <div className="flavor-result-head">
              <h3 className="section-title">
                {mode === 'scene' ? 'Flavor used' : `Descriptors for “${result.subject}”`}
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => copy(result.descriptors.join(', '), 'desc')}
              >
                {copied === 'desc' ? '✓ Copied' : 'Copy all'}
              </button>
            </div>
            <div className="flavor-chips">
              {result.descriptors.map((d) => (
                <button
                  key={d}
                  className="flavor-chip"
                  onClick={() => copy(d, `chip-${d}`)}
                  title="Click to copy"
                >
                  {d}
                  {copied === `chip-${d}` && <span className="flavor-chip-check">✓</span>}
                </button>
              ))}
            </div>
            {result.note && <p className="flavor-note">{result.note}</p>}
          </section>
        )}

        {result && result.scene && (
          <section className="flavor-result">
            <div className="flavor-result-head">
              <h3 className="section-title">Enriched scene</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => copy(result.scene, 'scene')}>
                {copied === 'scene' ? '✓ Copied' : 'Copy scene'}
              </button>
            </div>
            <div className="flavor-scene">{result.scene}</div>
          </section>
        )}

        {result && !result.descriptors.length && !result.scene && (
          <div className="chat-error">The AI returned nothing usable — try rephrasing.</div>
        )}
      </div>
    </div>
  );
}

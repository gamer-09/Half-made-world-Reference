import { useCallback, useRef, useState } from 'react';
import { findFlavor, AiRateLimitError } from '../api';
import type { FlavorMode, FlavorResult } from '../api';
import { formatCountdown } from './QueryChatRoom';

const EXAMPLES: Record<FlavorMode, string[]> = {
  descriptors: [
    'walked slowly',
    'a cold room',
    'she was angry',
    'the sword cut the air',
    'raining hard',
    'he laughed',
    'the forest at night',
  ],
  scene: [],
  craft: [
    'How do I cut from the MC to another character mid-scene?',
    'Two characters talk while the MC is elsewhere — how do I come back to the MC?',
    'How do I change scenery without losing the thread?',
    'How do I end one POV and open the next without a jarring jump?',
    'How do I show a time jump without writing "hours later"?',
  ],
};

const MODE_LABELS: Record<FlavorMode, string> = {
  descriptors: 'Descriptors',
  scene: 'Enrich a scene',
  craft: 'Scene craft',
};

const MODE_INPUT_LABEL: Record<FlavorMode, string> = {
  descriptors: 'Word, phrase, or action',
  scene: 'Paste your scene',
  craft: 'What do you want help with?',
};

const MODE_BUTTON: Record<FlavorMode, { icon: string; text: string }> = {
  descriptors: { icon: 'fa-solid fa-book', text: 'Find flavor words' },
  scene: { icon: 'fa-solid fa-wand-magic-sparkles', text: 'Enrich scene' },
  craft: { icon: 'fa-solid fa-compass-drafting', text: 'Craft the scene' },
};

const LOADING_TEXT: Record<FlavorMode, string> = {
  descriptors: 'Searching for the right words…',
  scene: 'Rewriting your scene…',
  craft: 'Working out the transition…',
};

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
  const craft = mode === 'craft';
  const design = result?.design;

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
          for — paste a whole scene and get it rewritten with more flavor, or ask how to handle a POV
          change, a scenery change, or getting back to the MC. Nothing is saved; this is a drafting aid.
        </p>
      </div>

      <div className="plan-scroll">
        <div className="chat-mode-toggle" style={{ alignSelf: 'flex-start' }}>
          {(Object.keys(MODE_LABELS) as FlavorMode[]).map((m) => (
            <button
              key={m}
              className={`view-toggle-btn${mode === m ? ' active' : ''}`}
              onClick={() => switchMode(m)}
            >
              <i
                className={m === 'descriptors' ? 'fa-solid fa-book' : m === 'scene' ? 'fa-solid fa-scroll' : 'fa-solid fa-compass-drafting'}
                style={{ fontSize: 12 }}
              />{' '}
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <form
          className="flavor-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(subject, mode);
          }}
        >
          <label className="flavor-label" htmlFor="flavor-input">
            {MODE_INPUT_LABEL[mode]}
          </label>
          {mode === 'descriptors' ? (
            <input
              id="flavor-input"
              className="flavor-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. walked slowly, a cold room, she was angry"
            />
          ) : (
            <textarea
              id="flavor-input"
              className="flavor-textarea"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={
                craft
                  ? 'e.g. Two characters are talking to each other; once that scene is done we go back to the MC. How should I write that change of POV?'
                  : 'Paste a scene or paragraph — events, dialogue and all. It comes back with the same story, more flavor.'
              }
              rows={craft ? 5 : 9}
            />
          )}

          {!subject.trim() && EXAMPLES[mode].length > 0 && (
            <div className="flavor-examples">
              {EXAMPLES[mode].map((ex) => (
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
              ) : (
                <>
                  <i className={MODE_BUTTON[mode].icon} style={{ fontSize: 12 }} /> {MODE_BUTTON[mode].text}
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
            <p>{LOADING_TEXT[mode]}</p>
          </div>
        )}

        {craft && result && (result.advice || result.suggestions?.length || design) && (
          <section className="flavor-result">
            <div className="flavor-result-head">
              <h3 className="section-title">How to write it</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  copy(
                    [
                      result.advice,
                      result.suggestions?.length ? `Suggestions:\n${result.suggestions.map((s) => `- ${s}`).join('\n')}` : '',
                      design?.title ? `Design: ${design.title}` : '',
                      design?.goal ? `Goal: ${design.goal}` : '',
                      design?.steps?.length ? `Steps:\n${design.steps.map((s) => `- ${s}`).join('\n')}` : '',
                      design?.cues?.length ? `Cues:\n${design.cues.map((s) => `- ${s}`).join('\n')}` : '',
                      design?.pitfalls?.length ? `Pitfalls:\n${design.pitfalls.map((s) => `- ${s}`).join('\n')}` : '',
                      design?.notes ? `Notes: ${design.notes}` : '',
                    ]
                      .filter(Boolean)
                      .join('\n\n'),
                    'craft',
                  )
                }
              >
                {copied === 'craft' ? '✓ Copied' : 'Copy all'}
              </button>
            </div>

            {result.advice && <p className="flavor-advice">{result.advice}</p>}

            {result.suggestions && result.suggestions.length > 0 && (
              <div className="flavor-block">
                <h4 className="flavor-subhead">Suggestions</h4>
                <ul className="flavor-list">
                  {result.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {design && (design.title || design.goal || design.steps?.length || design.cues?.length || design.pitfalls?.length || design.notes) && (
              <div className="flavor-block flavor-design">
                <h4 className="flavor-subhead">{design.title || 'Design'}</h4>
                {design.goal && <p className="flavor-design-goal">{design.goal}</p>}

                {design.steps && design.steps.length > 0 && (
                  <div className="flavor-design-block">
                    <span className="flavor-design-label">Steps</span>
                    <ol className="flavor-list">
                      {design.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {design.cues && design.cues.length > 0 && (
                  <div className="flavor-design-block">
                    <span className="flavor-design-label">Cues</span>
                    <ul className="flavor-list">
                      {design.cues.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {design.pitfalls && design.pitfalls.length > 0 && (
                  <div className="flavor-design-block">
                    <span className="flavor-design-label">Pitfalls</span>
                    <ul className="flavor-list">
                      {design.pitfalls.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {design.notes && <p className="flavor-note">{design.notes}</p>}
              </div>
            )}
          </section>
        )}

        {result && (result.descriptors?.length ?? 0) > 0 && (
          <section className="flavor-result">
            <div className="flavor-result-head">
              <h3 className="section-title">
                {mode === 'scene' ? 'Flavor used' : `Descriptors for “${result.subject}”`}
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => copy((result.descriptors ?? []).join(', '), 'desc')}
              >
                {copied === 'desc' ? '✓ Copied' : 'Copy all'}
              </button>
            </div>
            <div className="flavor-chips">
              {(result.descriptors ?? []).map((d) => (
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
              <h3 className="section-title">{craft ? 'Example scene' : 'Enriched scene'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => copy(result.scene, 'scene')}>
                {copied === 'scene' ? '✓ Copied' : 'Copy scene'}
              </button>
            </div>
            <div className="flavor-scene">{result.scene}</div>
          </section>
        )}

        {result && !(result.descriptors?.length ?? 0) && !result.scene && !craft && (
          <div className="chat-error">The AI returned nothing usable — try rephrasing.</div>
        )}
        {craft && result && !result.advice && !result.suggestions?.length && !result.scene && (
          <div className="chat-error">The AI returned nothing usable — try rephrasing.</div>
        )}
      </div>
    </div>
  );
}

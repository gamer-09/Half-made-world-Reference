import { useCallback, useEffect, useState } from 'react';
import { plan, deletePlanSessions, fetchAiStatus, AiRateLimitError } from '../api';
import type { PlanAnswer, PlanDraft, PlanQuestion } from '../api';
import { Modal } from './Modal';
import { formatCountdown } from './QueryChatRoom';

interface PlanningRoomProps {
  onOpenEntry?: (name: string) => void;
}

const EXAMPLES = [
  "Plan an evil character who could threaten the main cast",
  "Plan a new race that would fit the world's power balance",
  'Plan a city on the edge of the map',
  'Plan a secret faction pulling strings from the shadows',
  'Plan a new section for the archive',
];

function planMarkdown(plan: PlanDraft): string {
  const lines: string[] = [`# ${plan.title}`, '', plan.summary, ''];
  for (const section of plan.sections) {
    lines.push(`## ${section.heading}`);
    for (const point of section.points) lines.push(`- ${point}`);
    lines.push('');
  }
  if (plan.risks.length) {
    lines.push('## Watch out for');
    for (const risk of plan.risks) lines.push(`- ${risk}`);
    lines.push('');
  }
  if (plan.sources.length) {
    lines.push('Drawn from');
    for (const name of plan.sources) lines.push(`- ${name}`);
  }
  return lines.join('\n');
}

export function PlanningRoom({ onOpenEntry }: PlanningRoomProps) {
  const [request, setRequest] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [answers, setAnswers] = useState<PlanAnswer[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(true);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [limitInfo, setLimitInfo] = useState<number | null>(null);
  const [sessions, setSessions] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  // The planner is switched off on the server while it is reworked; ask the
  // server once on mount so the room can say so instead of failing mid-run.
  const [plannerOn, setPlannerOn] = useState(true);
  const [plannerChecked, setPlannerChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAiStatus().then((status) => {
      if (!alive) return;
      setPlannerOn(status.plannerEnabled);
      setPlannerChecked(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Down-tick the rate-limit countdown once per second.
  useEffect(() => {
    if (limitInfo === null || limitInfo <= 0) return;
    const id = window.setInterval(() => {
      setLimitInfo((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => window.clearInterval(id);
  }, [limitInfo ?? 0]);

  const run = useCallback(
    async (text: string, givenAnswers: PlanAnswer[] | null) => {
      const clean = text.trim();
      if (!clean || busy) return;
      if (!plannerOn) {
        setError('The planner is switched off for now.');
        return;
      }
      setSubmitted(clean);
      setError('');
      setOpen(true);
      setBusy(true);
      try {
        const next = await plan({ request: clean, answers: givenAnswers ?? undefined });
        setDraft(next);
        setAnswers(givenAnswers);
        // Track the opencode session files this plan created so the user can
        // delete them (the planner is stateless; these are the only leftovers).
        if (next.sessions?.length) {
          setSessions((prev) => [...new Set([...prev, ...next.sessions!])]);
          setCleared(false);
        }
        // Only pop the questions when the planner is waiting on them *before*
        // drafting (needsInput). A finished plan never asks again.
        if (next.needsInput) setQuestionsOpen(true);
      } catch (err) {
        if (err instanceof AiRateLimitError) setLimitInfo(err.retryAfterSeconds);
        else setError(err instanceof Error ? err.message : 'The plan request failed.');
      } finally {
        setBusy(false);
      }
    },
    [busy, plannerOn],
  );

  const send = useCallback(() => run(request, null), [run, request]);

  const applyAnswers = useCallback(
    (next: PlanAnswer[]) => {
      setQuestionsOpen(false);
      run(submitted, next);
    },
    [run, submitted],
  );

  const copyPlan = useCallback(async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(planMarkdown(draft));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy to the clipboard.');
    }
  }, [draft]);

  const clearSession = useCallback(async () => {
    if (!sessions.length || clearing) return;
    setClearing(true);
    setError('');
    try {
      const removed = await deletePlanSessions(sessions);
      // Drop whatever was removed; keep any that failed so the user can retry.
      setSessions((prev) => prev.filter((id) => !removed.includes(id)));
      setCleared(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the session file.');
    } finally {
      setClearing(false);
    }
  }, [sessions, clearing]);

  return (
    <div className="plan-room">
      <div className="plan-header">
        <div className="plan-header-row">
          <h3 className="plan-title">Planning Room</h3>
          <span className="plan-badge">dev only</span>
          <button
            type="button"
            className="btn btn-danger btn-sm plan-clear-session"
            onClick={clearSession}
            disabled={!sessions.length || clearing}
            title={
              sessions.length
                ? `Delete the ${sessions.length} opencode session file${
                    sessions.length === 1 ? '' : 's'
                  } this plan created`
                : 'No session file yet — plan something first'
            }
          >
            {clearing
              ? 'Deleting…'
              : cleared && !sessions.length
                ? 'Session deleted'
                : `Delete session${sessions.length > 1 ? `s (${sessions.length})` : ''}`}
          </button>
        </div>
        <p className="plan-sub">
          Describe something new to add to the world. The planner reads the archive, follows its
          conventions, and drafts a plan with you — nothing is saved.
        </p>
      </div>

      <div className="plan-scroll">
        {plannerChecked && !plannerOn && (
          <div className="plan-offline">
            <p className="plan-offline-title">The planner is switched off for now</p>
            <p className="plan-offline-text">
              It is being reworked — the archive, Flavor Finder, Canon Guard and Explore all keep
              working as usual. Everything the planner needs is still in place and will come back
              here.
            </p>
          </div>
        )}

        {!draft && !busy && plannerOn && (
          <div className="plan-examples">
            <p>Try one of these, or write your own:</p>
            <div className="plan-example-list">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="plan-example"
                  onClick={() => setRequest(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {(busy || (draft?.thinking && !draft.needsInput)) && (
          <div className="plan-think">
            <button
              type="button"
              className="plan-think-head"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              {busy && <span className="plan-think-dots" aria-hidden="true" />}
              <span className="plan-think-label">
                {busy ? 'Reading the archive and drafting…' : 'What I was thinking'}
              </span>
              <span className="plan-think-caret" aria-hidden="true">
                {open ? '−' : '+'}
              </span>
            </button>
            {open && (
              <div className="plan-think-body">
                {draft?.thinking ? (
                  <p className="plan-think-text">{draft.thinking}</p>
                ) : (
                  <p className="plan-think-text">Looking through the archive…</p>
                )}
              </div>
            )}
          </div>
        )}

        {draft?.needsInput && (
          <div className="plan-needinfo">
            <p className="plan-needinfo-text">
              {draft.thinking ||
                'I need a few decisions from you before I can draft this properly.'}
            </p>
            {draft.questions.length > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setQuestionsOpen(true)}
              >
                Answer {draft.questions.length}{' '}
                {draft.questions.length === 1 ? 'question' : 'questions'}
              </button>
            )}
          </div>
        )}

        {draft && !draft.needsInput && (
          <article className="plan-card">
            <h3 className="plan-card-title">{draft.title}</h3>
            {draft.summary && <p className="plan-card-summary">{draft.summary}</p>}

            {draft.sections.map((section) => (
              <section className="plan-section" key={section.heading}>
                <h4 className="plan-section-head">{section.heading}</h4>
                <ul className="plan-points">
                  {section.points.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </section>
            ))}

            {draft.risks.length > 0 && (
              <section className="plan-section plan-section--risk">
                <h4 className="plan-section-head">Watch out for</h4>
                <ul className="plan-points">
                  {draft.risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              </section>
            )}

            {draft.sources.length > 0 && (
              <div className="plan-sources">
                <span className="plan-sources-label">Drawn from</span>
                {draft.sources.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="chip plan-source-chip"
                    onClick={() => onOpenEntry?.(name)}
                    disabled={!onOpenEntry}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            <div className="plan-card-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={copyPlan}>
                {copied ? 'Copied' : 'Copy plan'}
              </button>
              {draft.questions.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setQuestionsOpen(true)}
                >
                  Answer {draft.questions.length}{' '}
                  {draft.questions.length === 1 ? 'question' : 'questions'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => run(submitted, answers ?? [])}
                disabled={busy}
              >
                Re-plan
              </button>
            </div>
          </article>
        )}

        {answers && answers.length > 0 && (
          <div className="plan-answers">
            <span className="plan-answers-label">Your decisions</span>
            {answers.map((a, i) => (
              <p className="plan-answer" key={i}>
                <span className="plan-answer-q">{a.question}</span>
                <span className="plan-answer-a">{a.answer}</span>
              </p>
            ))}
          </div>
        )}

        {error && <div className="chat-error">{error}</div>}
      </div>

      {limitInfo !== null && (
        <div className={`chat-limit${limitInfo <= 0 ? ' chat-limit--ready' : ''}`}>
          {limitInfo > 0 ? (
            <span className="chat-limit-text">
              The AI is busy with other requests — planning can resume in{' '}
              <strong className="chat-limit-clock">{formatCountdown(limitInfo)}</strong>
            </span>
          ) : (
            <span className="chat-limit-text">
              The AI is ready again.
              <button
                className="btn btn-primary chat-limit-retry"
                onClick={() => {
                  setLimitInfo(null);
                  run(submitted, answers);
                }}
              >
                Retry
              </button>
            </span>
          )}
          <button
            className="chat-limit-dismiss"
            onClick={() => setLimitInfo(null)}
            title="Hide this notice"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          placeholder={
            plannerOn ? 'What do you want to plan? (e.g. an evil character)' : 'The planner is off'
          }
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          disabled={busy || !plannerOn}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={send}
          disabled={busy || !request.trim() || !plannerOn}
        >
          {busy ? 'Planning…' : 'Plan it'}
        </button>
      </div>

      {questionsOpen && draft && (
        <PlanQuestionsModal
          questions={draft.questions}
          onClose={() => setQuestionsOpen(false)}
          onSubmit={applyAnswers}
        />
      )}
    </div>
  );
}

function PlanQuestionsModal({
  questions,
  onClose,
  onSubmit,
}: {
  questions: PlanQuestion[];
  onClose: () => void;
  onSubmit: (answers: PlanAnswer[]) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const q of questions) seed[q.id] = '';
    return seed;
  });

  const answered = questions.filter((q) => (values[q.id] ?? '').trim());

  return (
    <Modal onClose={onClose} wide>
      <div className="form plan-questions">
        <h3 className="form-title">A few decisions before I draft</h3>
        <p className="form-sub">
          Answer any that matter to you — the plan is built around your answers. Leave the rest blank
          and I'll use my own judgment, or draft without them.
        </p>
        {questions.map((q) => (
          <label key={q.id} className="form-label plan-question">
            {q.question}
            {q.why && <span className="plan-question-why">{q.why}</span>}
            <input
              className="input"
              value={values[q.id] ?? ''}
              placeholder="Your call…"
              onChange={(e) => setValues((prev) => ({ ...prev, [q.id]: e.target.value }))}
            />
          </label>
        ))}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Not now
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              onSubmit(
                answered.map((q) => ({ question: q.question, answer: (values[q.id] ?? '').trim() })),
              )
            }
          >
            {answered.length ? 'Draft with my answers' : 'Draft it my way'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

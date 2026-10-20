import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lintCanon } from '../api';
import type { CanonDraft } from '../api';
import type { CanonFinding, CanonLintResult, CanonRule } from '../types';

interface CanonGuardProps {
  onOpenEntry?: (name: string) => void;
  /** Existing entry pre-loaded into the draft linter (e.g. the selected one). */
  seedDraft?: CanonDraft | null;
}

// Rule order + presentation. `live` rules are the ones worth showing in the
// draft linter (scoped, actionable); the rest are archive-wide only.
const RULES: { key: CanonRule; label: string; hint: string }[] = [
  { key: 'CONTRADICTION', label: 'Contradictions', hint: 'Conflicting “first / only” claims' },
  { key: 'BROKEN-REF', label: 'Broken references', hint: 'Links pointing at nothing' },
  { key: 'DUPLICATE', label: 'Duplicate names', hint: 'Two entries, one name' },
  { key: 'DRIFT', label: 'Name drift', hint: 'Near-identical spellings' },
  { key: 'GAP', label: 'Gaps', hint: 'Empty or truncated descriptions' },
  { key: 'META', label: 'Meta language', hint: 'Placeholder / self-referential text' },
  { key: 'ORPHAN', label: 'Orphans', hint: 'No story link either way' },
  { key: 'SUGGESTED-LINK', label: 'Suggested links', hint: 'Under-connected entries that are named elsewhere' },
];

const EMPTY_DRAFT: CanonDraft = {
  name: '',
  category: '',
  subtitle: '',
  description: '',
  fields: [],
  tags: [],
};

const STORAGE_KEY = 'hmw-canon-ack';

// A finding's identity across re-audits. Rule + the two endpoints / claim, so a
// re-run of the same issue keeps its acknowledged state.
export function findingKey(f: CanonFinding): string {
  return [
    f.rule,
    f.name.toLowerCase(),
    (f.otherName ?? f.claim ?? f.variants?.[0] ?? '').toLowerCase(),
  ].join('|');
}

function severityClass(f: CanonFinding): string {
  if (f.benign) return 'canon-finding--info canon-finding--benign';
  if (f.rule === 'CONTRADICTION' || f.rule === 'BROKEN-REF') return 'canon-finding--error';
  if (f.rule === 'DUPLICATE' || f.rule === 'DRIFT' || f.rule === 'GAP' || f.rule === 'META')
    return 'canon-finding--warn';
  return 'canon-finding--info';
}

function loadAck(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

export function CanonGuard({ onOpenEntry, seedDraft }: CanonGuardProps) {
  const [result, setResult] = useState<CanonLintResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeRule, setActiveRule] = useState<CanonRule | 'ALL'>('ALL');

  // Triage: findings the user has reviewed and accepted, persisted locally.
  const [ack, setAck] = useState<Set<string>>(loadAck);
  const [hideAck, setHideAck] = useState(false);

  // Draft linter state.
  const [draft, setDraft] = useState<CanonDraft>(seedDraft ?? EMPTY_DRAFT);
  const [draftResult, setDraftResult] = useState<CanonFinding[] | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState('');
  const draftTimer = useRef<number | undefined>(undefined);

  const persistAck = useCallback((next: Set<string>) => {
    setAck(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleAck = useCallback(
    (f: CanonFinding) => {
      const key = findingKey(f);
      const next = new Set(ack);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persistAck(next);
    },
    [ack, persistAck],
  );

  const runArchive = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setResult(await lintCanon());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The audit failed.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    runArchive();
  }, [runArchive]);

  // Live-lint the draft, debounced. Only runs once there's something to check.
  useEffect(() => {
    window.clearTimeout(draftTimer.current);
    if (!draft.name.trim() && !draft.description.trim()) {
      setDraftResult(null);
      return;
    }
    draftTimer.current = window.setTimeout(async () => {
      setDraftBusy(true);
      setDraftError('');
      try {
        const r = await lintCanon(draft);
        setDraftResult(r.findings);
      } catch (err) {
        setDraftError(err instanceof Error ? err.message : 'Could not lint the draft.');
      } finally {
        setDraftBusy(false);
      }
    }, 450);
    return () => window.clearTimeout(draftTimer.current);
  }, [draft]);

  const findings = result?.findings ?? [];

  // Benign, canon-verified findings count as acknowledged for the badge, so the
  // "open" number reflects only things that genuinely need a look.
  const isAcked = useCallback(
    (f: CanonFinding) => ack.has(findingKey(f)) || Boolean(f.benign),
    [ack],
  );

  const counts = useMemo(() => {
    const m = new Map<CanonRule, number>();
    for (const f of findings) m.set(f.rule, (m.get(f.rule) ?? 0) + 1);
    return m;
  }, [findings]);

  const shown = useMemo(() => {
    let list = activeRule === 'ALL' ? findings : findings.filter((f) => f.rule === activeRule);
    if (hideAck) list = list.filter((f) => !isAcked(f));
    return list;
  }, [findings, activeRule, hideAck, isAcked]);

  const openCount = useMemo(() => findings.filter((f) => !isAcked(f)).length, [findings, isAcked]);
  const ackedCount = findings.length - openCount;

  return (
    <div className="canon-room">
      <div className="canon-header">
        <div className="canon-header-row">
          <h3 className="canon-title">Canon Guard</h3>
          <span className="plan-badge">dev only</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm canon-rerun"
            onClick={runArchive}
            disabled={busy}
            title="Re-run the archive audit"
          >
            {busy ? 'Checking…' : '↻ Re-check archive'}
          </button>
        </div>
        <p className="canon-sub">
          The same rules as <code>node server/audit-canon.js</code>, live in the app. Report-only —
          nothing in the archive is ever changed. Acknowledge a finding to fold it away once you've
          reviewed it; that's remembered in this browser. Matches the “Locked canon” notes in the
          audit skill.
        </p>
      </div>

      <div className="canon-scroll">
        {/* --- Draft linter -------------------------------------------------- */}
        <section className="canon-draft">
          <h4 className="canon-draft-head">Draft linter</h4>
          <p className="canon-draft-sub">
            Type or paste a draft below — it's checked against the whole archive as you go.
          </p>
          <div className="canon-draft-grid">
            <label className="canon-field">
              <span className="canon-field-label">Name</span>
              <input
                className="input"
                value={draft.name}
                placeholder="e.g. The Silent Choir"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </label>
            <label className="canon-field">
              <span className="canon-field-label">Category</span>
              <input
                className="input"
                value={draft.category}
                placeholder="e.g. Factions"
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              />
            </label>
          </div>
          <label className="canon-field">
            <span className="canon-field-label">Description</span>
            <textarea
              className="canon-textarea"
              value={draft.description}
              rows={4}
              placeholder="Draft the description. Mentions of existing entries will be flagged as suggested links."
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </label>

          <div className="canon-draft-status">
            {draftBusy && <span className="canon-muted">Checking…</span>}
            {!draftBusy && draftResult && draftResult.length === 0 && (
              <span className="canon-clean">✓ No issues found in this draft.</span>
            )}
            {draftError && <span className="canon-error">{draftError}</span>}
          </div>

          {draftResult && draftResult.length > 0 && (
            <ul className="canon-list canon-list--draft">
              {draftResult.map((f, i) => (
                <FindingRow key={`${f.rule}-${i}`} finding={f} onOpenEntry={onOpenEntry} />
              ))}
            </ul>
          )}
        </section>

        {/* --- Archive audit ------------------------------------------------- */}
        <section className="canon-archive">
          <div className="canon-archive-head">
            <h4 className="canon-draft-head">Archive audit</h4>
            {result && (
              <span className="canon-muted">
                {result.total} entries · {openCount} open
                {ackedCount > 0 ? ` · ${ackedCount} acknowledged` : ''}
              </span>
            )}
          </div>

          {error && <div className="chat-error">{error}</div>}

          <div className="canon-rule-filter">
            <button
              type="button"
              className={`canon-rule-chip${activeRule === 'ALL' ? ' on' : ''}`}
              onClick={() => setActiveRule('ALL')}
            >
              All <span className="canon-rule-count">{findings.length}</span>
            </button>
            {RULES.map((r) => {
              const n = counts.get(r.key) ?? 0;
              return (
                <button
                  key={r.key}
                  type="button"
                  className={`canon-rule-chip canon-rule-chip--${r.key.toLowerCase()}${activeRule === r.key ? ' on' : ''}${n === 0 ? ' canon-rule-chip--zero' : ''}`}
                  onClick={() => setActiveRule(r.key)}
                  title={r.hint}
                >
                  {r.label} <span className="canon-rule-count">{n}</span>
                </button>
              );
            })}
            <label className="canon-hide-toggle" title="Hide findings you've acknowledged">
              <input
                type="checkbox"
                checked={hideAck}
                onChange={(e) => setHideAck(e.target.checked)}
              />
              Hide acknowledged
            </label>
          </div>

          {busy && !result ? (
            <div className="loading">
              <span className="loading-orb" aria-hidden="true" />
              <p>Auditing the archive…</p>
            </div>
          ) : shown.length === 0 ? (
            <p className="canon-clean canon-empty">
              ✓ Nothing to report{activeRule === 'ALL' ? '' : ' for this rule'}
              {hideAck && ackedCount > 0 ? ' (acknowledged findings hidden)' : ''}.
            </p>
          ) : (
            <ul className="canon-list">
              {shown.slice(0, 400).map((f, i) => (
                <FindingRow
                  key={`${findingKey(f)}-${i}`}
                  finding={f}
                  onOpenEntry={onOpenEntry}
                  acknowledged={isAcked(f)}
                  onToggleAck={toggleAck}
                />
              ))}
              {shown.length > 400 && (
                <li className="canon-more">
                  …and {shown.length - 400} more. Narrow the filter to see the rest.
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function FindingRow({
  finding,
  onOpenEntry,
  acknowledged,
  onToggleAck,
}: {
  finding: CanonFinding;
  onOpenEntry?: (name: string) => void;
  acknowledged?: boolean;
  onToggleAck?: (f: CanonFinding) => void;
}) {
  const openable = Boolean(finding.id && onOpenEntry && finding.name);
  return (
    <li className={`canon-finding ${severityClass(finding)}${acknowledged ? ' canon-finding--acked' : ''}`}>
      <span className="canon-finding-rule">{finding.rule}</span>
      <div className="canon-finding-body">
        <button
          type="button"
          className="canon-finding-name"
          onClick={() => openable && onOpenEntry?.(finding.name)}
          disabled={!openable}
          title={openable ? `Open “${finding.name}”` : finding.name}
        >
          {finding.name}
        </button>
        <span className="canon-finding-msg">{finding.message}</span>
      </div>
      {onToggleAck && (
        <button
          type="button"
          className={`canon-ack-btn${acknowledged ? ' on' : ''}`}
          onClick={() => onToggleAck(finding)}
          title={
            finding.benign
              ? 'Verified consistent with locked canon'
              : acknowledged
                ? 'Un-acknowledge this finding'
                : 'Mark as reviewed / accepted'
          }
          disabled={finding.benign}
        >
          {acknowledged ? '✓' : 'Ack'}
        </button>
      )}
    </li>
  );
}

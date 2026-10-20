/**
 * Canon rules — the shared consistency checks behind both the CLI audit
 * (server/audit-canon.js) and the in-app Canon Guard (/api/canon/lint).
 *
 * Adapted from the Worldbuilding Codex audit methodology
 * (github.com/alainator/worldcodex, MIT): scope -> scan -> triage -> verify.
 *
 * Rule taxonomy:
 *   CONTRADICTION  conflicting "first / only" claims about a unique thing
 *   BROKEN-REF     story-link / relationship endpoints that resolve to no entry
 *   DUPLICATE      two entries sharing a name
 *   DRIFT          near-identical entry names (typo / casing / spacing variants)
 *   GAP            truncated or empty descriptions
 *   META           meta-commentary / placeholder language in canon text
 *   ORPHAN         entry with no story link in either direction (disconnected)
 *   SUGGESTED-LINK an entry named in the text that has an entry of its own but
 *                  no link yet (a probable missing connection)
 *
 * Pure and side-effect free: it never reads or writes files. Callers pass the
 * data in. `lintEntry` scopes the whole thing to the neighbourhood of one entry
 * so the UI can show live feedback while drafting.
 */

// Names that are intentionally duplicated or intentionally similar.
const KNOWN_DUPES = new Set(['twilight veyn']);
// Distinct-but-similar names that are NOT drift (different things sharing a stem).
const KNOWN_DISTINCT = [
  ['heart-bind', 'heartbind'],
  ['bond-sight', 'bond sight'],
];

const TRUNC = /(\b(and|or|the|a|an|of|to|with|using|by|in|for|from|that|which|as|into))$/i;

const META_PHRASES = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /lorem ipsum/i,
  /placeholder/i,
  /this (section|entry|document) (establishes|describes|outlines)/i,
  /in this (article|page)/i,
  /as (mentioned|noted|described) (above|below)/i,
];

const UNIQUE_CLAIMS = [
  /\bfirst (and only )?(angel.?demon )?hybrid/i,
  /\bonly (angel.?demon )?hybrid/i,
  /\bsecond hybrid\b/i,
];

// Verified-benign "Nth hybrid" mentions. The heuristic lumps every appearance of
// the phrase together, but these are consistent with locked canon (Jaiden = first
// hybrid; Vasric = the "second" attempt and a failed Rejection; the rule-defining
// entries merely *discuss* hybrids). Listed by the matched claim phrase, so a
// genuinely new/duplicate claim still surfaces. See SKILL.md "Locked canon".
const KNOWN_BENIGN_CLAIMS = new Set(['only hybrid', 'first angel-demon hybrid', 'second hybrid', 'first hybrid']);

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const entryText = (e) =>
  (e.description || '') + ' ' + (e.fields || []).map((f) => f.value || '').join(' ');
const isKnownDistinct = (a, b) =>
  KNOWN_DISTINCT.some((p) => p.includes(a.toLowerCase()) && p.includes(b.toLowerCase()));

function makeResolver(world) {
  const names = new Set(world.map((e) => e.name));
  const idSet = new Set(world.map((e) => e.id));
  const lowerNames = new Set(world.map((e) => e.name.toLowerCase()));
  return (v) => names.has(v) || idSet.has(v) || lowerNames.has(String(v).toLowerCase());
}

/**
 * Run every archive-wide rule over a full dataset.
 * @param {{world: object[], links?: object[], rels?: object[]}} data
 * @returns {object[]} findings, each { rule, severity, name?, id?, category?, message, ...extras }
 */
function lintArchive(data) {
  const world = data.world || [];
  const links = data.links || [];
  const rels = data.rels || [];
  const resolve = makeResolver(world);
  const names = new Set(world.map((e) => e.name));
  const lowerNames = new Set(world.map((e) => e.name.toLowerCase()));
  const findings = [];

  // --- BROKEN-REF ---------------------------------------------------------
  for (const l of links) {
    for (const end of ['source', 'target']) {
      if (l[end] && !resolve(l[end])) {
        findings.push({
          rule: 'BROKEN-REF',
          severity: 'error',
          name: l[end],
          id: l.id,
          message: `Story link points at “${l[end]}”, which isn’t an entry.`,
          end,
        });
      }
    }
  }
  for (const r of rels) {
    for (const end of ['source', 'target']) {
      if (r[end] && !resolve(r[end])) {
        findings.push({
          rule: 'BROKEN-REF',
          severity: 'error',
          name: r[end],
          id: r.id,
          message: `Relationship points at “${r[end]}”, which isn’t an entry.`,
          end,
        });
      }
    }
  }

  // --- DUPLICATE ----------------------------------------------------------
  const byLower = new Map();
  for (const e of world) {
    const k = e.name.toLowerCase();
    if (!byLower.has(k)) byLower.set(k, []);
    byLower.get(k).push(e);
  }
  for (const [k, arr] of byLower) {
    if (arr.length > 1 && !KNOWN_DUPES.has(k)) {
      findings.push({
        rule: 'DUPLICATE',
        severity: 'warn',
        name: arr[0].name,
        id: arr[0].id,
        category: arr[0].category,
        message: `${arr.length} entries share the name “${arr[0].name}”.`,
        ids: arr.map((e) => e.id),
        categories: arr.map((e) => e.category),
      });
    }
  }

  // --- DRIFT --------------------------------------------------------------
  const normMap = new Map();
  for (const e of world) {
    const n = norm(e.name);
    if (!normMap.has(n)) normMap.set(n, []);
    normMap.get(n).push(e.name);
  }
  for (const [n, arr] of normMap) {
    const uniq = [...new Set(arr)];
    if (uniq.length > 1 && !isKnownDistinct(uniq[0], uniq[1])) {
      findings.push({
        rule: 'DRIFT',
        severity: 'warn',
        name: uniq[0],
        message: `Nearly identical names: ${uniq.map((v) => `“${v}”`).join(', ')}.`,
        normalized: n,
        variants: uniq,
      });
    }
  }

  // --- GAP ----------------------------------------------------------------
  for (const e of world) {
    const desc = (e.description || '').trim();
    if (desc.length === 0) {
      findings.push({
        rule: 'GAP',
        severity: 'warn',
        name: e.name,
        id: e.id,
        category: e.category,
        message: 'Empty description.',
        issue: 'empty description',
      });
    } else if (
      TRUNC.test(desc) ||
      (!/[.!?"')\]]$/.test(desc) && desc.length < 200 && !desc.includes('\n'))
    ) {
      findings.push({
        rule: 'GAP',
        severity: 'warn',
        name: e.name,
        id: e.id,
        category: e.category,
        message: `Possibly truncated: “…${desc.slice(-40)}”.`,
        issue: 'possibly truncated',
      });
    }
  }

  // --- META ---------------------------------------------------------------
  for (const e of world) {
    const text = entryText(e);
    for (const re of META_PHRASES) {
      const m = text.match(re);
      if (m) {
        findings.push({
          rule: 'META',
          severity: 'warn',
          name: e.name,
          id: e.id,
          category: e.category,
          message: `Meta / placeholder language: “${m[0]}”.`,
          match: m[0],
        });
        break;
      }
    }
  }

  // --- CONTRADICTION ------------------------------------------------------
  const claimBuckets = new Map();
  for (const e of world) {
    const text = entryText(e);
    for (const re of UNIQUE_CLAIMS) {
      const m = text.match(re);
      if (m) {
        const key = m[0].toLowerCase();
        if (!claimBuckets.has(key)) claimBuckets.set(key, []);
        claimBuckets.get(key).push({ name: e.name, id: e.id });
      }
    }
  }
  for (const [claim, arr] of claimBuckets) {
    const benign = KNOWN_BENIGN_CLAIMS.has(claim);
    findings.push({
      rule: 'CONTRADICTION',
      severity: benign ? 'info' : 'error',
      benign,
      name: arr[0].name,
      id: arr[0].id,
      message: benign
        ? `“${claim}” appears across ${arr.length} entries — verified consistent with locked canon.`
        : `Conflicting “${claim}” claim across ${arr.length} entries.`,
      claim,
      sources: arr.map((a) => `${a.name} (${a.id})`),
    });
  }

  // --- ORPHAN -------------------------------------------------------------
  const linked = new Set();
  for (const l of links) {
    if (l.source) linked.add(String(l.source).toLowerCase());
    if (l.target) linked.add(String(l.target).toLowerCase());
  }
  for (const e of world) {
    if (!linked.has(e.name.toLowerCase())) {
      findings.push({
        rule: 'ORPHAN',
        severity: 'info',
        name: e.name,
        id: e.id,
        category: e.category,
        message: 'No story link connects this entry to the world.',
      });
    }
  }

  // --- SUGGESTED-LINK -----------------------------------------------------
  // An entry that names another entry which is *under-connected* (degree <= 1)
  // and has no link to it yet. Matching every cross-mention in a densely linked
  // world is pure noise; a mention only warrants action when the named entry is
  // an orphan or nearly one and ought to be woven in.
  const linkedPairs = new Set();
  const degree = new Map();
  for (const l of links) {
    const a = String(l.source || '').toLowerCase();
    const b = String(l.target || '').toLowerCase();
    linkedPairs.add(`${a}\u0000${b}`);
    linkedPairs.add(`${b}\u0000${a}`);
    degree.set(a, (degree.get(a) || 0) + 1);
    degree.set(b, (degree.get(b) || 0) + 1);
  }
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Longest names first so specifics win over any shorter substring.
  const named = [...names].sort((a, b) => b.length - a.length);
  for (const e of world) {
    const text = entryText(e) + ' ' + (e.subtitle || '');
    const seen = new Set();
    for (const other of named) {
      if (other === e.name) continue;
      const lo = other.toLowerCase();
      // Distinctive, multi-letter names only — short common words (Humans,
      // Elves, Lapse) match ordinary prose and aren't useful suggestions.
      if (lo.length < 7 || seen.has(lo)) continue;
      // Only flag a target that is under-connected (orphan or nearly so).
      if ((degree.get(lo) || 0) > 1) continue;
      if (linkedPairs.has(`${e.name.toLowerCase()}\u0000${lo}`)) continue;
      if (!new RegExp(`\\b${esc(other)}\\b`, 'i').test(text)) continue;
      seen.add(lo);
      findings.push({
        rule: 'SUGGESTED-LINK',
        severity: 'info',
        name: e.name,
        id: e.id,
        category: e.category,
        message: `Names “${other}”, which is barely connected — consider linking it.`,
        otherName: other,
      });
    }
  }

  return findings;
}

/**
 * Scope the archive-wide rules to the neighbourhood of one entry (an existing
 * entry being edited, or a draft). Returns only findings that involve that
 * entry — plus BROKEN-REF / DUPLICATE / DRIFT / CONTRADICTION checks that its
 * own text provokes.
 *
 * @param {{world: object[], links?: object[], rels?: object[], entry: object}} data
 *   `world` should be the data WITHOUT the draft entry (the draft is added here).
 */
function lintEntry(data) {
  const draft = data.entry;
  if (!draft) return [];
  const base = data.world || [];
  // Drop the entry being edited (same id) so a re-lint doesn't double-count it.
  // Same-*name* entries are kept: a name clash is exactly what DUPLICATE/DRIFT
  // should surface for a new entry.
  const world = base.filter((e) => e.id !== draft.id).concat(draft);
  const links = data.links || [];
  const rels = data.rels || [];

  const all = lintArchive({ world, links, rels });
  const me = draft.name.toLowerCase();
  const out = [];

  for (const f of all) {
    switch (f.rule) {
      case 'BROKEN-REF':
        // only refs we introduced (endpoints the draft names)
        if (String(f.name).toLowerCase() === me) out.push(f);
        break;
      case 'DUPLICATE':
      case 'DRIFT':
      case 'GAP':
      case 'META':
      case 'CONTRADICTION':
      case 'SUGGESTED-LINK':
      case 'ORPHAN':
        if (f.name && f.name.toLowerCase() === me) out.push(f);
        break;
      default:
        break;
    }
  }
  // Scope CONTRADICTION/SL suggestions to the draft's own claims only.
  return out.filter((f) => f.rule !== 'CONTRADICTION' || (f.sources || []).some((s) => s.toLowerCase().includes(`(${draft.id.toLowerCase()})`)));
}

module.exports = { lintArchive, lintEntry, norm, KNOWN_DUPES, KNOWN_DISTINCT };

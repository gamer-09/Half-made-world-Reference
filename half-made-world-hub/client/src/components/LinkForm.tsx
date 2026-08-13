import { useState } from 'react';

export interface LinkFormItem {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  description: string;
}

export interface LinkFormInput {
  source: string;
  target: string;
  type: string;
  label: string;
  description: string;
}

interface LinkFormProps {
  title: string;
  names: string[];
  types: Record<string, { label: string; color?: string }>;
  editing: LinkFormItem | null;
  onSave: (input: LinkFormInput) => void;
  onCancel: () => void;
}

export function LinkForm({ title, names, types, editing, onSave, onCancel }: LinkFormProps) {
  const [source, setSource] = useState(editing?.source ?? '');
  const [target, setTarget] = useState(editing?.target ?? '');
  const [type, setType] = useState(editing?.type ?? '');
  const [label, setLabel] = useState(editing?.label ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const s = source.trim();
    const t = target.trim();
    if (!s) return setError('Who is the source?');
    if (!t) return setError('Who is the target?');
    if (s.toLowerCase() === t.toLowerCase()) return setError('Source and target must be different.');
    if (!type) return setError('Pick a link type.');

    setSaving(true);
    onSave({
      source: s,
      target: t,
      type,
      label: label.trim() || types[type]?.label || type,
      description: description.trim(),
    });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2 className="form-title">{editing ? `Edit ${title}` : `Add ${title}`}</h2>
      <p className="form-sub">
        {editing ? (
          <>
            <strong>{editing.source}</strong> → <strong>{editing.target}</strong>
          </>
        ) : (
          'Who or what is connected — and how?'
        )}
      </p>

      <div className="form-row form-row--2col">
        <label className="form-label" htmlFor="link-source">
          Source *
          <input
            id="link-source"
            name="source"
            className="input"
            list="link-names"
            value={source}
            placeholder="e.g. Licent Varak"
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        <label className="form-label" htmlFor="link-target">
          Target *
          <input
            id="link-target"
            name="target"
            className="input"
            list="link-names"
            value={target}
            placeholder="e.g. Lisa"
            onChange={(e) => setTarget(e.target.value)}
          />
        </label>
      </div>
      <datalist id="link-names">
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <label className="form-label" htmlFor="link-type">
        Link type *
        <select
          id="link-type"
          name="type"
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Select a type…</option>
          {Object.entries(types).map(([key, t]) => (
            <option key={key} value={key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="form-label" htmlFor="link-label">
        Label
        <input
          id="link-label"
          name="label"
          className="input"
          value={label}
          placeholder="Defaults to the type label"
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>

      <label className="form-label" htmlFor="link-description">
        Story / notes
        <textarea
          id="link-description"
          name="description"
          className="input textarea"
          rows={3}
          value={description}
          placeholder="What connects them?"
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Link'}
        </button>
      </div>
    </form>
  );
}

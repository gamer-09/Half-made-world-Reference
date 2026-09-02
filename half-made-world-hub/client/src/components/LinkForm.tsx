import { useState } from 'react';

export interface LinkFormItem {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  description: string;
  color?: string;
}

export interface LinkFormInput {
  source: string;
  target: string;
  type: string;
  label: string;
  description: string;
  color?: string;
}

interface LinkFormProps {
  title: string;
  names: string[];
  types: Record<string, { label: string; color?: string }>;
  editing: LinkFormItem | null;
  onSave: (input: LinkFormInput) => void;
  onCancel: () => void;
}

const NEW_TYPE = '__new__';

/** Arrow colors offered when creating a custom link type. */
const CUSTOM_COLORS = [
  '#c8a876', // brass
  '#8f6b3c', // brassDeep
  '#c25e4a', // ember
  '#6b8e6b', // sage
  '#7f8fa3', // mist
  '#ebe6d8', // parchment
  '#c8a876', // brass
  '#c25e4a', // ember
  '#6b8e6b', // sage
  '#8f6b3c', // brassDeep
  '#7f8fa3', // mist
  '#ebe6d8', // parchment
];

export function LinkForm({ title, names, types, editing, onSave, onCancel }: LinkFormProps) {
  const isEditingCustom =
    !!editing && editing.type && !Object.prototype.hasOwnProperty.call(types, editing.type);

  const [source, setSource] = useState(editing?.source ?? '');
  const [target, setTarget] = useState(editing?.target ?? '');
  const [type, setType] = useState(isEditingCustom ? NEW_TYPE : editing?.type ?? '');
  const [customType, setCustomType] = useState(isEditingCustom ? editing.type : '');
  const [customColor, setCustomColor] = useState(editing?.color || CUSTOM_COLORS[0]);
  const [label, setLabel] = useState(editing?.label ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isNewType = type === NEW_TYPE;
  const finalType = isNewType ? customType.trim() : type;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const s = source.trim();
    const t = target.trim();
    if (!s) return setError('Who is the source?');
    if (!t) return setError('Who is the target?');
    if (s.toLowerCase() === t.toLowerCase()) return setError('Source and target must be different.');
    if (!finalType) return setError(isNewType ? 'Give the new type a name.' : 'Pick a link type.');

    setSaving(true);
    onSave({
      source: s,
      target: t,
      type: finalType,
      label: label.trim() || types[finalType]?.label || finalType,
      description: description.trim(),
      color: isNewType ? customColor : '',
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
          onChange={(e) => {
            setType(e.target.value);
            setError('');
          }}
        >
          <option value="">Select a type…</option>
          {Object.entries(types).map(([key, t]) => (
            <option key={key} value={key}>
              {t.label}
            </option>
          ))}
          <option value={NEW_TYPE}>＋ New arrow type…</option>
        </select>
      </label>

      {isNewType && (
        <div className="custom-type">
          <label className="form-label" htmlFor="link-custom-type">
            New arrow type *
            <input
              id="link-custom-type"
              name="customType"
              className="input"
              value={customType}
              placeholder="e.g. mentor of"
              onChange={(e) => setCustomType(e.target.value)}
            />
          </label>

          <div className="form-label">
            <span>Arrow color</span>
            <div className="color-swatches">
              {CUSTOM_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${customColor === c ? ' on' : ''}`}
                  style={{ background: c }}
                  onClick={() => setCustomColor(c)}
                  aria-label={`Arrow color ${c}`}
                  title={c}
                />
              ))}
              <label className="color-custom" title="Custom color">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      )}

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

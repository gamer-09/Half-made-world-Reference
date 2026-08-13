import { useMemo, useState } from 'react';
import type { Entry, EntryInput, Field } from '../types';

interface EntryFormProps {
  categories: string[];
  existingNames: string[];
  editing: Entry | null;
  onSave: (input: EntryInput) => void;
  onCancel: () => void;
}

const NEW_CATEGORY = '__new__';

export function EntryForm({ categories, existingNames, editing, onSave, onCancel }: EntryFormProps) {
  const [category, setCategory] = useState(editing?.category ?? '');
  const [newCategory, setNewCategory] = useState('');
  const [name, setName] = useState(editing?.name ?? '');
  const [subtitle, setSubtitle] = useState(editing?.subtitle ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [fields, setFields] = useState<Field[]>(editing?.fields?.length ? editing.fields : []);
  const [tagsText, setTagsText] = useState(editing?.tags?.join(', ') ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isNewCategory = category === NEW_CATEGORY;
  const chosenCategory = isNewCategory ? newCategory.trim() : category;

  const duplicateName = useMemo(() => {
    const n = name.trim().toLowerCase();
    if (!n) return null;
    return existingNames.find((x) => x.toLowerCase() === n && x !== editing?.name) ?? null;
  }, [name, existingNames, editing]);

  const updateField = (index: number, key: keyof Field, value: string) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const addField = () => {
    setFields((prev) => [...prev, { label: '', value: '' }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!chosenCategory) {
      setError('Pick a category (or type a new one).');
      return;
    }
    if (!name.trim()) {
      setError('Give the entry a name.');
      return;
    }
    if (!description.trim()) {
      setError('Write a description — this is the heart of the entry.');
      return;
    }
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setSaving(true);
    onSave({
      category: chosenCategory,
      name: name.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      fields: fields.filter((f) => f.label.trim() && f.value.trim()),
      tags,
    });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2 className="form-title">{editing ? 'Edit Entry' : 'Add New Entry'}</h2>
      <p className="form-sub">Fill in the structured fields — no raw document editing needed.</p>

      <div className="form-row form-row--2col">
        <label className="form-label" htmlFor="entry-category">
          Category
          <select
            id="entry-category"
            name="category"
            className="input"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setError('');
            }}
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={NEW_CATEGORY}>＋ New category…</option>
          </select>
        </label>

        {isNewCategory && (
          <label className="form-label" htmlFor="entry-new-category">
            New category name
            <input
              id="entry-new-category"
              name="newCategory"
              className="input"
              value={newCategory}
              placeholder="e.g. Factions"
              onChange={(e) => setNewCategory(e.target.value)}
            />
          </label>
        )}
      </div>

      <div className="form-row form-row--2col">
        <label className="form-label" htmlFor="entry-name">
          Name *
          <input
            id="entry-name"
            name="name"
            className="input"
            value={name}
            placeholder="e.g. Veilrunner"
            onChange={(e) => setName(e.target.value)}
          />
          {duplicateName && (
            <p className="dupe-warn" role="alert">
              ⚠ An entry named “{duplicateName}” already exists.
            </p>
          )}
        </label>
        <label className="form-label" htmlFor="entry-subtitle">
          Subtitle
          <input
            id="entry-subtitle"
            name="subtitle"
            className="input"
            value={subtitle}
            placeholder="A short tagline"
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </label>
      </div>

      <label className="form-label" htmlFor="entry-description">
        Description *
        <textarea
          id="entry-description"
          name="description"
          className="input textarea"
          rows={5}
          value={description}
          placeholder="What is this entry about?"
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="form-label">
        <div className="form-label-head">
          <span>Structured details</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addField}>
            ＋ Add detail
          </button>
        </div>
        {fields.length === 0 && <p className="form-hint">e.g. Rank: “Bloodward”, Appearance: “…”, Skills: “…”.</p>}
        <div className="fields-list">
          {fields.map((field, i) => (
            <div className="field-row" key={i}>
              <input
                className="input field-label"
                name={`field-label-${i}`}
                value={field.label}
                placeholder="Label (e.g. Rank)"
                onChange={(e) => updateField(i, 'label', e.target.value)}
              />
              <textarea
                className="input field-value"
                name={`field-value-${i}`}
                rows={2}
                value={field.value}
                placeholder="Value"
                onChange={(e) => updateField(i, 'value', e.target.value)}
              />
              <button
                type="button"
                className="btn btn-danger btn-sm field-remove"
                onClick={() => removeField(i)}
                aria-label="Remove detail"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="form-label" htmlFor="entry-tags">
        Tags
        <input
          id="entry-tags"
          name="tags"
          className="input"
          value={tagsText}
          placeholder="comma, separated, tags"
          onChange={(e) => setTagsText(e.target.value)}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Entry'}
        </button>
      </div>
    </form>
  );
}

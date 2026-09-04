import { Plus, X } from 'lucide-react';
import type { FieldDef } from '../../data/nodeSchemas';
import type { FieldValue } from '../../lib/types';

/**
 * One renderer for every node type. Node types are declared as data in
 * nodeSchemas.ts, so adding a field never means writing a form.
 */

interface Props {
  def: FieldDef;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
}

export function FieldRenderer({ def, value, onChange }: Props) {
  const empty =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && !value.trim()) ||
    (Array.isArray(value) && value.length === 0);

  if (def.kind === 'list') {
    const items = Array.isArray(value) ? value : [];
    return (
      <div className={`field${empty ? ' field-empty' : ''}`}>
        <label>{def.label}</label>
        {items.map((item, i) => (
          <div className="list-row" key={i}>
            <input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <button
              className="icon-btn"
              aria-label={`Remove ${item || 'item'}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <button className="btn btn-sm" onClick={() => onChange([...items, ''])}>
          <Plus size={14} />
          Add
        </button>
      </div>
    );
  }

  const str = typeof value === 'string' ? value : '';

  if (def.kind === 'select') {
    return (
      <div className={`field${empty ? ' field-empty' : ''}`}>
        <label>{def.label}</label>
        <select value={str} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {(def.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (def.kind === 'longtext') {
    return (
      <div className={`field${empty ? ' field-empty' : ''}`}>
        <label>{def.label}</label>
        <textarea
          value={str}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value || null)}
        />
      </div>
    );
  }

  return (
    <div className={`field${empty ? ' field-empty' : ''}`}>
      <label>{def.label}</label>
      <input
        className={def.mono ? 'mono' : undefined}
        value={str}
        placeholder={def.placeholder}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  );
}

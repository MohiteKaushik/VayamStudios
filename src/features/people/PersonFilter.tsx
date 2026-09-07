import { Users } from 'lucide-react';
import type { Person } from '../../lib/relevance';

/**
 * "Which scenes do I need to work on?"
 *
 * Crew and cast in one control, because a first AD thinks about both. A native
 * select rather than a custom menu: it is one tap on a phone, keyboard
 * accessible for free, and this sits on a page whose job is not to be clever.
 */

interface Props {
  people: Person[];
  /** Person id, or null for "All people". */
  value: string | null;
  onChange: (id: string | null) => void;
  /** e.g. "3 scenes · 5 setups". Rendered beside the control when filtering. */
  summary?: string;
}

export function PersonFilter({ people, value, onChange, summary }: Props) {
  const crew = people.filter((p) => p.kind === 'crew');
  const cast = people.filter((p) => p.kind === 'character');

  if (!people.length) return null;

  return (
    <div className="person-filter">
      <label className="person-select">
        <Users size={14} />
        <select
          value={value ?? ''}
          aria-label="Filter by person"
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">All people</option>
          {crew.length > 0 && (
            <optgroup label="Crew">
              {crew.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.role ? ` — ${p.role}` : ''}
                </option>
              ))}
            </optgroup>
          )}
          {cast.length > 0 && (
            <optgroup label="Cast">
              {cast.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      {value && summary && <span className="person-summary">{summary}</span>}
    </div>
  );
}

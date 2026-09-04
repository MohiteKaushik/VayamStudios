import { SCHEMA_VERSION } from '../lib/types';

type AnyDoc = { schemaVersion?: number; [k: string]: unknown };

/**
 * Versioned upgrade steps. Empty today because we are at v1 — but the hook
 * exists from commit one so the first field rename does not brick real data.
 *
 * Add: `if (doc.schemaVersion < 2) { ...transform...; doc.schemaVersion = 2; }`
 */
export function migrate(doc: AnyDoc): AnyDoc {
  const next = { ...doc };
  if (typeof next.schemaVersion !== 'number') next.schemaVersion = 1;
  next.schemaVersion = SCHEMA_VERSION;
  return next;
}

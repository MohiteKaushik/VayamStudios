import { SCHEMA_VERSION } from '../lib/types';

type AnyDoc = { schemaVersion?: number; [k: string]: unknown };

/**
 * Versioned upgrade steps, applied in order before Zod validation.
 *
 * Add the next one as:
 *   if (version < 3) { ...transform next...; version = 3; }
 *
 * Note the version is NOT stamped unconditionally at the end. Doing that would
 * mark an untransformed document as current, so a step added later would be
 * skipped on exactly the old data it was written for.
 */
export function migrate(doc: AnyDoc): AnyDoc {
  const next = { ...doc };
  let version = typeof next.schemaVersion === 'number' ? next.schemaVersion : 1;

  /*
   * v1 -> v2
   * Shots gained reference images, crew assignment and a video reference.
   * Scenes gained crew assignment, a video reference and optional parallel
   * grouping. Every added field is optional or carries a Zod default, so a v1
   * document upgrades through validation alone and needs no transform here.
   */
  if (version < 2) {
    version = 2;
  }

  next.schemaVersion = Math.min(version, SCHEMA_VERSION);
  return next;
}

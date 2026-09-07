import { NODE_TYPES } from '../data/nodeSchemas';
import type { SceneNode, Shot } from './types';

/**
 * One line describing what is actually planned on a node, for collapsed cards.
 *
 * Fields flagged `onCard` in nodeSchemas come first — those are the ones already
 * chosen as worth printing on a scene card, so the same judgement applies here
 * and there is no second list to keep in sync.
 */
export function summarizeNode(node: SceneNode, max = 2): string {
  const def = NODE_TYPES[node.type];
  const fields = [...def.fields].sort(
    (a, b) => Number(Boolean(b.onCard)) - Number(Boolean(a.onCard))
  );

  const parts: string[] = [];
  for (const f of fields) {
    const v = node.fields[f.key];
    if (Array.isArray(v)) {
      if (v.length) parts.push(v.slice(0, 2).join(', '));
    } else if (typeof v === 'string' && v.trim()) {
      parts.push(v.trim().replace(/\s*\n\s*/g, ' '));
    }
    if (parts.length >= max) break;
  }
  return parts.join('  ·  ');
}

/** The technical headline for a collapsed shot: what it looks like, then the glass. */
export function summarizeShot(shot: Shot): string {
  const comp = shot.nodes.find((n) => n.type === 'COMPOSITION');
  const cam = shot.nodes.find((n) => n.type === 'CAMERA');

  const parts = [
    comp?.fields.shotSize,
    comp?.fields.angle,
    comp?.fields.movement,
    cam?.fields.focalLength,
  ].filter((v): v is string => typeof v === 'string' && v.trim() !== '');

  return parts.join('  ·  ');
}

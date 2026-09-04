import type { Scene, SceneNode, Shot } from './types';

/**
 * Deterministic layout for a fixed-depth tree. No physics, no user positioning,
 * no graph library. Pure function -> trivially testable, and identical on
 * screen and in export.
 *
 * Depth is at most 3:
 *   scene -> [scene-scoped nodes] + [setups] -> [setup's camera + composition]
 *
 * If the scene has exactly one setup, that level is FLATTENED, so a simple
 * scene looks like a plain five-branch fan.
 *
 * Row 1 wraps past MAX_PER_ROW. An eight-setup dialogue scene would otherwise
 * be 2000px wide and force horizontal scrolling to see the whole scene.
 */

export type LaidOutKind = 'scene' | 'shot' | 'node';

export interface LaidOutItem {
  key: string;
  kind: LaidOutKind;
  x: number;
  y: number;
  w: number;
  h: number;
  sceneId: string;
  shotId?: string;
  node?: SceneNode;
  shot?: Shot;
}

export interface LaidOutEdge {
  key: string;
  from: string;
  to: string;
  path: string;
  color: string;
}

export interface LayoutResult {
  items: LaidOutItem[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
}

export interface LayoutOptions {
  /** Which setup is expanded. Ignored when the scene has a single setup. */
  activeShotId?: string;
  nodeColor: (n: SceneNode) => string;
}

const SCENE_W = 268;
const SCENE_H = 96;
const CARD_W = 172;
const NODE_H = 78;
const SHOT_H = 66;

const H_GAP = 20;
const ROW_GAP = 18;
const V_GAP = 72;
const PAD = 36;
const MAX_PER_ROW = 6;

interface Slot {
  kind: LaidOutKind;
  node?: SceneNode;
  shot?: Shot;
  shotId?: string;
}

interface RawEdge {
  key: string;
  from: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function centredXs(count: number, w: number, gap: number): number[] {
  const total = count * w + (count - 1) * gap;
  const start = -total / 2 + w / 2;
  return Array.from({ length: count }, (_, i) => start + i * (w + gap));
}

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const dy = Math.max(26, (y2 - y1) * 0.5);
  const f = (n: number) => n.toFixed(1);
  return `M ${f(x1)} ${f(y1)} C ${f(x1)} ${f(y1 + dy)}, ${f(x2)} ${f(y2 - dy)}, ${f(x2)} ${f(y2)}`;
}

export function layoutScene(scene: Scene, opts: LayoutOptions): LayoutResult {
  const items: LaidOutItem[] = [];
  const raw: RawEdge[] = [];

  const shots = [...scene.shots].sort((a, b) => a.orderIndex - b.orderIndex);
  const singleShot = shots.length === 1;
  const sceneKey = `scene:${scene.id}`;

  // ---- Row 0: the scene, centred on x = 0 ----
  items.push({
    key: sceneKey,
    kind: 'scene',
    x: -SCENE_W / 2,
    y: 0,
    w: SCENE_W,
    h: SCENE_H,
    sceneId: scene.id,
  });

  // ---- Row 1 slots ----
  const slots: Slot[] = [];
  if (singleShot) {
    // Camera and composition read first: they answer "what is the camera doing".
    for (const n of shots[0].nodes) slots.push({ kind: 'node', node: n, shotId: shots[0].id });
  }
  for (const n of scene.nodes) slots.push({ kind: 'node', node: n });
  if (!singleShot) for (const s of shots) slots.push({ kind: 'shot', shot: s, shotId: s.id });

  const rows = chunk(slots, MAX_PER_ROW);
  let y = SCENE_H + V_GAP;

  for (const row of rows) {
    const xs = centredXs(row.length, CARD_W, H_GAP);
    let tallest = 0;
    row.forEach((slot, i) => {
      const h = slot.kind === 'shot' ? SHOT_H : NODE_H;
      tallest = Math.max(tallest, h);
      const key = slot.kind === 'shot' ? `shot:${slot.shot!.id}` : `node:${slot.node!.id}`;
      items.push({
        key,
        kind: slot.kind,
        x: xs[i] - CARD_W / 2,
        y,
        w: CARD_W,
        h,
        sceneId: scene.id,
        shotId: slot.shotId,
        node: slot.node,
        shot: slot.shot,
      });
      raw.push({
        key,
        from: sceneKey,
        x1: 0,
        y1: SCENE_H,
        x2: xs[i],
        y2: y,
        color: slot.node ? opts.nodeColor(slot.node) : '#5a6675',
      });
    });
    y += tallest + ROW_GAP;
  }

  // ---- Row 2: the expanded setup's own branches ----
  if (!singleShot && opts.activeShotId) {
    const shot = shots.find((s) => s.id === opts.activeShotId);
    const parent = items.find((it) => it.key === `shot:${opts.activeShotId}`);
    if (shot && parent) {
      const childY = y - ROW_GAP + V_GAP;
      const parentCx = parent.x + parent.w / 2;
      const xs = centredXs(shot.nodes.length, CARD_W, H_GAP);
      shot.nodes.forEach((n, i) => {
        const cx = parentCx + xs[i];
        const key = `node:${n.id}`;
        items.push({
          key,
          kind: 'node',
          x: cx - CARD_W / 2,
          y: childY,
          w: CARD_W,
          h: NODE_H,
          sceneId: scene.id,
          shotId: shot.id,
          node: n,
        });
        raw.push({
          key,
          from: `shot:${shot.id}`,
          x1: parentCx,
          y1: parent.y + parent.h,
          x2: cx,
          y2: childY,
          color: opts.nodeColor(n),
        });
      });
    }
  }

  // ---- Normalise into positive space ----
  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x + i.w));
  const maxY = Math.max(...items.map((i) => i.y + i.h));
  const dx = -minX + PAD;

  for (const it of items) it.x += dx;

  const edges: LaidOutEdge[] = raw.map((e) => ({
    key: `e:${e.key}`,
    from: e.from,
    to: e.key,
    color: e.color,
    path: edgePath(e.x1 + dx, e.y1, e.x2 + dx, e.y2),
  }));

  return {
    items,
    edges,
    width: maxX - minX + PAD * 2,
    height: maxY + PAD,
  };
}

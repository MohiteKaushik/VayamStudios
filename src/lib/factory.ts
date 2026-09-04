import { uid } from './id';
import { NODE_TYPES } from '../data/nodeSchemas';
import type { NodeType, Scene, SceneNode, Shot } from './types';
import { SCENE_SCOPED_TYPES, SHOT_SCOPED_TYPES } from './types';

export function makeNode(type: NodeType, label?: string, iconKey?: string): SceneNode {
  const def = NODE_TYPES[type];
  const node: SceneNode = {
    id: uid('node'),
    type,
    label: label ?? def.label,
    iconKey: iconKey ?? def.iconKey,
    locked: type !== 'CUSTOM',
    participantIds: [],
    fields: {},
    checklist: [],
    assetIds: [],
  };
  if (type === 'BLOCKING') {
    node.blocking = {
      marks: [],
      camera: { x: 0.5, y: 0.9, heading: 0, fovDeg: 54 },
    };
  }
  return node;
}

export function makeShot(label: string, orderIndex: number): Shot {
  return {
    id: uid('shot'),
    label,
    orderIndex,
    status: 'planned',
    nodes: SHOT_SCOPED_TYPES.map((t) => makeNode(t)),
  };
}

export function makeScene(sceneNumber: string, orderIndex: number, title = 'Untitled scene'): Scene {
  return {
    id: uid('scene'),
    sceneNumber,
    orderIndex,
    title,
    status: 'planned',
    referenceAssetIds: [],
    nodes: SCENE_SCOPED_TYPES.map((t) => makeNode(t)),
    shots: [makeShot('A', 0)],
  };
}

/**
 * Repairs any scene that is missing a mandatory node — for example after
 * importing a file written by an older build. Cheap insurance.
 */
export function ensureMandatory(scene: Scene): Scene {
  const nodes = [...scene.nodes];
  for (const t of SCENE_SCOPED_TYPES) {
    if (!nodes.some((n) => n.type === t)) nodes.push(makeNode(t));
  }
  const shots = scene.shots.length ? scene.shots : [makeShot('A', 0)];
  const fixedShots = shots.map((s) => {
    const sn = [...s.nodes];
    for (const t of SHOT_SCOPED_TYPES) {
      if (!sn.some((n) => n.type === t)) sn.push(makeNode(t));
    }
    return { ...s, nodes: sn };
  });
  return { ...scene, nodes, shots: fixedShots };
}

/** Next shot label: A, B, C ... then A2, B2. Matches how sets actually label. */
export function nextShotLabel(existing: string[]): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const l of letters) if (!existing.includes(l)) return l;
  let n = 2;
  for (;;) {
    for (const l of letters) {
      const cand = `${l}${n}`;
      if (!existing.includes(cand)) return cand;
    }
    n += 1;
  }
}

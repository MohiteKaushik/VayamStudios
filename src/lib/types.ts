/**
 * Core domain model for Visual Shooting Blueprint.
 *
 * Design rules baked in here:
 *  - `id` is always an opaque UUID. Never displayed, never parsed.
 *  - `sceneNumber` / shot `label` are DISPLAY strings ("12A", "47pt2"). Never identity.
 *  - CAMERA + COMPOSITION are shot-scoped. BLOCKING/PRODUCTION/AUDIO are scene-scoped.
 *  - Node data lives in a validated `fields` record so adding a field is a config
 *    change, not a schema migration.
 */

export const SCHEMA_VERSION = 1;

export type NodeType =
  | 'CAMERA'
  | 'COMPOSITION'
  | 'BLOCKING'
  | 'PRODUCTION'
  | 'AUDIO'
  | 'CUSTOM';

export type SceneStatus = 'planned' | 'ready' | 'shot' | 'cut';
export type ShotStatus = 'planned' | 'ready' | 'shot';

export type FieldValue = string | string[] | null;

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  /** Node types this person owns by default, across the whole film. */
  ownsNodeTypes: NodeType[];
}

export interface Character {
  id: string;
  name: string;
  playedBy?: string;
  /** Hex. Drives the puck colour in the blocking diagram. */
  color: string;
}

/** Normalised 0..1 coordinates so the diagram scales and exports cleanly. */
export interface Point {
  x: number;
  y: number;
}

export interface BlockingMark {
  characterId: string;
  x: number;
  y: number;
  /** Degrees. 0 = facing up-screen (away from camera), clockwise. */
  facing: number;
  /** Optional movement path. Drawn from (x,y) through each point. */
  path: Point[];
}

export interface BlockingCamera {
  x: number;
  y: number;
  /** Degrees. Direction the lens points. 0 = up-screen. */
  heading: number;
  /** Horizontal field of view in degrees. */
  fovDeg: number;
}

export interface BlockingData {
  marks: BlockingMark[];
  camera: BlockingCamera;
}

export interface SceneNode {
  id: string;
  type: NodeType;
  label: string;
  iconKey: string;
  /** Mandatory nodes are locked: cannot be deleted or renamed. */
  locked: boolean;
  /** OVERRIDE only. Empty means "resolve from crew role defaults". */
  ownerId?: string;
  participantIds: string[];
  fields: Record<string, FieldValue>;
  checklist: ChecklistItem[];
  assetIds: string[];
  notes?: string;
  /** Only present on BLOCKING nodes. */
  blocking?: BlockingData;
}

export interface Shot {
  id: string;
  /** Display label: "1A", "1B", "2". */
  label: string;
  orderIndex: number;
  description?: string;
  status: ShotStatus;
  /** CAMERA + COMPOSITION live here. */
  nodes: SceneNode[];
}

export interface Scene {
  id: string;
  sceneNumber: string;
  orderIndex: number;
  title: string;
  action?: string;
  intExt?: 'INT' | 'EXT';
  dayNight?: string;
  location?: string;
  status: SceneStatus;
  shootDay?: string;
  referenceAssetIds: string[];
  /** BLOCKING, PRODUCTION, AUDIO + any custom scene-scoped nodes. */
  nodes: SceneNode[];
  shots: Shot[];
  notes?: string;
}

export interface Project {
  id: string;
  schemaVersion: number;
  title: string;
  logline?: string;
  director?: string;
  aspectRatio?: string;
  crew: CrewMember[];
  characters: Character[];
  scenes: Scene[];
  createdAt: string;
  updatedAt: string;
}

/** Where a node lives. Needed because CAMERA/COMPOSITION sit one level deeper. */
export interface NodeAddress {
  sceneId: string;
  shotId?: string;
  nodeId: string;
}

export const SCENE_SCOPED_TYPES: NodeType[] = ['BLOCKING', 'PRODUCTION', 'AUDIO'];
export const SHOT_SCOPED_TYPES: NodeType[] = ['CAMERA', 'COMPOSITION'];

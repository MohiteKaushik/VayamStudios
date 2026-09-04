import { z } from 'zod';
import { SCHEMA_VERSION } from '../lib/types';

/**
 * Everything read back from localStorage or an imported file goes through here.
 * Corrupt data produces a recoverable error, not a white screen.
 */

const fieldValue = z.union([z.string(), z.array(z.string()), z.null()]);

const checklistItem = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

const point = z.object({ x: z.number(), y: z.number() });

const blocking = z.object({
  marks: z.array(
    z.object({
      characterId: z.string(),
      x: z.number(),
      y: z.number(),
      facing: z.number(),
      path: z.array(point).default([]),
    })
  ),
  camera: z.object({
    x: z.number(),
    y: z.number(),
    heading: z.number(),
    fovDeg: z.number(),
  }),
});

const sceneNode = z.object({
  id: z.string(),
  type: z.enum(['CAMERA', 'COMPOSITION', 'BLOCKING', 'PRODUCTION', 'AUDIO', 'CUSTOM']),
  label: z.string(),
  iconKey: z.string(),
  locked: z.boolean(),
  ownerId: z.string().optional(),
  participantIds: z.array(z.string()).default([]),
  fields: z.record(fieldValue).default({}),
  checklist: z.array(checklistItem).default([]),
  assetIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
  blocking: blocking.optional(),
});

const shot = z.object({
  id: z.string(),
  label: z.string(),
  orderIndex: z.number(),
  description: z.string().optional(),
  status: z.enum(['planned', 'ready', 'shot']).default('planned'),
  nodes: z.array(sceneNode).default([]),
});

const scene = z.object({
  id: z.string(),
  sceneNumber: z.string(),
  orderIndex: z.number(),
  title: z.string(),
  action: z.string().optional(),
  intExt: z.enum(['INT', 'EXT']).optional(),
  dayNight: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['planned', 'ready', 'shot', 'cut']).default('planned'),
  shootDay: z.string().optional(),
  referenceAssetIds: z.array(z.string()).default([]),
  nodes: z.array(sceneNode).default([]),
  shots: z.array(shot).default([]),
  notes: z.string().optional(),
});

export const projectSchema = z.object({
  id: z.string(),
  schemaVersion: z.number().default(SCHEMA_VERSION),
  title: z.string(),
  logline: z.string().optional(),
  director: z.string().optional(),
  aspectRatio: z.string().optional(),
  crew: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
        ownsNodeTypes: z
          .array(z.enum(['CAMERA', 'COMPOSITION', 'BLOCKING', 'PRODUCTION', 'AUDIO', 'CUSTOM']))
          .default([]),
      })
    )
    .default([]),
  characters: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        playedBy: z.string().optional(),
        color: z.string(),
      })
    )
    .default([]),
  scenes: z.array(scene).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workspaceSchema = z.object({
  schemaVersion: z.number(),
  projects: z.array(projectSchema),
});

export type WorkspaceShape = z.infer<typeof workspaceSchema>;

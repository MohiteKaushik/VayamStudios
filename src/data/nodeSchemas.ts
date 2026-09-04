import type { NodeType } from '../lib/types';

/**
 * Every node type declares its fields as DATA, not as a bespoke form component.
 * Adding "ND filter" to CAMERA is one line here — no new component, no migration.
 */

export type FieldKind = 'text' | 'longtext' | 'select' | 'list';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /** Rendered in IBM Plex Mono — instrument readouts, not prose. */
  mono?: boolean;
  options?: string[];
  placeholder?: string;
  /** Shown on the printable scene card. Keeps the card from bloating. */
  onCard?: boolean;
}

export interface NodeTypeDef {
  type: NodeType;
  label: string;
  iconKey: string;
  color: string;
  /** Where this node attaches in the tree. */
  scope: 'scene' | 'shot';
  blurb: string;
  fields: FieldDef[];
  hasChecklist?: boolean;
}

export const SHOT_SIZES = [
  'Extreme Wide',
  'Wide',
  'Medium Wide',
  'Medium',
  'Medium Close',
  'Close-Up',
  'Extreme Close-Up',
  'Over the Shoulder',
  'Two Shot',
  'Insert',
];

export const ANGLES = [
  'Eye Level',
  'Low Angle',
  'High Angle',
  "Bird's Eye",
  'Dutch',
  'Worm Level',
];

export const MOVEMENTS = [
  'Static',
  'Pan',
  'Tilt',
  'Push In',
  'Pull Out',
  'Track Left',
  'Track Right',
  'Handheld Follow',
  'Crane Up',
  'Whip Pan',
];

export const NODE_TYPES: Record<NodeType, NodeTypeDef> = {
  CAMERA: {
    type: 'CAMERA',
    label: 'Camera',
    iconKey: 'camera',
    color: '#E8B04B',
    scope: 'shot',
    blurb: 'What the camera is and how it is set.',
    fields: [
      { key: 'body', label: 'Camera body', kind: 'text', placeholder: 'Sony FX3', onCard: true },
      { key: 'lens', label: 'Lens', kind: 'text', placeholder: 'Sigma 24-70 f/2.8' },
      { key: 'focalLength', label: 'Focal length', kind: 'text', mono: true, placeholder: '35mm', onCard: true },
      { key: 'fps', label: 'Frame rate', kind: 'text', mono: true, placeholder: '24', onCard: true },
      { key: 'resolution', label: 'Resolution', kind: 'text', mono: true, placeholder: '4K DCI' },
      { key: 'shutter', label: 'Shutter', kind: 'text', mono: true, placeholder: '1/48' },
      { key: 'aperture', label: 'Aperture', kind: 'text', mono: true, placeholder: 'f/2.8', onCard: true },
      { key: 'iso', label: 'ISO', kind: 'text', mono: true, placeholder: '800' },
      { key: 'whiteBalance', label: 'White balance', kind: 'text', mono: true, placeholder: '5600K' },
      { key: 'focus', label: 'Focus', kind: 'text', placeholder: 'Pull from Friend to Hero' },
      { key: 'stabilization', label: 'Stabilisation', kind: 'text', placeholder: 'IBIS off' },
      {
        key: 'support',
        label: 'Camera support',
        kind: 'select',
        options: ['Tripod', 'Gimbal', 'Handheld', 'Slider', 'Shoulder rig', 'Dolly', 'Crane', 'Static mount'],
        onCard: true,
      },
    ],
  },

  COMPOSITION: {
    type: 'COMPOSITION',
    label: 'Composition',
    iconKey: 'frame',
    color: '#5FB8C9',
    scope: 'shot',
    blurb: 'What the frame looks like and how it moves.',
    fields: [
      { key: 'shotSize', label: 'Shot size', kind: 'select', options: SHOT_SIZES, onCard: true },
      { key: 'angle', label: 'Camera angle', kind: 'select', options: ANGLES, onCard: true },
      {
        key: 'height',
        label: 'Camera height',
        kind: 'select',
        options: ['Ground', 'Knee', 'Waist', 'Chest', 'Eye level', 'Overhead'],
      },
      { key: 'position', label: 'Camera position', kind: 'text', placeholder: 'Camera-left of the doorway' },
      { key: 'movement', label: 'Movement', kind: 'select', options: MOVEMENTS, onCard: true },
      { key: 'framing', label: 'Framing', kind: 'longtext', placeholder: 'Hero enters frame left, holds at third line.', onCard: true },
      { key: 'headroom', label: 'Headroom / lead room', kind: 'text', placeholder: 'Tight headroom, lead room camera-right' },
      { key: 'notes', label: 'Composition notes', kind: 'longtext' },
    ],
  },

  BLOCKING: {
    type: 'BLOCKING',
    label: 'Blocking',
    iconKey: 'footprints',
    color: '#B487D4',
    scope: 'scene',
    blurb: 'Where people stand and how they move.',
    fields: [
      { key: 'summary', label: 'Movement summary', kind: 'longtext', placeholder: 'Hero crosses from the bus stop to Friend at the railing.', onCard: true },
      { key: 'distance', label: 'Key distance', kind: 'text', placeholder: 'Approx. 2 m at the end of the move' },
      { key: 'entrances', label: 'Entrances / exits', kind: 'longtext', placeholder: 'Hero enters camera-left. Nobody exits.' },
      { key: 'eyelines', label: 'Eyelines', kind: 'longtext', placeholder: 'Hero looks camera-right past the lens.' },
      { key: 'rehearsal', label: 'Rehearsal notes', kind: 'longtext' },
    ],
  },

  PRODUCTION: {
    type: 'PRODUCTION',
    label: 'Production',
    iconKey: 'lightbulb',
    color: '#7FBF6A',
    scope: 'scene',
    blurb: 'Everything physical that has to be on set.',
    hasChecklist: true,
    fields: [
      { key: 'lighting', label: 'Lighting', kind: 'longtext', placeholder: 'Soft key camera-left through diffusion, bounce fill.', onCard: true },
      { key: 'props', label: 'Props', kind: 'list', onCard: true },
      { key: 'equipment', label: 'Equipment', kind: 'list', onCard: true },
      { key: 'set', label: 'Set requirements', kind: 'longtext', placeholder: 'Clear the bench. Wet down the pavement.' },
      { key: 'vfx', label: 'VFX', kind: 'longtext', placeholder: 'None' },
      { key: 'practical', label: 'Practical effects', kind: 'longtext', placeholder: 'Haze for backlight' },
      { key: 'costume', label: 'Costume / makeup', kind: 'longtext' },
      { key: 'safety', label: 'Safety', kind: 'longtext', placeholder: 'Traffic marshal on the kerb.' },
    ],
  },

  AUDIO: {
    type: 'AUDIO',
    label: 'Audio',
    iconKey: 'mic',
    color: '#E27A6B',
    scope: 'scene',
    blurb: 'What is recorded and how.',
    hasChecklist: true,
    fields: [
      {
        key: 'mic',
        label: 'Microphone',
        kind: 'select',
        options: ['Boom', 'Lavalier', 'Boom + Lav', 'Shotgun on camera', 'Plant mic', 'None — MOS'],
        onCard: true,
      },
      { key: 'recorder', label: 'Recorder', kind: 'text', placeholder: 'Zoom F6' },
      { key: 'micPosition', label: 'Mic position', kind: 'text', placeholder: 'Overhead, angled at Hero', onCard: true },
      { key: 'dialogue', label: 'Dialogue', kind: 'longtext', placeholder: 'HERO: "Where were you?"', onCard: true },
      { key: 'ambient', label: 'Ambient sound', kind: 'longtext', placeholder: 'Street traffic, distant train', onCard: true },
      { key: 'foley', label: 'Foley to capture', kind: 'list' },
      { key: 'sfx', label: 'Sound effects', kind: 'list' },
      { key: 'roomTone', label: 'Room tone', kind: 'text', placeholder: 'Record 30 s after last take' },
      { key: 'hazards', label: 'Noise hazards', kind: 'longtext', placeholder: 'Flight path overhead, 4-minute gaps' },
    ],
  },

  CUSTOM: {
    type: 'CUSTOM',
    label: 'Custom',
    iconKey: 'sparkles',
    color: '#9AA5B1',
    scope: 'scene',
    blurb: 'Anything this scene needs that the standard nodes do not cover.',
    hasChecklist: true,
    fields: [
      { key: 'description', label: 'Description', kind: 'longtext', onCard: true },
      { key: 'requirements', label: 'Requirements', kind: 'list', onCard: true },
    ],
  },
};

/** Fixed icon set for custom nodes. No arbitrary uploads. */
export const ICON_CHOICES = [
  'sparkles',
  'wand',
  'shirt',
  'package',
  'shield',
  'flame',
  'droplets',
  'zap',
  'clapperboard',
  'eye',
  'car',
  'dog',
  'utensils',
  'clock',
  'map',
  'wrench',
] as const;

export const CUSTOM_PRESETS: { label: string; iconKey: string }[] = [
  { label: 'Lighting', iconKey: 'zap' },
  { label: 'VFX', iconKey: 'wand' },
  { label: 'Costume', iconKey: 'shirt' },
  { label: 'Props', iconKey: 'package' },
  { label: 'Continuity', iconKey: 'eye' },
  { label: 'Safety', iconKey: 'shield' },
  { label: 'Special effects', iconKey: 'flame' },
  { label: 'Vehicles', iconKey: 'car' },
  { label: 'Animals', iconKey: 'dog' },
  { label: 'Catering', iconKey: 'utensils' },
];

export const STATUS_META: Record<string, { label: string; color: string }> = {
  planned: { label: 'Planned', color: '#8A96A3' },
  ready: { label: 'Ready to shoot', color: '#E8B04B' },
  shot: { label: 'Shot', color: '#7FBF6A' },
  cut: { label: 'Cut', color: '#E0453A' },
};

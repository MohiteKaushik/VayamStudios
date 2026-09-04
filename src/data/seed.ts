import { uid } from '../lib/id';
import { makeNode, makeShot } from '../lib/factory';
import { SCHEMA_VERSION } from '../lib/types';
import type { Project, Scene, SceneNode, Shot } from '../lib/types';

/**
 * Sample film. Deliberately not a toy: it has an eight-setup dialogue scene,
 * an MOS scene, and a scene with a custom node — the three shapes that break
 * naive data models.
 */

function n(node: SceneNode, fields: Record<string, string | string[]>): SceneNode {
  return { ...node, fields: { ...node.fields, ...fields } };
}

function shot(
  label: string,
  order: number,
  description: string,
  camera: Record<string, string>,
  comp: Record<string, string>,
  status: Shot['status'] = 'planned'
): Shot {
  const s = makeShot(label, order);
  return {
    ...s,
    description,
    status,
    nodes: s.nodes.map((node) =>
      node.type === 'CAMERA' ? n(node, camera) : n(node, comp)
    ),
  };
}

export function buildSampleProject(): Project {
  const crew = [
    { id: uid('crew'), name: 'Meera Krishnan', role: 'Director', ownsNodeTypes: ['BLOCKING' as const] },
    { id: uid('crew'), name: 'Rahul Varghese', role: 'Cinematographer', ownsNodeTypes: ['CAMERA' as const, 'COMPOSITION' as const] },
    { id: uid('crew'), name: 'Sandeep Nair', role: 'Production designer', ownsNodeTypes: ['PRODUCTION' as const] },
    { id: uid('crew'), name: 'Aisha Rahman', role: 'Sound recordist', ownsNodeTypes: ['AUDIO' as const] },
    { id: uid('crew'), name: 'Tom Beckett', role: 'First AD', ownsNodeTypes: [] },
  ];

  const characters = [
    { id: uid('char'), name: 'Arun', playedBy: 'Vikram Das', color: '#E8B04B' },
    { id: uid('char'), name: 'Leela', playedBy: 'Nadia Sen', color: '#5FB8C9' },
    { id: uid('char'), name: 'Bus conductor', playedBy: 'Extra', color: '#7FBF6A' },
  ];

  const [arun, leela] = characters;

  const scenes: Scene[] = [];

  // ---------- SCENE 1 ----------
  {
    const sceneNodes = [
      n(makeNode('BLOCKING'), {
        summary:
          'Arun waits at the shelter, checking his phone. He sees Leela across the road, pockets the phone, and crosses to the near kerb as the bus pulls away.',
        distance: 'Ends approx. 2 m apart, Arun camera-left',
        entrances: 'Arun already in frame at the top. Leela enters camera-right on action.',
        eyelines: 'Arun looks camera-right past the lens. Leela holds her eyeline low.',
      }),
      n(makeNode('PRODUCTION'), {
        lighting:
          'Available light, overcast. 4x4 ultrabounce camera-left to lift Arun\u2019s face. No hard sources.',
        props: ['Phone (cracked screen)', 'Canvas satchel', 'Bus ticket'],
        equipment: ['4x4 ultrabounce + stand', 'Sandbags x4', 'Traffic cones x6'],
        set: 'Clear the shelter of real commuters between takes. Rain the pavement for sheen.',
        safety: 'Live road. Marshal on the kerb at all times. No takes during the school run.',
      }),
      n(makeNode('AUDIO'), {
        mic: 'Boom + Lav',
        recorder: 'Zoom F6',
        micPosition: 'Overhead boom favouring Arun. Lav on Leela under the collar.',
        dialogue: 'ARUN: "You said Thursday."\nLEELA: "I said maybe Thursday."',
        ambient: 'Traffic, a distant train horn every few minutes',
        roomTone: 'Record 30 s of the street with everyone still, after the last take',
        hazards: 'Bus route runs every 8 minutes. Time takes between them.',
        foley: ['Footsteps on wet pavement', 'Satchel buckle'],
      }),
    ];

    // Eight setups. This is the case that breaks one-camera-node-per-scene.
    const shots: Shot[] = [
      shot('A', 0, 'Wide master, both in frame, bus passes',
        { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '24mm', fps: '24', aperture: 'f/4', iso: '640', shutter: '1/48', support: 'Tripod', resolution: '4K DCI' },
        { shotSize: 'Wide', angle: 'Eye Level', height: 'Chest', movement: 'Static', framing: 'Shelter camera-left, Leela\u2019s side of the road camera-right. Bus wipes frame at the top.' },
        'shot'),
      shot('B', 1, 'Medium on Arun waiting',
        { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '70mm', fps: '24', aperture: 'f/2.8', iso: '640', support: 'Tripod' },
        { shotSize: 'Medium', angle: 'Eye Level', height: 'Eye level', movement: 'Static', framing: 'Arun frame-right, shelter glass behind. Lead room camera-left.' },
        'shot'),
      shot('C', 2, 'Arun\u2019s POV of Leela across the road',
        { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '50mm', fps: '24', aperture: 'f/2.8', iso: '640', support: 'Handheld', stabilization: 'IBIS on, slight sway wanted' },
        { shotSize: 'Medium Wide', angle: 'Eye Level', movement: 'Handheld Follow', framing: 'Leela centred, traffic crossing the foreground.' }),
      shot('D', 3, 'Insert: cracked phone screen',
        { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '70mm', fps: '24', aperture: 'f/4', iso: '800', focus: 'Locked on screen', support: 'Handheld' },
        { shotSize: 'Insert', angle: 'High Angle', movement: 'Static', framing: 'Phone fills frame. Watch for reflections \u2014 flag overhead.' }),
      shot('E', 4, 'Tracking shot: Arun crosses the road',
        { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '35mm', fps: '24', aperture: 'f/2.8', iso: '640', support: 'Gimbal' },
        { shotSize: 'Medium Wide', angle: 'Eye Level', height: 'Chest', movement: 'Track Left', framing: 'Hold Arun frame-right through the cross. Do not lose the shelter.' }),
      shot('F', 5, 'Two shot, the meeting',
        { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '35mm', fps: '24', aperture: 'f/2.8', iso: '640', support: 'Tripod' },
        { shotSize: 'Two Shot', angle: 'Eye Level', movement: 'Push In', framing: 'Both in profile, negative space camera-right for the traffic.' }),
      shot('G', 6, 'OTS on Leela',
        { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '70mm', fps: '24', aperture: 'f/2.8', iso: '640', support: 'Tripod' },
        { shotSize: 'Over the Shoulder', angle: 'Eye Level', movement: 'Static', framing: 'Arun\u2019s shoulder camera-left, soft. Leela on the right third.' }),
      shot('H', 7, 'OTS on Arun \u2014 reverse, match G',
        { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '70mm', fps: '24', aperture: 'f/2.8', iso: '640', support: 'Tripod' },
        { shotSize: 'Over the Shoulder', angle: 'Eye Level', movement: 'Static', framing: 'Mirror of G. Keep camera on the same side of the line.' }),
    ];

    const blockingNode = sceneNodes[0];
    blockingNode.blocking = {
      marks: [
        { characterId: arun.id, x: 0.22, y: 0.62, facing: 75, path: [{ x: 0.42, y: 0.55 }, { x: 0.58, y: 0.5 }] },
        { characterId: leela.id, x: 0.72, y: 0.46, facing: 250, path: [] },
      ],
      camera: { x: 0.5, y: 0.92, heading: 0, fovDeg: 74 },
    };
    blockingNode.participantIds = [arun.id, leela.id];

    scenes.push({
      id: uid('scene'),
      sceneNumber: '1',
      orderIndex: 0,
      title: 'The bus shelter',
      action: 'Arun waits for a bus he has no intention of catching. Leela is already across the road.',
      intExt: 'EXT',
      dayNight: 'Day',
      location: 'Fort Kochi \u2014 Napier Street bus shelter',
      status: 'ready',
      shootDay: 'Day 1',
      referenceAssetIds: [],
      nodes: sceneNodes,
      shots,
      notes: 'Golden hour is not available here \u2014 the building opposite blocks it. Shoot flat and grade cooler.',
    });
  }

  // ---------- SCENE 2 ----------
  {
    const sceneNodes = [
      n(makeNode('BLOCKING'), {
        summary: 'Leela stays seated at the window table. Arun stands, sits, stands again. He never gets past the third chair.',
        distance: 'Table is 900 mm across. Arun stops 1.5 m short of it.',
        eyelines: 'Leela never looks up until the last line.',
      }),
      n(makeNode('PRODUCTION'), {
        lighting: 'Practical window light key. 1x1 LED bounced off the ceiling for fill. Kill the overhead fluorescents \u2014 they flicker at 24 fps.',
        props: ['Two glasses of chai', 'Newspaper', 'Leela\u2019s notebook'],
        equipment: ['1x1 LED panel', 'C-stand', 'Poly bounce', 'Gaffer tape'],
        set: 'Café closes to public 07:00\u201311:00. Dress the two background tables only.',
        costume: 'Arun in the same shirt as Scene 1 \u2014 continuity.',
      }),
      n(makeNode('AUDIO'), {
        mic: 'Boom',
        recorder: 'Zoom F6',
        micPosition: 'Boom from camera-left, low, angled up \u2014 ceiling is too low for overhead.',
        dialogue: 'LEELA: "Sit down or leave. Pick one."',
        ambient: 'Ceiling fan, espresso machine, street muffled through glass',
        roomTone: 'Record 30 s with the fan running',
        hazards: 'Espresso machine is loud. Ask them to hold during takes.',
      }),
    ];
    sceneNodes[0].blocking = {
      marks: [
        { characterId: leela.id, x: 0.66, y: 0.36, facing: 200, path: [] },
        { characterId: arun.id, x: 0.34, y: 0.68, facing: 40, path: [{ x: 0.42, y: 0.55 }] },
      ],
      camera: { x: 0.14, y: 0.86, heading: 42, fovDeg: 46 },
    };
    sceneNodes[0].participantIds = [arun.id, leela.id];

    scenes.push({
      id: uid('scene'),
      sceneNumber: '2',
      orderIndex: 1,
      title: 'Café, second table from the window',
      action: 'The conversation they have both been avoiding. It lasts ninety seconds.',
      intExt: 'INT',
      dayNight: 'Morning',
      location: 'Kashi Art Café',
      status: 'planned',
      shootDay: 'Day 2',
      referenceAssetIds: [],
      nodes: sceneNodes,
      shots: [
        shot('A', 0, 'Master two shot from the door',
          { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '35mm', fps: '24', aperture: 'f/2.8', iso: '1250', whiteBalance: '4300K', support: 'Tripod' },
          { shotSize: 'Two Shot', angle: 'Eye Level', height: 'Chest', movement: 'Static', framing: 'Window blown out behind. Let it clip \u2014 it reads as morning.' }),
        shot('B', 1, 'Clean single on Leela',
          { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '70mm', fps: '24', aperture: 'f/2.8', iso: '1250', support: 'Tripod' },
          { shotSize: 'Medium Close', angle: 'Eye Level', movement: 'Push In', framing: 'Slow push over the length of her last speech.' }),
        shot('C', 2, 'Clean single on Arun, standing',
          { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '50mm', fps: '24', aperture: 'f/2.8', iso: '1250', support: 'Tripod' },
          { shotSize: 'Medium', angle: 'Low Angle', height: 'Chest', movement: 'Static', framing: 'Slight low angle \u2014 he has the height and none of the power.' }),
      ],
    });
  }

  // ---------- SCENE 3 ----------
  {
    const sceneNodes = [
      n(makeNode('BLOCKING'), {
        summary: 'Arun alone. Walks the length of the jetty and stops at the far bollard. No dialogue.',
        entrances: 'Enters frame-left at the top of the shot.',
      }),
      n(makeNode('PRODUCTION'), {
        lighting: 'Magic hour only. We get about 22 minutes. No lights \u2014 nothing to plug into.',
        props: ['Satchel', 'Bus ticket (same one, torn)'],
        equipment: ['ND filters', 'Spare batteries x4', 'Head torches'],
        safety: 'Unlit jetty, wet stone. Everyone off the edge by full dark.',
      }),
      n(makeNode('AUDIO'), {
        mic: 'None \u2014 MOS',
        ambient: 'Water, rigging, gulls \u2014 record as wild track after picture',
        roomTone: 'Wild track 2 min of the jetty',
        hazards: 'Wind on the mic. Use the blimp.',
        foley: ['Footsteps on wet stone', 'Ticket tearing'],
      }),
      n(makeNode('CUSTOM', 'Continuity', 'eye'), {
        description:
          'The ticket must already be torn here, and intact in Scene 1. Shoot the tear in Scene 4 pickup and stills-reference both states before wrap.',
        requirements: ['Reference stills of torn + intact ticket', 'Shirt condition log', 'Satchel strap position'],
      }),
    ];
    sceneNodes[0].blocking = {
      marks: [{ characterId: arun.id, x: 0.2, y: 0.5, facing: 90, path: [{ x: 0.5, y: 0.5 }, { x: 0.78, y: 0.48 }] }],
      camera: { x: 0.08, y: 0.78, heading: 55, fovDeg: 63 },
    };
    sceneNodes[0].participantIds = [arun.id];
    sceneNodes[3].checklist = [
      { id: uid('ck'), text: 'Photograph the ticket in both states', done: false },
      { id: uid('ck'), text: 'Log shirt creasing against Scene 2', done: false },
    ];

    scenes.push({
      id: uid('scene'),
      sceneNumber: '3',
      orderIndex: 2,
      title: 'Jetty, magic hour',
      action: 'Arun walks out to the end and does not turn around.',
      intExt: 'EXT',
      dayNight: 'Dusk',
      location: 'Vypin ferry jetty',
      status: 'planned',
      shootDay: 'Day 2',
      referenceAssetIds: [],
      nodes: sceneNodes,
      shots: [
        shot('A', 0, 'Long lens profile of the walk',
          { body: 'Sony FX3', lens: 'Sigma 24-70 f/2.8', focalLength: '70mm', fps: '24', aperture: 'f/2.8', iso: '2000', shutter: '1/48', support: 'Tripod', focus: 'Follow focus through the walk' },
          { shotSize: 'Wide', angle: 'Eye Level', movement: 'Pan', framing: 'Water compressed behind him. Let him walk out of the frame on the last beat.' }),
      ],
    });
  }

  // ---------- SCENE 4 ----------
  {
    const sceneNodes = [
      n(makeNode('BLOCKING'), {
        summary: 'Hands only. The ticket is torn, once, and dropped.',
        distance: 'Hands 400 mm from the lens.',
      }),
      n(makeNode('PRODUCTION'), {
        lighting: 'Single LED through a shower curtain, camera-left. Black cloth behind.',
        props: ['Bus tickets x8 \u2014 we will need takes'],
        equipment: ['1x1 LED', 'Black duvetyne', 'Small table'],
        set: 'Any interior. Shoot this last, anywhere.',
      }),
      n(makeNode('AUDIO'), {
        mic: 'Boom',
        micPosition: 'Very close, just out of frame above the hands',
        ambient: 'None \u2014 want it dead',
        foley: ['Paper tear \u2014 record at least 6 variants'],
        roomTone: 'Record 30 s',
      }),
    ];
    sceneNodes[0].blocking = {
      marks: [{ characterId: arun.id, x: 0.5, y: 0.42, facing: 180, path: [] }],
      camera: { x: 0.5, y: 0.86, heading: 0, fovDeg: 32 },
    };
    sceneNodes[0].participantIds = [arun.id];

    scenes.push({
      id: uid('scene'),
      sceneNumber: '4',
      orderIndex: 3,
      title: 'Insert \u2014 the ticket',
      action: 'Macro insert. Cuts into Scene 3.',
      intExt: 'INT',
      dayNight: 'Any',
      location: 'Unit base',
      status: 'planned',
      shootDay: 'Day 3',
      referenceAssetIds: [],
      nodes: sceneNodes,
      shots: [
        shot('A', 0, 'Macro on the hands',
          { body: 'Sony FX3', lens: 'Laowa 100mm macro', focalLength: '100mm', fps: '48', aperture: 'f/5.6', iso: '400', resolution: '4K DCI', focus: 'Manual, locked. Rock the subject, not the lens.', support: 'Tripod' },
          { shotSize: 'Extreme Close-Up', angle: 'High Angle', movement: 'Static', framing: 'Hands enter from the bottom. Nothing else in frame.' }),
      ],
      notes: 'Shot at 48 fps for a half-speed option in the edit.',
    });
  }

  const now = new Date().toISOString();
  return {
    id: uid('proj'),
    schemaVersion: SCHEMA_VERSION,
    title: 'Napier Street',
    logline: 'A man waits at a bus shelter for a conversation he has been putting off for four years.',
    director: 'Meera Krishnan',
    aspectRatio: '2.39:1',
    crew,
    characters,
    scenes,
    createdAt: now,
    updatedAt: now,
  };
}

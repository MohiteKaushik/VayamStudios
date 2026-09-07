import type { Character, CrewMember, Scene, SceneNode, Shot } from './types';

/**
 * Who is involved in what.
 *
 * Relevance is derived, never stored twice. A person matters to a shot when any
 * of three things is true:
 *
 *   1. they are explicitly assigned to it        (Shot.assignedCrewIds)
 *   2. they are named on one of its nodes        (SceneNode.ownerId override)
 *   3. their crew role owns one of its node types (CrewMember.ownsNodeTypes)
 *
 * Rule 3 is why the cinematographer lights up almost everywhere — they own
 * CAMERA and COMPOSITION, and every setup has both. That is correct, not a bug:
 * the DP really is on every setup. The filter earns its keep for people who own
 * no node type, like a gaffer, who then appear only where actually assigned.
 */

export type PersonKind = 'crew' | 'character';

export interface Person {
  id: string;
  kind: PersonKind;
  name: string;
  /** "Cinematographer", or the actor's name for a character. */
  role: string;
}

export function listPeople(crew: CrewMember[], characters: Character[]): Person[] {
  return [
    ...crew.map((c) => ({ id: c.id, kind: 'crew' as const, name: c.name, role: c.role })),
    ...characters.map((c) => ({
      id: c.id,
      kind: 'character' as const,
      name: c.name,
      role: c.playedBy ?? 'Character',
    })),
  ].filter((p) => p.name.trim() !== '');
}

/** Mirrors resolveOwner's precedence, but returns the id rather than a label. */
function ownerIdOf(node: SceneNode, crew: CrewMember[]): string | undefined {
  if (node.ownerId && crew.some((c) => c.id === node.ownerId)) return node.ownerId;
  return crew.find((c) => c.ownsNodeTypes.includes(node.type))?.id;
}

function crewOnNodes(nodes: SceneNode[], crewId: string, crew: CrewMember[]): boolean {
  return nodes.some((n) => ownerIdOf(n, crew) === crewId);
}

function characterOnNodes(nodes: SceneNode[], charId: string): boolean {
  return nodes.some(
    (n) =>
      n.participantIds.includes(charId) ||
      (n.blocking?.marks.some((m) => m.characterId === charId) ?? false)
  );
}

export function isShotRelevant(shot: Shot, person: Person, crew: CrewMember[]): boolean {
  if (person.kind === 'character') return characterOnNodes(shot.nodes, person.id);
  return shot.assignedCrewIds.includes(person.id) || crewOnNodes(shot.nodes, person.id, crew);
}

/**
 * A scene counts when the person is on the scene itself or on any of its shots —
 * otherwise a gaffer assigned to one setup would see the setup highlighted
 * inside a scene that reads as irrelevant.
 */
export function isSceneRelevant(scene: Scene, person: Person, crew: CrewMember[]): boolean {
  const onScene =
    person.kind === 'character'
      ? characterOnNodes(scene.nodes, person.id)
      : scene.assignedCrewIds.includes(person.id) || crewOnNodes(scene.nodes, person.id, crew);

  return onScene || scene.shots.some((s) => isShotRelevant(s, person, crew));
}

/** Counts scenes and shots a person touches. Drives the filter's summary line. */
export function relevanceCount(
  scenes: Scene[],
  person: Person,
  crew: CrewMember[]
): { scenes: number; shots: number } {
  let sceneCount = 0;
  let shotCount = 0;
  for (const scene of scenes) {
    if (isSceneRelevant(scene, person, crew)) sceneCount += 1;
    for (const shot of scene.shots) {
      if (isShotRelevant(shot, person, crew)) shotCount += 1;
    }
  }
  return { scenes: sceneCount, shots: shotCount };
}

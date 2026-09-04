import type { CrewMember, NodeType, SceneNode } from './types';

export interface ResolvedOwner {
  name: string;
  role: string;
  /** true when this came from the crew role default rather than a per-node override. */
  inherited: boolean;
}

/**
 * Per-node owner is an OVERRIDE. Most of the time the DP owns every CAMERA node
 * in the film, so we resolve from crew role defaults instead of making the
 * director retype it 24 times.
 */
export function resolveOwner(node: SceneNode, crew: CrewMember[]): ResolvedOwner | null {
  if (node.ownerId) {
    const m = crew.find((c) => c.id === node.ownerId);
    if (m) return { name: m.name, role: m.role, inherited: false };
  }
  const byRole = crew.find((c) => c.ownsNodeTypes.includes(node.type as NodeType));
  if (byRole) return { name: byRole.name, role: byRole.role, inherited: true };
  return null;
}

export function crewById(crew: CrewMember[], id?: string): CrewMember | undefined {
  return id ? crew.find((c) => c.id === id) : undefined;
}

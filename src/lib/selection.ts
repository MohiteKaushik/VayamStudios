/**
 * What the detail panel is currently showing. Lives here rather than inside a
 * view component so the flow, the panel and the workspace can all agree on it
 * without importing each other.
 */
export interface Selection {
  kind: 'scene' | 'shot' | 'node';
  id: string;
  /** Set when the node is shot-scoped, so it can be found one level down. */
  shotId?: string;
}

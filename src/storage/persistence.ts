import type { Project } from '../lib/types';
import { SCHEMA_VERSION } from '../lib/types';
import { workspaceSchema } from './schema';
import { migrate } from './migrations';
import { getAssetDataUrl, putAssetWithId } from './assets';

/**
 * Single facade for all project persistence.
 *
 * Every function is async even where it need not be, so a network backend can
 * be dropped in behind this interface with zero call-site changes.
 */

const KEY = 'vsb.workspace.v1';

export interface LoadResult {
  projects: Project[];
  /** Set when stored data existed but failed validation. */
  error?: string;
  /** Raw text preserved so the user can still recover it by hand. */
  raw?: string;
}

export async function loadWorkspace(): Promise<LoadResult> {
  let text: string | null = null;
  try {
    text = localStorage.getItem(KEY);
  } catch {
    return { projects: [], error: 'This browser is blocking local storage. Plans will not be saved.' };
  }
  if (!text) return { projects: [] };

  try {
    const parsed = migrate(JSON.parse(text));
    const result = workspaceSchema.safeParse(parsed);
    if (!result.success) {
      return {
        projects: [],
        error: 'The saved plan could not be read. Download the raw file below before starting over.',
        raw: text,
      };
    }
    return { projects: result.data.projects as Project[] };
  } catch {
    return { projects: [], error: 'The saved plan is not readable JSON.', raw: text };
  }
}

export async function saveWorkspace(projects: Project[]): Promise<{ ok: boolean; error?: string }> {
  try {
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, projects }));
    return { ok: true };
  } catch (e) {
    const quota = e instanceof DOMException && e.name === 'QuotaExceededError';
    return {
      ok: false,
      error: quota
        ? 'Local storage is full. Export your project file, then remove an old project.'
        : 'Could not save to this browser.',
    };
  }
}

/**
 * Project file export. Images are inlined as data URLs so the file is a single
 * self-contained artifact — a real backup, not a pointer to a browser that may
 * get cleared tomorrow.
 */
export async function exportProjectFile(project: Project): Promise<Blob> {
  const ids = collectAssetIds(project);
  const assets: Record<string, string> = {};
  for (const id of ids) {
    const data = await getAssetDataUrl(id);
    if (data) assets[id] = data;
  }
  const doc = { kind: 'vsb-project', schemaVersion: SCHEMA_VERSION, project, assets };
  return new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
}

export async function importProjectFile(text: string): Promise<Project> {
  const doc = JSON.parse(text) as { project?: unknown; assets?: Record<string, string> };
  const candidate = migrate((doc.project ?? doc) as Record<string, unknown>);
  const wrapped = workspaceSchema.safeParse({
    schemaVersion: SCHEMA_VERSION,
    projects: [candidate],
  });
  if (!wrapped.success) throw new Error('That file is not a Visual Shooting Blueprint project.');

  if (doc.assets) {
    for (const [assetId, dataUrl] of Object.entries(doc.assets)) {
      const blob = await (await fetch(dataUrl)).blob();
      await putAssetWithId(assetId, blob);
    }
  }
  return wrapped.data.projects[0] as Project;
}

export function collectAssetIds(project: Project): string[] {
  const out = new Set<string>();
  for (const scene of project.scenes) {
    scene.referenceAssetIds.forEach((a) => out.add(a));
    scene.nodes.forEach((n) => n.assetIds.forEach((a) => out.add(a)));
    scene.shots.forEach((s) => s.nodes.forEach((n) => n.assetIds.forEach((a) => out.add(a))));
  }
  return [...out];
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

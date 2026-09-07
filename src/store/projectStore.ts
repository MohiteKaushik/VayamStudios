import { create } from 'zustand';
import type {
  Character,
  CrewMember,
  FieldValue,
  NodeType,
  Project,
  ParallelBranch,
  Scene,
  SceneNode,
  Shot,
} from '../lib/types';
import { SCHEMA_VERSION } from '../lib/types';
import { ensureMandatory, makeNode, makeScene, makeShot, nextShotLabel } from '../lib/factory';
import { buildSampleProject } from '../data/seed';
import { loadWorkspace, saveWorkspace } from '../storage/persistence';
import { uid } from '../lib/id';

interface State {
  projects: Project[];
  ready: boolean;
  loadError?: string;
  loadRaw?: string;
  saveError?: string;

  /**
   * Which person the crew filter is set to, or null for everyone. UI state, not
   * project data: it lives here so the choice survives moving between the film
   * overview and a scene, and it is deliberately outside `projects` so it is
   * never written to storage.
   */
  personFilterId: string | null;
  setPersonFilter: (id: string | null) => void;

  init: () => Promise<void>;
  addSampleProject: () => string;
  addProject: (title: string) => string;
  replaceProject: (p: Project) => void;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  updateScene: (projectId: string, sceneId: string, patch: Partial<Scene>) => void;
  addScene: (projectId: string) => string;
  duplicateScene: (projectId: string, sceneId: string) => string;
  moveScene: (projectId: string, sceneId: string, delta: -1 | 1) => void;
  deleteScene: (projectId: string, sceneId: string) => void;

  addShot: (projectId: string, sceneId: string) => string;
  updateShot: (projectId: string, sceneId: string, shotId: string, patch: Partial<Shot>) => void;
  duplicateShot: (projectId: string, sceneId: string, shotId: string) => string;
  moveShot: (projectId: string, sceneId: string, shotId: string, delta: -1 | 1) => void;
  deleteShot: (projectId: string, sceneId: string, shotId: string) => void;

  makeParallel: (projectId: string, sceneId: string) => void;
  updateParallel: (projectId: string, sceneId: string, patch: Partial<ParallelBranch>) => void;
  clearParallel: (projectId: string, sceneId: string) => void;

  updateNode: (
    projectId: string,
    sceneId: string,
    nodeId: string,
    patch: Partial<SceneNode>
  ) => void;
  setNodeField: (
    projectId: string,
    sceneId: string,
    nodeId: string,
    key: string,
    value: FieldValue
  ) => void;
  addCustomNode: (projectId: string, sceneId: string, label: string, iconKey: string) => string;
  deleteNode: (projectId: string, sceneId: string, nodeId: string) => void;

  addCharacter: (projectId: string, name: string) => string;
  updateCharacter: (projectId: string, charId: string, patch: Partial<Character>) => void;
  deleteCharacter: (projectId: string, charId: string) => void;

  addCrew: (projectId: string, name: string, role: string) => string;
  updateCrew: (projectId: string, crewId: string, patch: Partial<CrewMember>) => void;
  deleteCrew: (projectId: string, crewId: string) => void;
}

const PUCK_COLORS = ['#E8B04B', '#5FB8C9', '#B487D4', '#7FBF6A', '#E27A6B', '#D9A5C7', '#8FA9E8'];

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(get: () => State, set: (p: Partial<State>) => void) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const res = await saveWorkspace(get().projects);
    set({ saveError: res.ok ? undefined : res.error });
  }, 400);
}

/** Applies a patch to a node wherever it lives — scene-scoped or inside a shot. */
function patchNodeInScene(scene: Scene, nodeId: string, fn: (n: SceneNode) => SceneNode): Scene {
  let hit = false;
  const nodes = scene.nodes.map((n) => {
    if (n.id !== nodeId) return n;
    hit = true;
    return fn(n);
  });
  if (hit) return { ...scene, nodes };
  return {
    ...scene,
    shots: scene.shots.map((s) => ({
      ...s,
      nodes: s.nodes.map((n) => (n.id === nodeId ? fn(n) : n)),
    })),
  };
}

/** Applies fn to every node in a scene — scene-scoped and shot-scoped alike. */
function mapSceneNodes(scene: Scene, fn: (n: SceneNode) => SceneNode): Scene {
  return {
    ...scene,
    nodes: scene.nodes.map(fn),
    shots: scene.shots.map((s) => ({ ...s, nodes: s.nodes.map(fn) })),
  };
}

/** Rewrites orderIndex to match array position. Call after any insert or removal. */
function reindex(scenes: Scene[]): Scene[] {
  return scenes.map((s, i) => (s.orderIndex === i ? s : { ...s, orderIndex: i }));
}

/** The same, for the shots inside one scene. */
function reindexShots(shots: Shot[]): Shot[] {
  return shots.map((s, i) => (s.orderIndex === i ? s : { ...s, orderIndex: i }));
}

/**
 * Fresh ids for the copy — node, shot and checklist ids must not collide, or
 * patchNodeInScene would edit both scenes at once.
 *
 * assetIds are deliberately SHARED. The blob in IndexedDB is the same image;
 * a duplicate whose reference images had vanished would just look broken.
 */
function cloneNode(n: SceneNode): SceneNode {
  return {
    ...n,
    id: uid('node'),
    participantIds: [...n.participantIds],
    fields: { ...n.fields },
    checklist: n.checklist.map((c) => ({ ...c, id: uid('ck') })),
    assetIds: [...n.assetIds],
    blocking: n.blocking
      ? {
          camera: { ...n.blocking.camera },
          marks: n.blocking.marks.map((m) => ({ ...m, path: m.path.map((p) => ({ ...p })) })),
        }
      : undefined,
  };
}

/** "3" -> "3A", "3A" -> "3B". How a split scene is actually numbered on a set. */
function nextSceneNumber(base: string, taken: string[]): string {
  const m = /^(.+?)([A-Z])$/.exec(base);
  const stem = m ? m[1] : base;
  for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!taken.includes(`${stem}${l}`)) return `${stem}${l}`;
  }
  return `${base} copy`;
}

/** Status resets: a copy has not been shot, whatever the original's state. */
function cloneScene(src: Scene, siblings: Scene[]): Scene {
  return {
    ...src,
    id: uid('scene'),
    sceneNumber: nextSceneNumber(
      src.sceneNumber,
      siblings.map((s) => s.sceneNumber)
    ),
    status: 'planned',
    referenceAssetIds: [...src.referenceAssetIds],
    assignedCrewIds: [...src.assignedCrewIds],
    nodes: src.nodes.map(cloneNode),
    shots: src.shots.map((s) => ({
      ...s,
      id: uid('shot'),
      status: 'planned',
      nodes: s.nodes.map(cloneNode),
      // Copy the arrays, or the duplicate shares them and editing one scene's
      // crew list silently edits the other's.
      referenceAssetIds: [...s.referenceAssetIds],
      assignedCrewIds: [...s.assignedCrewIds],
    })),
  };
}

export const useProjects = create<State>((set, get) => {
  const mutate = (projectId: string, fn: (p: Project) => Project) => {
    set({
      projects: get().projects.map((p) =>
        p.id === projectId ? { ...fn(p), updatedAt: new Date().toISOString() } : p
      ),
    });
    scheduleSave(get, set);
  };

  const mutateScene = (projectId: string, sceneId: string, fn: (s: Scene) => Scene) =>
    mutate(projectId, (p) => ({
      ...p,
      scenes: p.scenes.map((s) => (s.id === sceneId ? fn(s) : s)),
    }));

  return {
    projects: [],
    ready: false,
    personFilterId: null,

    setPersonFilter: (id) => set({ personFilterId: id }),

    init: async () => {
      const res = await loadWorkspace();
      const projects = res.projects.map((p) => ({
        ...p,
        scenes: p.scenes.map(ensureMandatory),
      }));
      set({ projects, ready: true, loadError: res.error, loadRaw: res.raw });
    },

    addSampleProject: () => {
      const p = buildSampleProject();
      set({ projects: [...get().projects, p] });
      scheduleSave(get, set);
      return p.id;
    },

    addProject: (title) => {
      const now = new Date().toISOString();
      const p: Project = {
        id: uid('proj'),
        schemaVersion: SCHEMA_VERSION,
        title: title || 'Untitled film',
        crew: [],
        characters: [],
        scenes: [makeScene('1', 0, 'Untitled scene')],
        createdAt: now,
        updatedAt: now,
      };
      set({ projects: [...get().projects, p] });
      scheduleSave(get, set);
      return p.id;
    },

    replaceProject: (p) => {
      const existing = get().projects.some((x) => x.id === p.id);
      set({
        projects: existing
          ? get().projects.map((x) => (x.id === p.id ? p : x))
          : [...get().projects, p],
      });
      scheduleSave(get, set);
    },

    updateProject: (projectId, patch) => mutate(projectId, (p) => ({ ...p, ...patch })),

    deleteProject: (id) => {
      set({ projects: get().projects.filter((p) => p.id !== id) });
      scheduleSave(get, set);
    },

    updateScene: (projectId, sceneId, patch) =>
      mutateScene(projectId, sceneId, (s) => ({ ...s, ...patch })),

    addScene: (projectId) => {
      const p = get().projects.find((x) => x.id === projectId);
      const order = p ? p.scenes.length : 0;
      const num = String(order + 1);
      const scene = makeScene(num, order, 'Untitled scene');
      mutate(projectId, (proj) => ({ ...proj, scenes: [...proj.scenes, scene] }));
      return scene.id;
    },

    /** The copy lands directly after its original, not at the end of the film. */
    duplicateScene: (projectId, sceneId) => {
      const p = get().projects.find((x) => x.id === projectId);
      const src = p?.scenes.find((s) => s.id === sceneId);
      if (!p || !src) return '';
      const copy = cloneScene(src, p.scenes);
      mutate(projectId, (proj) => {
        const ordered = [...proj.scenes].sort((a, b) => a.orderIndex - b.orderIndex);
        ordered.splice(ordered.findIndex((s) => s.id === sceneId) + 1, 0, copy);
        return { ...proj, scenes: reindex(ordered) };
      });
      return copy.id;
    },

    /**
     * Moves a scene in SCRIPT order. sceneNumber travels with it untouched —
     * it is a display label, not a position, so renumbering here would be wrong.
     */
    moveScene: (projectId, sceneId, delta) =>
      mutate(projectId, (p) => {
        const ordered = [...p.scenes].sort((a, b) => a.orderIndex - b.orderIndex);
        const i = ordered.findIndex((s) => s.id === sceneId);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= ordered.length) return p;
        [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
        return { ...p, scenes: reindex(ordered) };
      }),

    deleteScene: (projectId, sceneId) =>
      mutate(projectId, (p) => ({
        ...p,
        // Sort before reindexing: array order is not guaranteed to be script order.
        scenes: reindex(
          p.scenes.filter((s) => s.id !== sceneId).sort((a, b) => a.orderIndex - b.orderIndex)
        ),
      })),

    addShot: (projectId, sceneId) => {
      const p = get().projects.find((x) => x.id === projectId);
      const scene = p?.scenes.find((s) => s.id === sceneId);
      const label = nextShotLabel(scene ? scene.shots.map((s) => s.label) : []);
      const s = makeShot(label, scene ? scene.shots.length : 0);
      mutateScene(projectId, sceneId, (sc) => ({ ...sc, shots: [...sc.shots, s] }));
      return s.id;
    },

    updateShot: (projectId, sceneId, shotId, patch) =>
      mutateScene(projectId, sceneId, (sc) => ({
        ...sc,
        shots: sc.shots.map((s) => (s.id === shotId ? { ...s, ...patch } : s)),
      })),

    /**
     * Copies a setup with its technical data intact — most setups on a scene
     * share a body, lens and frame rate, so re-entering them is the single
     * biggest source of typing. Lands directly after its original.
     */
    duplicateShot: (projectId, sceneId, shotId) => {
      const p = get().projects.find((x) => x.id === projectId);
      const scene = p?.scenes.find((s) => s.id === sceneId);
      const src = scene?.shots.find((s) => s.id === shotId);
      if (!scene || !src) return '';

      const copy: Shot = {
        ...src,
        id: uid('shot'),
        label: nextShotLabel(scene.shots.map((s) => s.label)),
        status: 'planned',
        nodes: src.nodes.map(cloneNode),
        referenceAssetIds: [...src.referenceAssetIds],
        assignedCrewIds: [...src.assignedCrewIds],
        video: src.video ? { ...src.video } : undefined,
      };

      mutateScene(projectId, sceneId, (sc) => {
        const ordered = [...sc.shots].sort((a, b) => a.orderIndex - b.orderIndex);
        ordered.splice(ordered.findIndex((s) => s.id === shotId) + 1, 0, copy);
        return { ...sc, shots: reindexShots(ordered) };
      });
      return copy.id;
    },

    /**
     * Moves a setup in shooting order. The label travels with it unchanged:
     * like sceneNumber, a shot label is a display string the crew already knows,
     * not a position.
     */
    moveShot: (projectId, sceneId, shotId, delta) =>
      mutateScene(projectId, sceneId, (sc) => {
        const ordered = [...sc.shots].sort((a, b) => a.orderIndex - b.orderIndex);
        const i = ordered.findIndex((s) => s.id === shotId);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= ordered.length) return sc;
        [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
        return { ...sc, shots: reindexShots(ordered) };
      }),

    deleteShot: (projectId, sceneId, shotId) =>
      mutateScene(projectId, sceneId, (sc) =>
        sc.shots.length <= 1
          ? sc
          : { ...sc, shots: reindexShots(sc.shots.filter((s) => s.id !== shotId)) }
      ),

    /**
     * Pairs this scene with the one after it as parallel threads of one beat.
     * Extends an existing group rather than starting a second one, so calling it
     * again on the same scene adds a third thread.
     */
    makeParallel: (projectId, sceneId) =>
      mutate(projectId, (p) => {
        const ordered = [...p.scenes].sort((a, b) => a.orderIndex - b.orderIndex);
        const i = ordered.findIndex((s) => s.id === sceneId);
        if (i < 0 || i + 1 >= ordered.length) return p;

        const a = ordered[i];
        const b = ordered[i + 1];
        if (b.parallel && b.parallel.groupId === a.parallel?.groupId) return p;

        const groupId = a.parallel?.groupId ?? uid('par');
        const name = (s: Scene, fallback: string) =>
          s.parallel?.label ?? s.location ?? s.title ?? fallback;

        ordered[i] = { ...a, parallel: { ...a.parallel, groupId, label: name(a, 'Thread A') } };
        ordered[i + 1] = { ...b, parallel: { ...b.parallel, groupId, label: name(b, 'Thread B') } };
        return { ...p, scenes: ordered };
      }),

    updateParallel: (projectId, sceneId, patch) =>
      mutateScene(projectId, sceneId, (sc) =>
        sc.parallel ? { ...sc, parallel: { ...sc.parallel, ...patch } } : sc
      ),

    /** Also dissolves the group when only one thread would be left in it. */
    clearParallel: (projectId, sceneId) =>
      mutate(projectId, (p) => {
        const target = p.scenes.find((s) => s.id === sceneId);
        const groupId = target?.parallel?.groupId;
        if (!groupId) return p;

        const remaining = p.scenes.filter(
          (s) => s.id !== sceneId && s.parallel?.groupId === groupId
        );
        const dissolve = remaining.length <= 1;

        return {
          ...p,
          scenes: p.scenes.map((s) => {
            if (s.id === sceneId) return { ...s, parallel: undefined };
            if (dissolve && s.parallel?.groupId === groupId) return { ...s, parallel: undefined };
            return s;
          }),
        };
      }),

    updateNode: (projectId, sceneId, nodeId, patch) =>
      mutateScene(projectId, sceneId, (sc) =>
        patchNodeInScene(sc, nodeId, (n) => ({ ...n, ...patch }))
      ),

    setNodeField: (projectId, sceneId, nodeId, key, value) =>
      mutateScene(projectId, sceneId, (sc) =>
        patchNodeInScene(sc, nodeId, (n) => ({ ...n, fields: { ...n.fields, [key]: value } }))
      ),

    addCustomNode: (projectId, sceneId, label, iconKey) => {
      const node = makeNode('CUSTOM' as NodeType, label, iconKey);
      mutateScene(projectId, sceneId, (sc) => ({ ...sc, nodes: [...sc.nodes, node] }));
      return node.id;
    },

    deleteNode: (projectId, sceneId, nodeId) =>
      mutateScene(projectId, sceneId, (sc) => ({
        ...sc,
        nodes: sc.nodes.filter((n) => n.id !== nodeId || n.locked),
      })),

    addCharacter: (projectId, name) => {
      const p = get().projects.find((x) => x.id === projectId);
      const taken = new Set((p?.characters ?? []).map((c) => c.color.toLowerCase()));
      // First unused colour, not the next in sequence: cycling by index hands out
      // a duplicate as soon as one character was given a colour out of order, and
      // two identical pucks defeat the whole point of colouring them.
      const color =
        PUCK_COLORS.find((c) => !taken.has(c.toLowerCase())) ??
        PUCK_COLORS[(p?.characters.length ?? 0) % PUCK_COLORS.length];
      const c: Character = { id: uid('char'), name, color };
      mutate(projectId, (proj) => ({ ...proj, characters: [...proj.characters, c] }));
      return c.id;
    },

    updateCharacter: (projectId, charId, patch) =>
      mutate(projectId, (p) => ({
        ...p,
        characters: p.characters.map((c) => (c.id === charId ? { ...c, ...patch } : c)),
      })),

    /**
     * Also strips the character from every participant list and blocking mark.
     * A dangling characterId would render as a grey "Unassigned" puck that the
     * legend offers no way to remove.
     */
    deleteCharacter: (projectId, charId) =>
      mutate(projectId, (p) => ({
        ...p,
        characters: p.characters.filter((c) => c.id !== charId),
        scenes: p.scenes.map((s) =>
          mapSceneNodes(s, (n) => ({
            ...n,
            participantIds: n.participantIds.filter((x) => x !== charId),
            blocking: n.blocking
              ? { ...n.blocking, marks: n.blocking.marks.filter((m) => m.characterId !== charId) }
              : n.blocking,
          }))
        ),
      })),

    addCrew: (projectId, name, role) => {
      const c: CrewMember = { id: uid('crew'), name, role, ownsNodeTypes: [] };
      mutate(projectId, (p) => ({ ...p, crew: [...p.crew, c] }));
      return c.id;
    },

    updateCrew: (projectId, crewId, patch) =>
      mutate(projectId, (p) => ({
        ...p,
        crew: p.crew.map((c) => (c.id === crewId ? { ...c, ...patch } : c)),
      })),

    /**
     * Clears the ownerId override wherever this person was named. Otherwise the
     * node falls back to role defaults and silently reads as someone else's.
     */
    deleteCrew: (projectId, crewId) =>
      mutate(projectId, (p) => ({
        ...p,
        crew: p.crew.filter((c) => c.id !== crewId),
        scenes: p.scenes.map((s) =>
          mapSceneNodes(s, (n) => (n.ownerId === crewId ? { ...n, ownerId: undefined } : n))
        ),
      })),
  };
});

/** Convenience selectors. */
export function useProject(id?: string): Project | undefined {
  return useProjects((s) => s.projects.find((p) => p.id === id));
}

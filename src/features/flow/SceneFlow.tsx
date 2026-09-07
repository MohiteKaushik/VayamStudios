import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Project, Scene } from '../../lib/types';
import type { Selection } from '../../lib/selection';
import type { Person } from '../../lib/relevance';
import { isShotRelevant } from '../../lib/relevance';
import { STATUS_META } from '../../data/nodeSchemas';
import { AssetImage } from '../../components/AssetImage';
import { ShotCard } from './ShotCard';
import { useProjects } from '../../store/projectStore';

/**
 * A scene as a top-to-bottom sequence: the scene, then its setups in shooting
 * order, one after another.
 *
 * This replaces the horizontal fan. Eight setups used to lay out ~2000px wide
 * and force sideways scrolling; the same eight now read straight down, which is
 * also what a phone wants, so desktop and mobile share one renderer instead of
 * two.
 *
 * Exactly one setup is open at a time — opening another closes the first. That
 * is the whole point of the iteration: the crew see the sequence first and the
 * detail only when they ask for it.
 */

interface Props {
  project: Project;
  scene: Scene;
  onSelect: (s: Selection) => void;
  /** Null when the filter is on "All people". */
  person: Person | null;
}

export function SceneFlow({ project, scene, onSelect, person }: Props) {
  const [openShotId, setOpenShotId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const addShot = useProjects((s) => s.addShot);
  const moveShot = useProjects((s) => s.moveShot);
  const duplicateShot = useProjects((s) => s.duplicateShot);
  const deleteShot = useProjects((s) => s.deleteShot);

  const shots = useMemo(
    () => [...scene.shots].sort((a, b) => a.orderIndex - b.orderIndex),
    [scene.shots]
  );

  const status = STATUS_META[scene.status];
  const doomed = shots.find((s) => s.id === pendingDelete);

  return (
    <div className="flow">
      <div className="flow-rail">
        <button
          className="scene-head-card"
          style={{ ['--accent' as string]: status.color }}
          onClick={() => onSelect({ kind: 'scene', id: scene.id })}
        >
          {scene.referenceAssetIds[0] && (
            <AssetImage id={scene.referenceAssetIds[0]} className="scene-head-thumb" alt="" />
          )}
          <div className="scene-head-top">
            <span className="scene-head-num">{scene.sceneNumber}</span>
            <span className="status-dot">
              <i style={{ background: status.color }} />
              {status.label}
            </span>
          </div>
          <h2 className="scene-head-title">{scene.title}</h2>
          <p className="scene-head-slug">
            {[scene.intExt, scene.location, scene.dayNight].filter(Boolean).join(' · ') ||
              'No slugline yet'}
          </p>
          {scene.action && <p className="scene-head-action">{scene.action}</p>}
        </button>

        <Connector count={shots.length} />

        {shots.map((shot, i) => (
          <div key={shot.id}>
            <ShotCard
              project={project}
              scene={scene}
              shot={shot}
              index={i}
              total={shots.length}
              expanded={openShotId === shot.id}
              dimmed={Boolean(person) && !isShotRelevant(shot, person!, project.crew)}
              onToggle={() => setOpenShotId(openShotId === shot.id ? null : shot.id)}
              onSelect={onSelect}
              onMove={(delta) => moveShot(project.id, scene.id, shot.id, delta)}
              onDuplicate={() => {
                const id = duplicateShot(project.id, scene.id, shot.id);
                if (id) setOpenShotId(id);
              }}
              onDelete={() => setPendingDelete(shot.id)}
            />
            {i < shots.length - 1 && <Connector />}
          </div>
        ))}

        <Connector />

        <button
          className="flow-add"
          onClick={() => {
            const id = addShot(project.id, scene.id);
            setOpenShotId(id);
          }}
        >
          <Plus size={16} />
          Add a setup
        </button>
      </div>

      {doomed && (
        <div className="modal-backdrop" onClick={() => setPendingDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete setup {doomed.label}?</h2>
            <p>
              {doomed.description || 'This setup'} and its camera and composition. This cannot be
              undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPendingDelete(null)}>
                Keep it
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  deleteShot(project.id, scene.id, doomed.id);
                  if (openShotId === doomed.id) setOpenShotId(null);
                  setPendingDelete(null);
                }}
              >
                Delete the setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** The arrow between two cards. Purely decorative, so it is hidden from readers. */
function Connector({ count }: { count?: number }) {
  return (
    <div className="flow-link" aria-hidden>
      <span className="flow-line" />
      <span className="flow-arrow" />
      {typeof count === 'number' && (
        <span className="flow-count">
          {count} {count === 1 ? 'setup' : 'setups'}
        </span>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Printer,
  Settings2,
  Trash2,
} from 'lucide-react';
import type { Scene } from '../../lib/types';
import { useProjects } from '../../store/projectStore';
import { STATUS_META } from '../../data/nodeSchemas';
import { AssetImage } from '../../components/AssetImage';

type GroupBy = 'script' | 'day';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Holds the shoot day locally until blur.
 *
 * Committing on every keystroke regroups the grid mid-word: typing "D" moves
 * the scene into a group keyed "D", React remounts the tile in a new section,
 * and focus lands on the body — so only the first character is ever typed.
 */
function DayInput({
  scene,
  onCommit,
}: {
  scene: Scene;
  onCommit: (value: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(scene.shootDay ?? '');

  // Re-sync when the scene's day changes elsewhere (the detail panel edits it too).
  useEffect(() => setDraft(scene.shootDay ?? ''), [scene.shootDay]);

  return (
    <label className="day-input">
      <span>Day</span>
      <input
        value={draft}
        placeholder="—"
        aria-label={`Shoot day for scene ${scene.sceneNumber}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft.trim() || undefined)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}

interface Group {
  key: string;
  label: string;
  scenes: Scene[];
}

export function SceneOverview() {
  const { filmId } = useParams();
  const nav = useNavigate();
  const project = useProjects((s) => s.projects.find((p) => p.id === filmId));
  const addScene = useProjects((s) => s.addScene);
  const duplicateScene = useProjects((s) => s.duplicateScene);
  const moveScene = useProjects((s) => s.moveScene);
  const deleteScene = useProjects((s) => s.deleteScene);
  const updateScene = useProjects((s) => s.updateScene);

  const [groupBy, setGroupBy] = useState<GroupBy>('script');
  const [pendingDelete, setPendingDelete] = useState<Scene | null>(null);

  const scenes = useMemo(
    () => (project ? [...project.scenes].sort((a, b) => a.orderIndex - b.orderIndex) : []),
    [project]
  );

  /**
   * Script order is one unnamed group. Shoot-day order buckets by the shootDay
   * string, keeping script order inside each day, with unscheduled scenes last
   * — they are the work still to be planned, so they belong at the bottom.
   */
  const groups: Group[] = useMemo(() => {
    if (groupBy === 'script') return [{ key: '', label: '', scenes }];

    const byDay = new Map<string, Scene[]>();
    for (const s of scenes) {
      const key = (s.shootDay ?? '').trim();
      const bucket = byDay.get(key);
      if (bucket) bucket.push(s);
      else byDay.set(key, [s]);
    }

    const named = [...byDay.entries()]
      .filter(([k]) => k !== '')
      // numeric so "Day 2" sorts before "Day 10", not after it.
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([k, v]) => ({ key: k, label: k, scenes: v }));

    const unscheduled = byDay.get('') ?? [];
    return unscheduled.length
      ? [...named, { key: '', label: 'Unscheduled', scenes: unscheduled }]
      : named;
  }, [scenes, groupBy]);

  if (!project) {
    return (
      <div className="overview">
        <div className="overview-inner">
          <p>That film is not in this browser. Open its project file from the start screen.</p>
        </div>
      </div>
    );
  }

  const counts = scenes.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const renderTile = (s: Scene, indexInFilm: number) => {
    const st = STATUS_META[s.status];
    // Reordering moves a scene in SCRIPT order, which is invisible while the
    // grid is grouped by day. Offering it there would look broken.
    const canReorder = groupBy === 'script';

    return (
      <div className="scene-tile-wrap" key={s.id}>
        <button
          className="scene-tile"
          style={{ borderLeftColor: st.color }}
          onClick={() => nav(`/film/${project.id}/scene/${s.id}`)}
        >
          {s.referenceAssetIds[0] && (
            <AssetImage id={s.referenceAssetIds[0]} className="thumb" alt="" />
          )}
          <div className="scene-tile-top">
            <span className="scene-num">{s.sceneNumber}</span>
            <span className="scene-slug">
              {[s.intExt, s.dayNight].filter(Boolean).join(' · ')}
            </span>
          </div>
          <h3>{s.title}</h3>
          <p>{s.action || 'No description yet.'}</p>
          <div className="scene-tile-foot">
            <span className="status-dot">
              <i style={{ background: st.color }} />
              {st.label}
            </span>
            <span>
              {s.shots.length} {s.shots.length === 1 ? 'setup' : 'setups'}
            </span>
            {groupBy === 'script' && s.shootDay && <span>{s.shootDay}</span>}
          </div>
        </button>

        <div className="tile-bar no-print">
          <button
            className="tile-act"
            disabled={!canReorder || indexInFilm === 0}
            title={canReorder ? 'Move earlier in the script' : 'Switch to script order to reorder'}
            aria-label={`Move scene ${s.sceneNumber} earlier`}
            onClick={() => moveScene(project.id, s.id, -1)}
          >
            <ChevronUp size={15} />
          </button>
          <button
            className="tile-act"
            disabled={!canReorder || indexInFilm === scenes.length - 1}
            title={canReorder ? 'Move later in the script' : 'Switch to script order to reorder'}
            aria-label={`Move scene ${s.sceneNumber} later`}
            onClick={() => moveScene(project.id, s.id, 1)}
          >
            <ChevronDown size={15} />
          </button>
          <button
            className="tile-act"
            title="Duplicate this scene"
            aria-label={`Duplicate scene ${s.sceneNumber}`}
            onClick={() => {
              const id = duplicateScene(project.id, s.id);
              if (id) nav(`/film/${project.id}/scene/${id}`);
            }}
          >
            <Copy size={14} />
          </button>
          <button
            className="tile-act tile-act-danger"
            title="Delete this scene"
            aria-label={`Delete scene ${s.sceneNumber}`}
            onClick={() => setPendingDelete(s)}
          >
            <Trash2 size={14} />
          </button>

          {groupBy === 'day' && (
            <DayInput
              scene={s}
              onCommit={(shootDay) => updateScene(project.id, s.id, { shootDay })}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="overview">
      <div className="overview-inner">
        <div className="overview-head">
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1>{project.title}</h1>
            <p>{project.logline}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => nav(`/film/${project.id}/settings`)}>
              <Settings2 size={15} />
              Film settings
            </button>
            <button className="btn" onClick={() => nav(`/film/${project.id}/print`)}>
              <Printer size={15} />
              Blueprint
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const id = addScene(project.id);
                nav(`/film/${project.id}/scene/${id}`);
              }}
            >
              <Plus size={15} />
              Add scene
            </button>
          </div>
        </div>

        <div className="overview-meta">
          {Object.entries(STATUS_META).map(([k, v]) =>
            counts[k] ? (
              <span key={k} className="status-dot">
                <i style={{ background: v.color }} />
                {counts[k]} {v.label.toLowerCase()}
              </span>
            ) : null
          )}
          <span className="status-dot">
            {scenes.reduce((a, s) => a + s.shots.length, 0)} setups in total
          </span>

          <span className="spacer" />

          <div className="seg" role="group" aria-label="Order scenes by">
            <button
              className={groupBy === 'script' ? 'seg-on' : undefined}
              onClick={() => setGroupBy('script')}
            >
              Script order
            </button>
            <button
              className={groupBy === 'day' ? 'seg-on' : undefined}
              onClick={() => setGroupBy('day')}
            >
              Shoot day
            </button>
          </div>
        </div>

        {groups.length === 0 && <p className="empty-note">No scenes yet.</p>}

        {groups.map((g) => (
          <section key={g.key || '__unscheduled'}>
            {groupBy === 'day' && (
              <div className="day-head">
                <h2>{g.label}</h2>
                <span>
                  {plural(g.scenes.length, 'scene')} ·{' '}
                  {plural(
                    g.scenes.reduce((a, s) => a + s.shots.length, 0),
                    'setup'
                  )}
                </span>
              </div>
            )}
            <div className="scene-grid">
              {g.scenes.map((s) => renderTile(s, scenes.indexOf(s)))}
            </div>
          </section>
        ))}
      </div>

      {pendingDelete && (
        <div className="modal-backdrop" onClick={() => setPendingDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              Delete scene {pendingDelete.sceneNumber}?
            </h2>
            <p>
              &ldquo;{pendingDelete.title}&rdquo; and its {pendingDelete.shots.length}{' '}
              {pendingDelete.shots.length === 1 ? 'setup' : 'setups'}. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPendingDelete(null)}>
                Keep it
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  deleteScene(project.id, pendingDelete.id);
                  setPendingDelete(null);
                }}
              >
                <Trash2 size={14} />
                Delete the scene
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

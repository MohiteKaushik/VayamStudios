import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GitBranch,
  Plus,
  Printer,
  Settings2,
  Trash2,
  Unlink,
} from 'lucide-react';
import type { Scene } from '../../lib/types';
import { useProjects } from '../../store/projectStore';
import { STATUS_META } from '../../data/nodeSchemas';
import { AssetImage } from '../../components/AssetImage';
import { PersonFilter } from '../people/PersonFilter';
import { isSceneRelevant, listPeople, relevanceCount } from '../../lib/relevance';

type GroupBy = 'script' | 'day';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The film as a vertical sequence, top to bottom.
 *
 * A run of consecutive scenes sharing a parallel groupId is drawn as one split
 * block: the threads sit side by side, then the spine rejoins. The underlying
 * scene list stays flat and linear, so ordering, duplication, shoot days and the
 * print blueprint are untouched by it.
 */

interface Row {
  kind: 'single' | 'parallel';
  key: string;
  scenes: Scene[];
}

function buildRows(scenes: Scene[], allowParallel: boolean): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < scenes.length) {
    const groupId = allowParallel ? scenes[i].parallel?.groupId : undefined;
    if (groupId) {
      const run: Scene[] = [];
      while (i < scenes.length && scenes[i].parallel?.groupId === groupId) {
        run.push(scenes[i]);
        i += 1;
      }
      // A group of one is just a scene; only a real split earns the branch UI.
      rows.push(
        run.length > 1
          ? { kind: 'parallel', key: groupId, scenes: run }
          : { kind: 'single', key: run[0].id, scenes: run }
      );
      continue;
    }
    rows.push({ kind: 'single', key: scenes[i].id, scenes: [scenes[i]] });
    i += 1;
  }
  return rows;
}

/**
 * Holds the shoot day locally until blur. Committing per keystroke regroups the
 * list mid-word, React remounts the card, and focus is lost after one character.
 */
function DayInput({
  scene,
  onCommit,
}: {
  scene: Scene;
  onCommit: (value: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(scene.shootDay ?? '');
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

export function SceneOverview() {
  const { filmId } = useParams();
  const nav = useNavigate();
  const project = useProjects((s) => s.projects.find((p) => p.id === filmId));
  const addScene = useProjects((s) => s.addScene);
  const duplicateScene = useProjects((s) => s.duplicateScene);
  const moveScene = useProjects((s) => s.moveScene);
  const deleteScene = useProjects((s) => s.deleteScene);
  const updateScene = useProjects((s) => s.updateScene);
  const makeParallel = useProjects((s) => s.makeParallel);
  const clearParallel = useProjects((s) => s.clearParallel);
  const personFilterId = useProjects((s) => s.personFilterId);
  const setPersonFilter = useProjects((s) => s.setPersonFilter);

  const [groupBy, setGroupBy] = useState<GroupBy>('script');
  const [pendingDelete, setPendingDelete] = useState<Scene | null>(null);

  const scenes = useMemo(
    () => (project ? [...project.scenes].sort((a, b) => a.orderIndex - b.orderIndex) : []),
    [project]
  );

  const people = useMemo(
    () => (project ? listPeople(project.crew, project.characters) : []),
    [project]
  );
  const person = people.find((p) => p.id === personFilterId) ?? null;

  const filterSummary = useMemo(() => {
    if (!person || !project) return undefined;
    const c = relevanceCount(scenes, person, project.crew);
    return `${plural(c.scenes, 'scene')} · ${plural(c.shots, 'setup')}`;
  }, [person, project, scenes]);

  /** Shoot-day view buckets by day; script view keeps one continuous spine. */
  const groups = useMemo(() => {
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

  const renderCard = (s: Scene, inParallel: boolean) => {
    const st = STATUS_META[s.status];
    const i = scenes.indexOf(s);
    const canReorder = groupBy === 'script' && !inParallel;
    const dim = Boolean(person) && !isSceneRelevant(s, person!, project.crew);

    return (
      <div className={`film-scene${dim ? ' is-dim' : ''}`} key={s.id}>
        <button
          className="film-scene-card"
          style={{ ['--accent' as string]: st.color }}
          onClick={() => nav(`/film/${project.id}/scene/${s.id}`)}
        >
          {s.referenceAssetIds[0] && (
            <AssetImage id={s.referenceAssetIds[0]} className="film-scene-thumb" alt="" />
          )}
          <div className="film-scene-main">
            <div className="film-scene-top">
              <span className="scene-num">{s.sceneNumber}</span>
              <span className="scene-slug">
                {[s.intExt, s.location, s.dayNight].filter(Boolean).join(' · ')}
              </span>
            </div>
            <h3>{s.title}</h3>
            <p>{s.action || 'No description yet.'}</p>
            <div className="film-scene-foot">
              <span className="status-dot">
                <i style={{ background: st.color }} />
                {st.label}
              </span>
              <span>{plural(s.shots.length, 'setup')}</span>
              {groupBy === 'script' && s.shootDay && <span>{s.shootDay}</span>}
            </div>
          </div>
        </button>

        <div className="tile-bar no-print">
          <button
            className="tile-act"
            disabled={!canReorder || i === 0}
            title={canReorder ? 'Move earlier in the script' : 'Reorder in script order'}
            aria-label={`Move scene ${s.sceneNumber} earlier`}
            onClick={() => moveScene(project.id, s.id, -1)}
          >
            <ChevronUp size={15} />
          </button>
          <button
            className="tile-act"
            disabled={!canReorder || i === scenes.length - 1}
            title={canReorder ? 'Move later in the script' : 'Reorder in script order'}
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
          {s.parallel ? (
            <button
              className="tile-act"
              title="Take this scene out of the parallel branch"
              aria-label={`Unlink scene ${s.sceneNumber} from its parallel branch`}
              onClick={() => clearParallel(project.id, s.id)}
            >
              <Unlink size={14} />
            </button>
          ) : (
            <button
              className="tile-act"
              disabled={groupBy !== 'script' || i === scenes.length - 1}
              title={
                i === scenes.length - 1
                  ? 'Needs a following scene to run in parallel with'
                  : 'Run this scene and the next one as parallel threads'
              }
              aria-label={`Make scene ${s.sceneNumber} parallel with the next`}
              onClick={() => makeParallel(project.id, s.id)}
            >
              <GitBranch size={14} />
            </button>
          )}
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
          <PersonFilter
            people={people}
            value={personFilterId}
            onChange={setPersonFilter}
            summary={filterSummary}
          />

          <span className="spacer" />

          {Object.entries(STATUS_META).map(([k, v]) =>
            counts[k] ? (
              <span key={k} className="status-dot">
                <i style={{ background: v.color }} />
                {counts[k]} {v.label.toLowerCase()}
              </span>
            ) : null
          )}

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

        {scenes.length === 0 && <p className="empty-note">No scenes yet.</p>}

        {groups.map((g) => {
          const rows = buildRows(g.scenes, groupBy === 'script');
          return (
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

              <div className="film-flow">
                <div className="film-start">{project.title}</div>

                {rows.map((row, ri) => (
                  <div key={row.key}>
                    <FlowLink />
                    {row.kind === 'single' ? (
                      renderCard(row.scenes[0], false)
                    ) : (
                      <div className="par-block">
                        <div className="par-head">
                          <GitBranch size={14} />
                          Parallel — {plural(row.scenes.length, 'thread')}
                        </div>
                        <div className="par-cols">
                          {row.scenes.map((s) => (
                            <div className="par-col" key={s.id}>
                              <div className="par-label">
                                {s.parallel?.label || s.location || s.title}
                              </div>
                              {renderCard(s, true)}
                            </div>
                          ))}
                        </div>
                        <div className="par-merge" aria-hidden />
                      </div>
                    )}
                    {ri === rows.length - 1 && <FlowLink end />}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {pendingDelete && (
        <div className="modal-backdrop" onClick={() => setPendingDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete scene {pendingDelete.sceneNumber}?</h2>
            <p>
              &ldquo;{pendingDelete.title}&rdquo; and its {plural(pendingDelete.shots.length, 'setup')}
              . This cannot be undone.
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

function FlowLink({ end }: { end?: boolean }) {
  return (
    <div className={`flow-link${end ? ' is-end' : ''}`} aria-hidden>
      <span className="flow-line" />
      {!end && <span className="flow-arrow" />}
    </div>
  );
}

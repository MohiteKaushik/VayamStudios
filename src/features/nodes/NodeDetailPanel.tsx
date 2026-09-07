import { useRef } from 'react';
import { Plus, Trash2, X, Upload } from 'lucide-react';
import type { Character, CrewMember, Project, Scene, SceneNode, Shot } from '../../lib/types';
import { NODE_TYPES, STATUS_META } from '../../data/nodeSchemas';
import { FieldRenderer } from './FieldRenderer';
import { Icon } from '../../components/Icon';
import { resolveOwner } from '../../lib/resolveOwner';
import { useProjects } from '../../store/projectStore';
import { BlockingDiagram } from '../blocking/BlockingDiagram';
import { AssetImage } from '../../components/AssetImage';
import { downscaleImage, putAsset } from '../../storage/assets';
import { fovFromFocalLength, parseFocal } from '../../lib/optics';
import { uid } from '../../lib/id';
import type { Selection } from '../../lib/selection';
import { VideoRefField } from '../media/VideoRef';

interface Props {
  project: Project;
  scene: Scene;
  selection: Selection | null;
  onSelect: (s: Selection | null) => void;
}

function ImageStrip({
  ids,
  onAdd,
  onRemove,
}: {
  ids: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="ref-strip">
      {ids.map((id) => (
        <div className="ref-thumb" key={id}>
          <AssetImage id={id} alt="Reference" />
          <button onClick={() => onRemove(id)} aria-label="Remove image">
            <X size={13} />
          </button>
        </div>
      ))}
      <button className="upload-tile" onClick={() => inputRef.current?.click()}>
        <Upload size={17} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const blob = await downscaleImage(f);
          onAdd(await putAsset(blob));
          e.target.value = '';
        }}
      />
    </div>
  );
}

function OwnerPicker({
  node,
  crew,
  onChange,
}: {
  node: SceneNode;
  crew: CrewMember[];
  onChange: (id: string | undefined) => void;
}) {
  const resolved = resolveOwner(node, crew);
  return (
    <div className="field">
      <label>Owner</label>
      <select value={node.ownerId ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">
          {resolved?.inherited ? `${resolved.name} — from crew roles` : 'Nobody assigned'}
        </option>
        {crew.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.role}
          </option>
        ))}
      </select>
    </div>
  );
}

function Participants({
  node,
  characters,
  onToggle,
}: {
  node: SceneNode;
  characters: Character[];
  onToggle: (id: string) => void;
}) {
  if (!characters.length) return null;
  return (
    <div className="field">
      <label>Characters involved</label>
      <div className="chip-row">
        {characters.map((c) => {
          const on = node.participantIds.includes(c.id);
          return (
            <button
              key={c.id}
              className={`chip${on ? ' chip-on' : ''}`}
              onClick={() => onToggle(c.id)}
            >
              <span
                style={{ width: 8, height: 8, borderRadius: 4, background: c.color, display: 'block' }}
              />
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Explicit crew assignment, which is what makes the person filter useful for
 * anyone who owns no node type — a gaffer is not the default owner of anything,
 * so without this they would never light up anywhere.
 */
function CrewPicker({
  crew,
  assigned,
  onToggle,
}: {
  crew: CrewMember[];
  assigned: string[];
  onToggle: (id: string) => void;
}) {
  if (!crew.length) {
    return (
      <div className="field">
        <label>Crew on this</label>
        <p className="sheet-empty">Add crew in Film settings first.</p>
      </div>
    );
  }
  return (
    <div className="field">
      <label>Crew on this</label>
      <div className="chip-row">
        {crew.map((c) => {
          const on = assigned.includes(c.id);
          return (
            <button
              key={c.id}
              className={`chip${on ? ' chip-on' : ''}`}
              onClick={() => onToggle(c.id)}
              title={c.role}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NodeDetailPanel({ project, scene, selection, onSelect }: Props) {
  const store = useProjects();

  if (!selection) {
    return (
      <div className="panel">
        <div className="panel-empty">
          <h3>Pick a branch</h3>
          <p>
            Every scene carries blocking, production and audio. Each setup carries its own camera
            and composition. Select one to fill it in.
          </p>
        </div>
      </div>
    );
  }

  // ---------- SCENE ----------
  if (selection.kind === 'scene') {
    const set = (patch: Partial<Scene>) => store.updateScene(project.id, scene.id, patch);
    return (
      <div className="panel">
        <div className="panel-head">
          <div className="panel-eyebrow">SCENE {scene.sceneNumber}</div>
          <div className="panel-title">{scene.title}</div>
        </div>
        <div className="panel-body">
          <div className="field">
            <label>Scene number</label>
            <input
              className="mono"
              value={scene.sceneNumber}
              onChange={(e) => set({ sceneNumber: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Title</label>
            <input value={scene.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="field">
            <label>What happens</label>
            <textarea
              value={scene.action ?? ''}
              onChange={(e) => set({ action: e.target.value })}
              placeholder="One or two sentences. The crew reads this first."
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label>Interior or exterior</label>
              <select
                value={scene.intExt ?? ''}
                onChange={(e) => set({ intExt: (e.target.value || undefined) as 'INT' | 'EXT' })}
              >
                <option value="">—</option>
                <option value="INT">INT</option>
                <option value="EXT">EXT</option>
              </select>
            </div>
            <div className="field">
              <label>Time of day</label>
              <input
                value={scene.dayNight ?? ''}
                onChange={(e) => set({ dayNight: e.target.value })}
                placeholder="Day"
              />
            </div>
          </div>
          <div className="field">
            <label>Location</label>
            <input
              value={scene.location ?? ''}
              onChange={(e) => set({ location: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label>Status</label>
              <select
                value={scene.status}
                onChange={(e) => set({ status: e.target.value as Scene['status'] })}
              >
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Shoot day</label>
              <input
                value={scene.shootDay ?? ''}
                onChange={(e) => set({ shootDay: e.target.value })}
                placeholder="Day 1"
              />
            </div>
          </div>

          <CrewPicker
            crew={project.crew}
            assigned={scene.assignedCrewIds}
            onToggle={(id) =>
              set({
                assignedCrewIds: scene.assignedCrewIds.includes(id)
                  ? scene.assignedCrewIds.filter((x) => x !== id)
                  : [...scene.assignedCrewIds, id],
              })
            }
          />

          <div className="sect">Reference images</div>
          <ImageStrip
            ids={scene.referenceAssetIds}
            onAdd={(id) => set({ referenceAssetIds: [...scene.referenceAssetIds, id] })}
            onRemove={(id) =>
              set({ referenceAssetIds: scene.referenceAssetIds.filter((x) => x !== id) })
            }
          />

          <div className="sect">Reference clip</div>
          <VideoRefField value={scene.video} onChange={(video) => set({ video })} />

          <div className="sect">Notes</div>
          <div className="field">
            <textarea value={scene.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>
      </div>
    );
  }

  // ---------- SHOT ----------
  if (selection.kind === 'shot') {
    const shot = scene.shots.find((s) => s.id === selection.id);
    if (!shot) return <div className="panel" />;
    const set = (patch: Partial<Shot>) => store.updateShot(project.id, scene.id, shot.id, patch);
    return (
      <div className="panel">
        <div className="panel-head">
          <div className="panel-eyebrow">SCENE {scene.sceneNumber} — SETUP</div>
          <div className="panel-title">{shot.label}</div>
          <div className="panel-blurb">
            One camera position. Its camera and composition branches sit under this setup.
          </div>
        </div>
        <div className="panel-body">
          <div className="field">
            <label>Setup label</label>
            <input className="mono" value={shot.label} onChange={(e) => set({ label: e.target.value })} />
          </div>
          <div className="field">
            <label>What this setup covers</label>
            <textarea
              value={shot.description ?? ''}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Wide master, both in frame"
            />
          </div>
          <div className="field">
            <label>Status</label>
            <select
              value={shot.status}
              onChange={(e) => set({ status: e.target.value as Shot['status'] })}
            >
              <option value="planned">Planned</option>
              <option value="ready">Ready to shoot</option>
              <option value="shot">Shot</option>
            </select>
          </div>
          <CrewPicker
            crew={project.crew}
            assigned={shot.assignedCrewIds}
            onToggle={(id) =>
              set({
                assignedCrewIds: shot.assignedCrewIds.includes(id)
                  ? shot.assignedCrewIds.filter((x) => x !== id)
                  : [...shot.assignedCrewIds, id],
              })
            }
          />

          <div className="sect">Reference images</div>
          <ImageStrip
            ids={shot.referenceAssetIds}
            onAdd={(id) => set({ referenceAssetIds: [...shot.referenceAssetIds, id] })}
            onRemove={(id) =>
              set({ referenceAssetIds: shot.referenceAssetIds.filter((x) => x !== id) })
            }
          />

          <div className="sect">Reference clip</div>
          <VideoRefField value={shot.video} onChange={(video) => set({ video })} />

          {scene.shots.length > 1 && (
            <button
              className="btn btn-sm btn-danger"
              style={{ marginTop: 16 }}
              onClick={() => {
                store.deleteShot(project.id, scene.id, shot.id);
                onSelect({ kind: 'scene', id: scene.id });
              }}
            >
              <Trash2 size={14} />
              Delete setup {shot.label}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------- NODE ----------
  const shot = selection.shotId ? scene.shots.find((s) => s.id === selection.shotId) : undefined;
  const node =
    scene.nodes.find((n) => n.id === selection.id) ??
    shot?.nodes.find((n) => n.id === selection.id);
  if (!node) return <div className="panel" />;

  const def = NODE_TYPES[node.type];
  const color = def.color;
  const setField = (k: string, v: import('../../lib/types').FieldValue) =>
    store.setNodeField(project.id, scene.id, node.id, k, v);
  const setNode = (patch: Partial<SceneNode>) =>
    store.updateNode(project.id, scene.id, node.id, patch);

  // Camera focal length feeds the blocking diagram's FOV wedge automatically.
  const syncFov = () => {
    if (node.type !== 'CAMERA') return;
    const focal = parseFocal(node.fields.focalLength);
    if (!focal) return;
    const blockingNode = scene.nodes.find((n) => n.type === 'BLOCKING');
    if (!blockingNode?.blocking) return;
    store.updateNode(project.id, scene.id, blockingNode.id, {
      blocking: {
        ...blockingNode.blocking,
        camera: { ...blockingNode.blocking.camera, fovDeg: fovFromFocalLength(focal) },
      },
    });
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-eyebrow">
          SCENE {scene.sceneNumber}
          {shot ? ` — SETUP ${shot.label}` : ''}
        </div>
        <div className="panel-title">
          <Icon name={node.iconKey} size={22} color={color} />
          {node.label}
        </div>
        <div className="panel-blurb">{def.blurb}</div>
      </div>

      <div className="panel-body">
        <OwnerPicker node={node} crew={project.crew} onChange={(id) => setNode({ ownerId: id })} />

        {(node.type === 'BLOCKING' || node.type === 'CUSTOM') && (
          <Participants
            node={node}
            characters={project.characters}
            onToggle={(id) =>
              setNode({
                participantIds: node.participantIds.includes(id)
                  ? node.participantIds.filter((x) => x !== id)
                  : [...node.participantIds, id],
              })
            }
          />
        )}

        {node.type === 'BLOCKING' && node.blocking && (
          <>
            <div className="sect">Floor plan</div>
            <div className="blocking-wrap">
              <BlockingDiagram
                data={node.blocking}
                characters={project.characters}
                onChange={(d) => setNode({ blocking: d })}
              />
              <div className="blocking-legend">
                {project.characters.map((c) => {
                  const placed = node.blocking!.marks.some((m) => m.characterId === c.id);
                  return (
                    <button
                      key={c.id}
                      className="legend-item"
                      onClick={() => {
                        const b = node.blocking!;
                        setNode({
                          blocking: placed
                            ? { ...b, marks: b.marks.filter((m) => m.characterId !== c.id) }
                            : {
                                ...b,
                                marks: [
                                  ...b.marks,
                                  { characterId: c.id, x: 0.5, y: 0.45, facing: 180, path: [] },
                                ],
                              },
                        });
                      }}
                      style={{ opacity: placed ? 1 : 0.45 }}
                    >
                      <i style={{ background: c.color }} />
                      {c.name}
                      <span style={{ color: '#8d857a', fontSize: 11 }}>
                        {placed ? 'placed' : 'add'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Camera heading</label>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={node.blocking.camera.heading}
                  onChange={(e) =>
                    setNode({
                      blocking: {
                        ...node.blocking!,
                        camera: { ...node.blocking!.camera, heading: Number(e.target.value) },
                      },
                    })
                  }
                />
              </div>
              <div className="field">
                <label>Lens spread ({Math.round(node.blocking.camera.fovDeg)}&#176;)</label>
                <input
                  type="range"
                  min={10}
                  max={110}
                  value={node.blocking.camera.fovDeg}
                  onChange={(e) =>
                    setNode({
                      blocking: {
                        ...node.blocking!,
                        camera: { ...node.blocking!.camera, fovDeg: Number(e.target.value) },
                      },
                    })
                  }
                />
              </div>
            </div>

            {node.blocking.marks.length > 0 && (
              <div className="field">
                <label>Which way each person faces</label>
                {node.blocking.marks.map((m, i) => {
                  const c = project.characters.find((x) => x.id === m.characterId);
                  return (
                    <div className="list-row" key={m.characterId}>
                      <span style={{ width: 96, fontSize: 13 }}>{c?.name ?? 'Unknown'}</span>
                      <input
                        type="range"
                        min={0}
                        max={359}
                        value={m.facing}
                        onChange={(e) =>
                          setNode({
                            blocking: {
                              ...node.blocking!,
                              marks: node.blocking!.marks.map((x, j) =>
                                j === i ? { ...x, facing: Number(e.target.value) } : x
                              ),
                            },
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="sect">Written blocking</div>
          </>
        )}

        {def.fields.map((f) => (
          <div key={f.key} onBlur={f.key === 'focalLength' ? syncFov : undefined}>
            <FieldRenderer def={f} value={node.fields[f.key] ?? null} onChange={(v) => setField(f.key, v)} />
          </div>
        ))}

        {def.hasChecklist && (
          <>
            <div className="sect">Checklist</div>
            {node.checklist.map((item) => (
              <div className="check-row" key={item.id}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    setNode({
                      checklist: node.checklist.map((c) =>
                        c.id === item.id ? { ...c, done: !c.done } : c
                      ),
                    })
                  }
                />
                <input
                  className={`txt${item.done ? ' check-done' : ''}`}
                  value={item.text}
                  onChange={(e) =>
                    setNode({
                      checklist: node.checklist.map((c) =>
                        c.id === item.id ? { ...c, text: e.target.value } : c
                      ),
                    })
                  }
                />
                <button
                  className="icon-btn"
                  aria-label="Remove item"
                  onClick={() =>
                    setNode({ checklist: node.checklist.filter((c) => c.id !== item.id) })
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              className="btn btn-sm"
              onClick={() =>
                setNode({
                  checklist: [...node.checklist, { id: uid('ck'), text: '', done: false }],
                })
              }
            >
              <Plus size={14} />
              Add item
            </button>
          </>
        )}

        <div className="sect">Reference images</div>
        <ImageStrip
          ids={node.assetIds}
          onAdd={(id) => setNode({ assetIds: [...node.assetIds, id] })}
          onRemove={(id) => setNode({ assetIds: node.assetIds.filter((x) => x !== id) })}
        />

        <div className="sect">Notes</div>
        <div className="field">
          <textarea value={node.notes ?? ''} onChange={(e) => setNode({ notes: e.target.value })} />
        </div>

        {!node.locked && (
          <button
            className="btn btn-sm btn-danger"
            style={{ marginTop: 16 }}
            onClick={() => {
              store.deleteNode(project.id, scene.id, node.id);
              onSelect({ kind: 'scene', id: scene.id });
            }}
          >
            <Trash2 size={14} />
            Delete {node.label}
          </button>
        )}
      </div>
    </div>
  );
}

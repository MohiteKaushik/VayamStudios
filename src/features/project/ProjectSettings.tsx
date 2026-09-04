import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Plus, Trash2, UserPlus } from 'lucide-react';
import type { CrewMember, NodeType, Project } from '../../lib/types';
import { NODE_TYPES } from '../../data/nodeSchemas';
import { useProjects } from '../../store/projectStore';
import { Icon } from '../../components/Icon';

/**
 * Everything that belongs to the film rather than to one scene.
 *
 * This screen exists because crew and characters were seeded in Phase 1 but
 * never editable: a film you started yourself had `crew: []` forever, so owner
 * resolution was dead and the blocking diagram had nobody to place.
 */

const OWNABLE: NodeType[] = ['CAMERA', 'COMPOSITION', 'BLOCKING', 'PRODUCTION', 'AUDIO', 'CUSTOM'];

function CrewRow({
  member,
  project,
  duplicateClaims,
}: {
  member: CrewMember;
  project: Project;
  duplicateClaims: Set<NodeType>;
}) {
  const updateCrew = useProjects((s) => s.updateCrew);
  const deleteCrew = useProjects((s) => s.deleteCrew);
  const set = (patch: Partial<CrewMember>) => updateCrew(project.id, member.id, patch);
  const who = member.name || 'this person';

  return (
    <div className="roster-row">
      <div className="roster-main">
        <div className="field" style={{ marginBottom: 0, flex: '1 1 180px' }}>
          <label>Name</label>
          <input value={member.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0, flex: '1 1 180px' }}>
          <label>Role</label>
          <input
            value={member.role}
            placeholder="Cinematographer"
            onChange={(e) => set({ role: e.target.value })}
          />
        </div>
        <button
          className="icon-btn"
          title={`Remove ${who}`}
          aria-label={`Remove ${who}`}
          onClick={() => deleteCrew(project.id, member.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="field" style={{ marginBottom: 0, marginTop: 10 }}>
        <label>Owns by default</label>
        <div className="chip-row">
          {OWNABLE.map((t) => {
            const def = NODE_TYPES[t];
            const on = member.ownsNodeTypes.includes(t);
            const clash = on && duplicateClaims.has(t);
            return (
              <button
                key={t}
                className={`chip${on ? ' chip-on' : ''}`}
                title={
                  clash ? 'Somebody else owns this too. The first person listed wins.' : undefined
                }
                onClick={() =>
                  set({
                    ownsNodeTypes: on
                      ? member.ownsNodeTypes.filter((x) => x !== t)
                      : [...member.ownsNodeTypes, t],
                  })
                }
              >
                <Icon name={def.iconKey} size={13} color={on ? def.color : undefined} />
                {def.label}
                {clash && <AlertTriangle size={12} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ProjectSettings() {
  const { filmId } = useParams();
  const nav = useNavigate();
  const project = useProjects((s) => s.projects.find((p) => p.id === filmId));
  const updateProject = useProjects((s) => s.updateProject);
  const addCrew = useProjects((s) => s.addCrew);
  const addCharacter = useProjects((s) => s.addCharacter);
  const updateCharacter = useProjects((s) => s.updateCharacter);
  const deleteCharacter = useProjects((s) => s.deleteCharacter);
  const deleteProject = useProjects((s) => s.deleteProject);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!project) {
    return (
      <div className="overview">
        <div className="overview-inner">
          <p>That film is not in this browser.</p>
        </div>
      </div>
    );
  }

  const set = (patch: Partial<Project>) => updateProject(project.id, patch);

  // resolveOwner takes the FIRST crew member claiming a node type. Flag the
  // rest, so an ignored claim is visible instead of quietly doing nothing.
  const duplicateClaims = new Set<NodeType>();
  const seen = new Set<NodeType>();
  for (const c of project.crew) {
    for (const t of c.ownsNodeTypes) {
      if (seen.has(t)) duplicateClaims.add(t);
      seen.add(t);
    }
  }

  return (
    <div className="overview">
      <div className="overview-inner" style={{ maxWidth: 820 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16 }}
          onClick={() => nav(`/film/${project.id}`)}
        >
          <ChevronLeft size={15} />
          All scenes
        </button>

        <h1 className="settings-title">Film settings</h1>

        {/* ---------------- details ---------------- */}
        <section className="sheet-card">
          <div className="sect">Details</div>
          <div className="field">
            <label>Title</label>
            <input value={project.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="field">
            <label>Logline</label>
            <textarea
              value={project.logline ?? ''}
              placeholder="One sentence. It shows on the film card and above the scene grid."
              onChange={(e) => set({ logline: e.target.value || undefined })}
            />
          </div>
          <div className="two-up">
            <div className="field">
              <label>Director</label>
              <input
                value={project.director ?? ''}
                onChange={(e) => set({ director: e.target.value || undefined })}
              />
            </div>
            <div className="field">
              <label>Aspect ratio</label>
              <input
                className="mono"
                value={project.aspectRatio ?? ''}
                placeholder="2.39:1"
                onChange={(e) => set({ aspectRatio: e.target.value || undefined })}
              />
            </div>
          </div>
        </section>

        {/* ---------------- crew ---------------- */}
        <section className="sheet-card">
          <div className="sect">Crew</div>
          <p className="sheet-note">
            Each person owns node types across the whole film, so the DP is not retyped on every
            scene. A single branch can still name somebody else as an override.
          </p>

          {project.crew.length === 0 && (
            <p className="sheet-empty">
              Nobody added yet. Until you add crew, every branch reads as unassigned.
            </p>
          )}

          {project.crew.map((m) => (
            <CrewRow key={m.id} member={m} project={project} duplicateClaims={duplicateClaims} />
          ))}

          <button className="btn btn-sm" onClick={() => addCrew(project.id, '', '')}>
            <UserPlus size={14} />
            Add crew member
          </button>
        </section>

        {/* ---------------- characters ---------------- */}
        <section className="sheet-card">
          <div className="sect">Characters</div>
          <p className="sheet-note">
            The colour is the puck colour in every blocking floor plan. Pick something you can tell
            apart at a glance on a phone in daylight.
          </p>

          {project.characters.length === 0 && (
            <p className="sheet-empty">
              No characters yet. The blocking floor plan has nobody to place until you add one.
            </p>
          )}

          {project.characters.map((c) => {
            const who = c.name || 'this character';
            return (
              <div className="roster-row" key={c.id}>
                <div className="roster-main">
                  <div className="field swatch-field" style={{ marginBottom: 0 }}>
                    <label>Colour</label>
                    <input
                      type="color"
                      value={c.color}
                      aria-label={`Colour for ${who}`}
                      onChange={(e) => updateCharacter(project.id, c.id, { color: e.target.value })}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0, flex: '1 1 150px' }}>
                    <label>Name</label>
                    <input
                      value={c.name}
                      onChange={(e) => updateCharacter(project.id, c.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0, flex: '1 1 150px' }}>
                    <label>Played by</label>
                    <input
                      value={c.playedBy ?? ''}
                      onChange={(e) =>
                        updateCharacter(project.id, c.id, { playedBy: e.target.value || undefined })
                      }
                    />
                  </div>
                  <button
                    className="icon-btn"
                    title={`Remove ${who}`}
                    aria-label={`Remove ${who}`}
                    onClick={() => deleteCharacter(project.id, c.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}

          <button className="btn btn-sm" onClick={() => addCharacter(project.id, '')}>
            <Plus size={14} />
            Add character
          </button>
        </section>

        {/* ---------------- danger ---------------- */}
        <section className="sheet-card">
          <div className="sect">Delete this film</div>
          <p className="sheet-note">
            Removes it from this browser. There is no undo, and no copy anywhere else unless you
            saved a project file.
          </p>
          <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} />
            Delete {project.title}
          </button>
        </section>
      </div>

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete {project.title}?</h2>
            <p>
              {project.scenes.length} {project.scenes.length === 1 ? 'scene' : 'scenes'} and
              everything in them. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  deleteProject(project.id);
                  nav('/');
                }}
              >
                <Trash2 size={14} />
                Delete the film
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

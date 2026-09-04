import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, FolderOpen, Plus } from 'lucide-react';
import { useProjects } from '../../store/projectStore';
import { importProjectFile } from '../../storage/persistence';

export function FilmPicker() {
  const { projects, addProject, addSampleProject, replaceProject, loadError, loadRaw } =
    useProjects();
  const nav = useNavigate();
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const create = () => {
    const id = addProject(title.trim() || 'Untitled film');
    setNaming(false);
    setTitle('');
    nav(`/film/${id}`);
  };

  return (
    <div className="picker">
      <div className="picker-inner">
        {loadError && (
          <div className="banner" style={{ borderRadius: 8, marginBottom: 22 }}>
            <span>{loadError}</span>
            {loadRaw && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  const b = new Blob([loadRaw], { type: 'application/json' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(b);
                  a.download = 'vsb-recovered.json';
                  a.click();
                }}
              >
                Download raw data
              </button>
            )}
          </div>
        )}

        <h1>Visual Shooting Blueprint</h1>
        <p className="picker-lede">
          Break a scene into the branches a crew actually needs — camera, composition, blocking,
          production, audio — so nobody has to ask the director what happens next.
        </p>

        <div className="film-grid">
          {projects.map((p) => (
            <button key={p.id} className="film-card" onClick={() => nav(`/film/${p.id}`)}>
              <h3>{p.title}</h3>
              <p>{p.logline || 'No logline yet.'}</p>
              <div className="film-meta">
                <span>
                  {p.scenes.length} {p.scenes.length === 1 ? 'scene' : 'scenes'}
                </span>
                <span>{p.scenes.reduce((a, s) => a + s.shots.length, 0)} setups</span>
                {p.aspectRatio && <span>{p.aspectRatio}</span>}
              </div>
            </button>
          ))}

          <button className="film-card film-card-new" onClick={() => setNaming(true)}>
            <Plus size={19} />
            Start a new film
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={() => {
              const id = addSampleProject();
              nav(`/film/${id}`);
            }}
          >
            <FilePlus2 size={15} />
            Load the sample film
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <FolderOpen size={15} />
            Open a project file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const p = await importProjectFile(await f.text());
                replaceProject(p);
                setImportError(null);
                nav(`/film/${p.id}`);
              } catch (err) {
                setImportError(err instanceof Error ? err.message : 'That file could not be read.');
              }
              e.target.value = '';
            }}
          />
        </div>
        {importError && (
          <p style={{ color: '#ff8b82', fontSize: 14, marginTop: 12 }}>{importError}</p>
        )}
      </div>

      {naming && (
        <div className="modal-backdrop" onClick={() => setNaming(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Name the film</h2>
            <p>You can change this later.</p>
            <input
              autoFocus
              value={title}
              placeholder="Working title"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setNaming(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={create}>
                Create film
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

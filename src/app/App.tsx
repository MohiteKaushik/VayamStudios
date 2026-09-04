import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Download, Film } from 'lucide-react';
import { useProjects } from '../store/projectStore';
import { FilmPicker } from '../features/projects/FilmPicker';
import { SceneOverview } from '../features/scenes/SceneOverview';
import { SceneWorkspace } from '../features/scenes/SceneWorkspace';
import { ProjectSettings } from '../features/project/ProjectSettings';
import { BlueprintPrint } from '../features/export/BlueprintPrint';
import { downloadBlob, exportProjectFile, slugify } from '../storage/persistence';

function TopBar() {
  const nav = useNavigate();
  const { filmId } = useParams();
  const project = useProjects((s) => s.projects.find((p) => p.id === filmId));
  const saveError = useProjects((s) => s.saveError);

  return (
    <>
      <div className="topbar no-print">
        <button
          className="mark"
          onClick={() => nav('/')}
          aria-label="All films"
          title="All films"
        />
        <div>
          <div className="topbar-title">{project ? project.title : 'Visual Shooting Blueprint'}</div>
          {project?.director && <div className="topbar-sub">Directed by {project.director}</div>}
        </div>
        <span className="spacer" />
        {project && (
          <button
            className="btn btn-sm"
            onClick={async () => {
              const blob = await exportProjectFile(project);
              downloadBlob(blob, `${slugify(project.title)}.vsb.json`);
            }}
            title="Download a self-contained backup, images included"
          >
            <Download size={14} />
            Save project file
          </button>
        )}
        {!project && (
          <span style={{ color: '#7b8894', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Film size={14} /> Plan a scene so nobody has to ask
          </span>
        )}
      </div>
      {saveError && <div className="banner no-print">{saveError}</div>}
    </>
  );
}

export default function App() {
  const init = useProjects((s) => s.init);
  const ready = useProjects((s) => s.ready);

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="shell">
        <div className="topbar">
          <div className="mark" />
          <div className="topbar-title">Visual Shooting Blueprint</div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <Routes>
        <Route path="/" element={<><TopBar /><FilmPicker /></>} />
        <Route path="/film/:filmId" element={<><TopBar /><SceneOverview /></>} />
        <Route path="/film/:filmId/settings" element={<><TopBar /><ProjectSettings /></>} />
        <Route path="/film/:filmId/scene/:sceneId" element={<><TopBar /><SceneWorkspace /></>} />
        <Route path="/film/:filmId/print" element={<><TopBar /><BlueprintPrint /></>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

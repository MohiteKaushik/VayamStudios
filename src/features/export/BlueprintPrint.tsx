import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ChevronLeft } from 'lucide-react';
import { useProjects } from '../../store/projectStore';
import { SceneCard } from './SceneCard';

/**
 * Full-film blueprint. Same card component, every scene, one page each.
 * "Save as PDF" in the browser print dialog is the PDF export.
 */
export function BlueprintPrint() {
  const { filmId } = useParams();
  const nav = useNavigate();
  const project = useProjects((s) => s.projects.find((p) => p.id === filmId));

  useEffect(() => {
    document.title = project ? `${project.title} — shooting blueprint` : 'Shooting blueprint';
  }, [project]);

  if (!project) return <div className="overview"><div className="overview-inner">Film not found.</div></div>;

  const scenes = [...project.scenes].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="overview">
      <div className="overview-inner">
        <div className="overview-head no-print">
          <div style={{ flex: 1 }}>
            <h1>{project.title}</h1>
            <p>
              One page per scene. Use your browser&rsquo;s print dialog and choose &ldquo;Save as
              PDF&rdquo; for a file, or print it for the van wall.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => nav(`/film/${project.id}`)}>
              <ChevronLeft size={15} />
              Back
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={15} />
              Print blueprint
            </button>
          </div>
        </div>

        <div className="print-root" style={{ display: 'block' }}>
          {scenes.map((s) => (
            <div key={s.id} style={{ marginBottom: 22, maxWidth: 800 }}>
              <SceneCard project={project} scene={s} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

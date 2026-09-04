import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ImageDown, Plus, X } from 'lucide-react';
import { useProjects } from '../../store/projectStore';
import { GraphCanvas } from '../graph/GraphCanvas';
import type { Selection } from '../graph/GraphCanvas';
import { MobileNodeList } from '../graph/MobileNodeList';
import { NodeDetailPanel } from '../nodes/NodeDetailPanel';
import { useIsCompact } from '../../components/useMediaQuery';
import { CUSTOM_PRESETS } from '../../data/nodeSchemas';
import { SceneCard } from '../export/SceneCard';
import { exportElementAsPng } from '../export/exportPng';
import { Icon } from '../../components/Icon';

export function SceneWorkspace() {
  const { filmId, sceneId } = useParams();
  const nav = useNavigate();
  const compact = useIsCompact();
  const project = useProjects((s) => s.projects.find((p) => p.id === filmId));
  const addShot = useProjects((s) => s.addShot);
  const addCustomNode = useProjects((s) => s.addCustomNode);

  const scene = project?.scenes.find((s) => s.id === sceneId);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [activeShotId, setActiveShotId] = useState<string | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelection(null);
    setActiveShotId(scene && scene.shots.length > 1 ? scene.shots[0].id : undefined);
  }, [sceneId, scene?.shots.length]);

  const scenes = useMemo(
    () => (project ? [...project.scenes].sort((a, b) => a.orderIndex - b.orderIndex) : []),
    [project]
  );

  if (!project || !scene) {
    return (
      <div className="overview">
        <div className="overview-inner">
          <p>That scene is not in this browser.</p>
        </div>
      </div>
    );
  }

  const select = (s: Selection | null) => {
    setSelection(s);
    if (s?.kind === 'shot') setActiveShotId(s.id);
    if (s?.kind === 'node' && s.shotId) setActiveShotId(s.shotId);
  };

  const crumbNodeLabel = (() => {
    if (!selection) return null;
    if (selection.kind === 'scene') return 'Scene details';
    if (selection.kind === 'shot')
      return `Setup ${scene.shots.find((s) => s.id === selection.id)?.label ?? ''}`;
    const shot = selection.shotId ? scene.shots.find((s) => s.id === selection.shotId) : undefined;
    const node =
      scene.nodes.find((n) => n.id === selection.id) ??
      shot?.nodes.find((n) => n.id === selection.id);
    return shot ? `Setup ${shot.label} › ${node?.label ?? ''}` : (node?.label ?? null);
  })();

  const doExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      // Give webfonts and the reference image a beat to settle.
      await new Promise((r) => setTimeout(r, 350));
      await exportElementAsPng(cardRef.current, `${project.title}-scene-${scene.sceneNumber}`);
    } finally {
      setExporting(false);
    }
  };

  const detail = (
    <NodeDetailPanel project={project} scene={scene} selection={selection} onSelect={select} />
  );

  return (
    <>
      <div className="workspace">
        <div className="canvas-col">
          <div className="crumb">
            <button className="btn btn-ghost btn-sm" onClick={() => nav(`/film/${project.id}`)}>
              <ChevronLeft size={15} />
              All scenes
            </button>
            <span className="crumb-sep">/</span>
            <select
              value={scene.id}
              onChange={(e) => nav(`/film/${project.id}/scene/${e.target.value}`)}
              style={{
                background: 'transparent',
                border: '1px solid #2b333e',
                borderRadius: 6,
                padding: '3px 7px',
                fontSize: 13,
              }}
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id} style={{ background: '#212832' }}>
                  {s.sceneNumber} — {s.title}
                </option>
              ))}
            </select>
            {crumbNodeLabel && (
              <>
                <span className="crumb-sep">/</span>
                <b>{crumbNodeLabel}</b>
              </>
            )}
            <span className="spacer" />
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
              <Plus size={14} />
              Branch
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => addShot(project.id, scene.id)}>
              <Plus size={14} />
              Setup
            </button>
            <button className="btn btn-ghost btn-sm" onClick={doExport} disabled={exporting}>
              <ImageDown size={14} />
              {exporting ? 'Exporting…' : 'Scene card'}
            </button>
          </div>

          {compact ? (
            <MobileNodeList scene={scene} crew={project.crew} onSelect={select} />
          ) : (
            <GraphCanvas
              scene={scene}
              crew={project.crew}
              selection={selection}
              activeShotId={activeShotId}
              onSelect={select}
            />
          )}
        </div>

        {!compact && detail}
      </div>

      {compact && selection && (
        <>
          <div className="sheet-backdrop" onClick={() => setSelection(null)} />
          <div className="sheet">
            <button
              className="icon-btn"
              style={{ position: 'absolute', right: 12, top: 12, zIndex: 3 }}
              onClick={() => setSelection(null)}
              aria-label="Close"
            >
              <X size={17} />
            </button>
            {detail}
          </div>
        </>
      )}

      {adding && (
        <div className="modal-backdrop" onClick={() => setAdding(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add a branch to scene {scene.sceneNumber}</h2>
            <p>Camera and composition belong to a setup. Everything else belongs to the scene.</p>
            <div className="preset-grid">
              {CUSTOM_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className="preset"
                  onClick={() => {
                    const id = addCustomNode(project.id, scene.id, p.label, p.iconKey);
                    setAdding(false);
                    select({ kind: 'node', id });
                  }}
                >
                  <Icon name={p.iconKey} size={16} />
                  {p.label}
                </button>
              ))}
            </div>
            <button
              className="btn"
              onClick={() => {
                const id = addCustomNode(project.id, scene.id, 'New branch', 'sparkles');
                setAdding(false);
                select({ kind: 'node', id });
              }}
            >
              <Plus size={15} />
              Blank branch
            </button>
          </div>
        </div>
      )}

      {/* Off-screen render target for PNG export. */}
      <div className="export-stage" aria-hidden>
        <SceneCard ref={cardRef} project={project} scene={scene} />
      </div>
    </>
  );
}

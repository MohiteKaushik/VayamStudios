import {
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import type { Project, Scene, SceneNode, Shot } from '../../lib/types';
import { SCENE_SCOPED_TYPES, SHOT_SCOPED_TYPES } from '../../lib/types';
import type { Selection } from '../../lib/selection';
import { NODE_TYPES, STATUS_META } from '../../data/nodeSchemas';
import { summarizeNode, summarizeShot } from '../../lib/summary';
import { resolveOwner } from '../../lib/resolveOwner';
import { Icon } from '../../components/Icon';
import { AssetImage } from '../../components/AssetImage';

/**
 * One setup in the vertical flow: collapsed to a readable card, expanded to the
 * five things a crew member needs.
 *
 * Camera and Composition belong to this setup. Blocking, Production and Audio
 * belong to the SCENE and are shown here inherited, badged, because a crew
 * member reading a setup needs the whole picture — while the director still
 * enters a scene's blocking once rather than once per setup.
 *
 * The body is not rendered at all while collapsed. With one setup open at a
 * time, a forty-setup film mounts one detail block, not forty.
 */

interface Props {
  project: Project;
  scene: Scene;
  shot: Shot;
  index: number;
  total: number;
  expanded: boolean;
  /** Filtering is on and this setup is not the selected person's. */
  dimmed: boolean;
  onToggle: () => void;
  onSelect: (s: Selection) => void;
  onMove: (delta: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

interface Row {
  node: SceneNode;
  scope: 'shot' | 'scene';
}

/** CAMERA, COMPOSITION, then BLOCKING, PRODUCTION, AUDIO, then any custom node. */
function buildRows(scene: Scene, shot: Shot): Row[] {
  const pick = (nodes: SceneNode[], type: string) => nodes.find((n) => n.type === type);

  const shotRows: Row[] = SHOT_SCOPED_TYPES.map((t) => pick(shot.nodes, t))
    .filter((n): n is SceneNode => Boolean(n))
    .map((node) => ({ node, scope: 'shot' as const }));

  const mandatory: Row[] = SCENE_SCOPED_TYPES.map((t) => pick(scene.nodes, t))
    .filter((n): n is SceneNode => Boolean(n))
    .map((node) => ({ node, scope: 'scene' as const }));

  const custom: Row[] = scene.nodes
    .filter((n) => !SCENE_SCOPED_TYPES.includes(n.type))
    .map((node) => ({ node, scope: 'scene' as const }));

  return [...shotRows, ...mandatory, ...custom];
}

export function ShotCard({
  project,
  scene,
  shot,
  index,
  total,
  expanded,
  dimmed,
  onToggle,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
}: Props) {
  const status = STATUS_META[shot.status];
  const thumb = shot.referenceAssetIds[0];
  const headline = summarizeShot(shot);
  const hasVideo = Boolean(shot.video?.url || shot.video?.assetId);

  return (
    <article
      className={`shot-card${expanded ? ' is-open' : ''}${dimmed ? ' is-dim' : ''}`}
      aria-current={expanded ? 'true' : undefined}
    >
      <button className="shot-head" onClick={onToggle} aria-expanded={expanded}>
        <span className="shot-badge" style={{ borderColor: status.color }}>
          {shot.label}
        </span>

        <span className="shot-head-text">
          <span className="shot-title">{shot.description || 'Untitled setup'}</span>
          <span className="shot-sub">{headline || 'Nothing planned yet'}</span>
        </span>

        {hasVideo && (
          <span className="shot-vid" title="Has a reference clip">
            <Play size={11} />
          </span>
        )}

        {thumb && (
          <span className="shot-thumb">
            <AssetImage id={thumb} alt="" />
          </span>
        )}

        <span className="shot-chev" aria-hidden>
          <ChevronDown size={17} />
        </span>
      </button>

      {expanded && (
        <div className="shot-body">
          {shot.referenceAssetIds.length > 0 && (
            <div className="shot-refs">
              {shot.referenceAssetIds.map((id) => (
                <AssetImage key={id} id={id} className="shot-ref" alt="Reference" />
              ))}
            </div>
          )}

          <div className="cat-list">
            {buildRows(scene, shot).map(({ node, scope }) => {
              const def = NODE_TYPES[node.type];
              const owner = resolveOwner(node, project.crew);
              return (
                <button
                  key={node.id}
                  className="cat-row"
                  style={{ ['--cat' as string]: def.color }}
                  onClick={() =>
                    onSelect({
                      kind: 'node',
                      id: node.id,
                      shotId: scope === 'shot' ? shot.id : undefined,
                    })
                  }
                >
                  <span className="cat-icon">
                    <Icon name={node.iconKey} size={16} color={def.color} />
                  </span>
                  <span className="cat-text">
                    <span className="cat-label">
                      {node.label}
                      {scope === 'scene' && (
                        <span className="cat-scope" title="Belongs to the scene, shared by every setup">
                          Scene
                        </span>
                      )}
                    </span>
                    <span className="cat-sum">{summarizeNode(node) || 'Nothing planned yet'}</span>
                  </span>
                  {owner && <span className="cat-owner">{owner.name}</span>}
                </button>
              );
            })}
          </div>

          <div className="shot-tools">
            <button
              className="tile-act"
              disabled={index === 0}
              title="Move earlier in the shooting order"
              aria-label={`Move setup ${shot.label} earlier`}
              onClick={() => onMove(-1)}
            >
              <ChevronUp size={15} />
            </button>
            <button
              className="tile-act"
              disabled={index === total - 1}
              title="Move later in the shooting order"
              aria-label={`Move setup ${shot.label} later`}
              onClick={() => onMove(1)}
            >
              <ChevronDown size={15} />
            </button>
            <button
              className="tile-act"
              title="Duplicate this setup with its camera data"
              aria-label={`Duplicate setup ${shot.label}`}
              onClick={onDuplicate}
            >
              <Copy size={14} />
            </button>
            <button
              className="tile-act tile-act-danger"
              disabled={total <= 1}
              title={total <= 1 ? 'A scene keeps at least one setup' : 'Delete this setup'}
              aria-label={`Delete setup ${shot.label}`}
              onClick={onDelete}
            >
              <Trash2 size={14} />
            </button>

            <span className="spacer" />

            <button
              className="btn btn-sm"
              onClick={() => onSelect({ kind: 'shot', id: shot.id })}
            >
              <Pencil size={13} />
              Setup details
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

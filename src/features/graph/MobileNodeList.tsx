import type { CrewMember, Scene, SceneNode } from '../../lib/types';
import { NODE_TYPES, STATUS_META } from '../../data/nodeSchemas';
import { Icon } from '../../components/Icon';
import { resolveOwner } from '../../lib/resolveOwner';
import type { Selection } from './GraphCanvas';
import { ChevronRight } from 'lucide-react';

interface Props {
  scene: Scene;
  crew: CrewMember[];
  onSelect: (s: Selection) => void;
}

function summary(n: SceneNode): string {
  const def = NODE_TYPES[n.type];
  for (const f of def.fields) {
    const v = n.fields[f.key];
    if (Array.isArray(v) && v.length) return v.join(', ');
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return 'Nothing planned yet';
}

function Row({
  node,
  crew,
  onSelect,
  shotId,
}: {
  node: SceneNode;
  crew: CrewMember[];
  onSelect: Props['onSelect'];
  shotId?: string;
}) {
  const color = NODE_TYPES[node.type].color;
  const owner = resolveOwner(node, crew);
  return (
    <button
      className="m-node"
      style={{ borderLeftColor: color }}
      onClick={() => onSelect({ kind: 'node', id: node.id, shotId })}
    >
      <Icon name={node.iconKey} size={19} color={color} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="lbl" style={{ display: 'block' }}>
          {node.label}
        </span>
        <span className="sub" style={{ display: 'block' }}>
          {summary(node)}
          {owner ? ` — ${owner.name}` : ''}
        </span>
      </span>
      <ChevronRight size={17} color="#7b8894" />
    </button>
  );
}

export function MobileNodeList({ scene, crew, onSelect }: Props) {
  const st = STATUS_META[scene.status];
  const shots = [...scene.shots].sort((a, b) => a.orderIndex - b.orderIndex);
  const single = shots.length === 1;

  return (
    <div className="mobile-list">
      <button
        className="m-scene"
        style={{ textAlign: 'left', width: '100%' }}
        onClick={() => onSelect({ kind: 'scene', id: scene.id })}
      >
        <div className="scene-tile-top">
          <span className="scene-num">{scene.sceneNumber}</span>
          <span className="status-dot">
            <i style={{ background: st.color }} />
            {st.label}
          </span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 17 }}>{scene.title}</div>
        <div className="scene-slug" style={{ marginTop: 4 }}>
          {[scene.intExt, scene.location, scene.dayNight].filter(Boolean).join(' · ')}
        </div>
      </button>

      <div className="m-connector" />

      {single &&
        shots[0].nodes.map((n) => (
          <Row key={n.id} node={n} crew={crew} onSelect={onSelect} shotId={shots[0].id} />
        ))}

      {scene.nodes.map((n) => (
        <Row key={n.id} node={n} crew={crew} onSelect={onSelect} />
      ))}

      {!single &&
        shots.map((s) => (
          <div key={s.id}>
            <div className="m-shot-head">
              SETUP {s.label} — {s.description || 'Untitled setup'}
            </div>
            {s.nodes.map((n) => (
              <Row key={n.id} node={n} crew={crew} onSelect={onSelect} shotId={s.id} />
            ))}
          </div>
        ))}
    </div>
  );
}

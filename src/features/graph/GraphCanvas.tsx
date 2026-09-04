import { useMemo } from 'react';
import type { Scene, SceneNode } from '../../lib/types';
import { layoutScene } from '../../lib/layout';
import { NODE_TYPES, STATUS_META } from '../../data/nodeSchemas';
import { Icon } from '../../components/Icon';
import { resolveOwner } from '../../lib/resolveOwner';
import type { CrewMember } from '../../lib/types';

export interface Selection {
  kind: 'scene' | 'shot' | 'node';
  id: string;
  shotId?: string;
}

interface Props {
  scene: Scene;
  crew: CrewMember[];
  selection: Selection | null;
  activeShotId?: string;
  onSelect: (s: Selection) => void;
}

function nodeSummary(n: SceneNode): string {
  const def = NODE_TYPES[n.type];
  const parts: string[] = [];
  for (const f of def.fields) {
    const v = n.fields[f.key];
    if (!v) continue;
    if (Array.isArray(v)) {
      if (v.length) parts.push(v.slice(0, 2).join(', '));
    } else if (v.trim()) {
      parts.push(v.trim());
    }
    if (parts.length >= 2) break;
  }
  return parts.join('  ·  ');
}

export function GraphCanvas({ scene, crew, selection, activeShotId, onSelect }: Props) {
  const nodeColor = (n: SceneNode) => NODE_TYPES[n.type].color;

  const layout = useMemo(
    () => layoutScene(scene, { activeShotId, nodeColor }),
    [scene, activeShotId]
  );

  const selectedKey =
    selection?.kind === 'scene'
      ? `scene:${selection.id}`
      : selection?.kind === 'shot'
        ? `shot:${selection.id}`
        : selection
          ? `node:${selection.id}`
          : null;

  const connectedKeys = useMemo(() => {
    if (!selectedKey) return new Set<string>();
    const out = new Set<string>();
    for (const e of layout.edges) {
      if (e.to === selectedKey || e.from === selectedKey) {
        out.add(e.from);
        out.add(e.to);
      }
    }
    return out;
  }, [layout.edges, selectedKey]);

  return (
    <div className="canvas-scroll">
      <div
        className="canvas-inner"
        style={{ width: layout.width, height: layout.height, minWidth: '100%' }}
      >
        <svg className="canvas-edges" width={layout.width} height={layout.height}>
          {layout.edges.map((e) => {
            const lit = selectedKey ? e.from === selectedKey || e.to === selectedKey : false;
            return (
              <path
                key={e.key}
                d={e.path}
                fill="none"
                stroke={lit ? e.color : '#39434f'}
                strokeWidth={lit ? 2.2 : 1.4}
                strokeLinecap="round"
                style={{ transition: 'stroke 140ms ease, stroke-width 140ms ease' }}
              />
            );
          })}
        </svg>

        {layout.items.map((it) => {
          const isSel = it.key === selectedKey;
          const dim = Boolean(selectedKey) && !isSel && !connectedKeys.has(it.key);
          const base: React.CSSProperties = {
            left: it.x,
            top: it.y,
            width: it.w,
            minHeight: it.h,
            opacity: dim ? 0.42 : 1,
          };

          if (it.kind === 'scene') {
            const st = STATUS_META[scene.status];
            return (
              <button
                key={it.key}
                className={`gnode gnode-scene${isSel ? ' gnode-selected' : ''}`}
                style={{ ...base, borderColor: isSel ? st.color : undefined }}
                onClick={() => onSelect({ kind: 'scene', id: scene.id })}
              >
                <div className="gn-num">{scene.sceneNumber}</div>
                <div className="gn-title">{scene.title}</div>
                <div className="gn-slug">
                  {[scene.intExt, scene.location, scene.dayNight].filter(Boolean).join(' · ') ||
                    'No slugline yet'}
                </div>
              </button>
            );
          }

          if (it.kind === 'shot' && it.shot) {
            const s = it.shot;
            const open = s.id === activeShotId;
            return (
              <button
                key={it.key}
                className={`gnode gnode-shot${isSel ? ' gnode-selected' : ''}`}
                style={{ ...base, borderStyle: open ? 'solid' : 'dashed' }}
                onClick={() => onSelect({ kind: 'shot', id: s.id })}
              >
                <div className="gn-shot-label">{s.label}</div>
                <div className="gn-shot-desc">{s.description || 'Setup'}</div>
              </button>
            );
          }

          const n = it.node!;
          const color = nodeColor(n);
          const owner = resolveOwner(n, crew);
          return (
            <button
              key={it.key}
              className={`gnode${isSel ? ' gnode-selected' : ''}`}
              style={{ ...base, borderColor: isSel ? color : undefined }}
              onClick={() => onSelect({ kind: 'node', id: n.id, shotId: it.shotId })}
            >
              <div className="gn-head" style={{ color }}>
                <Icon name={n.iconKey} size={15} />
                {n.label}
              </div>
              <div className="gn-sum">{nodeSummary(n) || 'Nothing planned yet'}</div>
              {owner && <div className="gn-owner">{owner.name}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

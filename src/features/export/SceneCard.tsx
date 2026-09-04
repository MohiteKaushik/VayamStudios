import { forwardRef, useEffect, useState } from 'react';
import type { Project, Scene, SceneNode } from '../../lib/types';
import { NODE_TYPES, STATUS_META } from '../../data/nodeSchemas';
import { resolveOwner } from '../../lib/resolveOwner';
import { BlockingDiagram } from '../blocking/BlockingDiagram';
import { getAssetDataUrl } from '../../storage/assets';

/**
 * The delivery format. The node tree is an authoring tool; nobody opens a graph
 * on set. This is what gets printed, pinned to the van wall, and shared.
 *
 * IMPORTANT: every colour here is a flat hex literal and every style is inline.
 * html-to-image cannot resolve CSS custom properties or oklch()/color-mix(),
 * and drops those colours silently from the exported PNG.
 */

const INK = '#23262a';
const SOFT = '#5c6167';
const LINE = '#cfc9ba';
const PAPER = '#ebe7de';
const PAPER_HI = '#f6f3ec';

const SANS = "'Barlow', Helvetica, Arial, sans-serif";
const COND = "'Barlow Condensed', 'Barlow', Arial, sans-serif";
const MONO = "'IBM Plex Mono', Menlo, monospace";

function filled(n: SceneNode): { label: string; value: string }[] {
  const def = NODE_TYPES[n.type];
  const out: { label: string; value: string }[] = [];
  for (const f of def.fields) {
    if (!f.onCard) continue;
    const v = n.fields[f.key];
    if (Array.isArray(v)) {
      const clean = v.filter((x) => x.trim());
      if (clean.length) out.push({ label: f.label, value: clean.join(', ') });
    } else if (typeof v === 'string' && v.trim()) {
      out.push({ label: f.label, value: v.trim() });
    }
  }
  return out;
}

function NodeBlock({ node, project }: { node: SceneNode; project: Project }) {
  const def = NODE_TYPES[node.type];
  const rows = filled(node);
  const owner = resolveOwner(node, project.crew);
  if (!rows.length && !owner) return null;

  return (
    <div
      style={{
        borderLeft: `3px solid ${def.color}`,
        background: PAPER_HI,
        borderRadius: 6,
        padding: '10px 12px',
        marginBottom: 8,
        breakInside: 'avoid',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <span style={{ fontFamily: COND, fontSize: 19, fontWeight: 600, color: INK }}>
          {node.label}
        </span>
        {owner && (
          <span style={{ fontFamily: MONO, fontSize: 11, color: SOFT }}>{owner.name}</span>
        )}
      </div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: SOFT, minWidth: 96, flex: '0 0 96px' }}>
            {r.label}
          </span>
          <span style={{ fontSize: 13.5, color: INK, whiteSpace: 'pre-wrap' }}>{r.value}</span>
        </div>
      ))}
      {node.checklist.filter((c) => c.text.trim()).length > 0 && (
        <div style={{ marginTop: 6 }}>
          {node.checklist
            .filter((c) => c.text.trim())
            .map((c) => (
              <div key={c.id} style={{ fontSize: 13, color: INK }}>
                {c.done ? '\u2611' : '\u2610'} {c.text}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  project: Project;
  scene: Scene;
}

export const SceneCard = forwardRef<HTMLDivElement, Props>(function SceneCard(
  { project, scene },
  ref
) {
  const [refImg, setRefImg] = useState<string | null>(null);
  const first = scene.referenceAssetIds[0];

  useEffect(() => {
    let live = true;
    if (!first) {
      setRefImg(null);
      return;
    }
    // Data URL, not object URL — object URLs do not survive html-to-image.
    getAssetDataUrl(first).then((d) => live && setRefImg(d));
    return () => {
      live = false;
    };
  }, [first]);

  const st = STATUS_META[scene.status];
  const blocking = scene.nodes.find((n) => n.type === 'BLOCKING');
  const shots = [...scene.shots].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div
      ref={ref}
      className="scene-card"
      style={{
        width: 800,
        background: PAPER,
        color: INK,
        fontFamily: SANS,
        padding: 26,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          borderBottom: `2px solid ${INK}`,
          paddingBottom: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: COND,
            fontSize: 62,
            fontWeight: 700,
            lineHeight: 0.82,
            color: INK,
          }}
        >
          {scene.sceneNumber}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: COND, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>
            {scene.title}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: SOFT, marginTop: 5 }}>
            {[scene.intExt, scene.location, scene.dayNight, scene.shootDay]
              .filter(Boolean)
              .join('  \u00b7  ')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: SOFT }}>{project.title}</div>
          <div style={{ fontSize: 12.5, color: st.color, fontWeight: 600, marginTop: 3 }}>
            {st.label}
          </div>
        </div>
      </div>

      {scene.action && (
        <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 14, maxWidth: '70ch' }}>
          {scene.action}
        </div>
      )}

      {/* Visuals row — omitted entirely when there is nothing visual to show */}
      {(refImg || blocking?.blocking) && (
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        {refImg && (
          <img
            src={refImg}
            alt=""
            style={{
              width: blocking?.blocking ? 300 : '100%',
              maxHeight: 200,
              objectFit: 'cover',
              borderRadius: 6,
              border: `1px solid ${LINE}`,
            }}
          />
        )}
        {blocking?.blocking && (
          <div
            style={{
              flex: 1,
              border: `1px solid ${LINE}`,
              borderRadius: 6,
              overflow: 'hidden',
              background: PAPER_HI,
            }}
          >
            <BlockingDiagram
              data={blocking.blocking}
              characters={project.characters}
              readOnly
            />
          </div>
        )}
      </div>
      )}

      {/* Scene-scoped nodes */}
      {scene.nodes.map((n) => (
        <NodeBlock key={n.id} node={n} project={project} />
      ))}

      {/* Setups */}
      <div
        style={{
          fontFamily: COND,
          fontSize: 21,
          fontWeight: 600,
          marginTop: 16,
          marginBottom: 8,
          borderTop: `1px solid ${LINE}`,
          paddingTop: 10,
        }}
      >
        {shots.length} {shots.length === 1 ? 'setup' : 'setups'}
      </div>

      {shots.map((s) => (
        <div
          key={s.id}
          style={{
            border: `1px solid ${LINE}`,
            borderRadius: 6,
            padding: '10px 12px',
            marginBottom: 8,
            breakInside: 'avoid',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: COND, fontSize: 24, fontWeight: 700 }}>{s.label}</span>
            <span style={{ fontSize: 14 }}>{s.description || 'Setup'}</span>
          </div>
          {s.nodes.map((n) => {
            const rows = filled(n);
            if (!rows.length) return null;
            const def = NODE_TYPES[n.type];
            return (
              <div key={n.id} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    width: 4,
                    borderRadius: 2,
                    background: def.color,
                    flex: '0 0 4px',
                  }}
                />
                <span style={{ fontSize: 13, color: INK }}>
                  <b style={{ fontWeight: 600 }}>{n.label}</b>{' '}
                  {rows.map((r) => `${r.label}: ${r.value}`).join('  \u00b7  ')}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {scene.notes && (
        <div style={{ marginTop: 12, fontSize: 13, color: SOFT, borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
          {scene.notes}
        </div>
      )}
    </div>
  );
});

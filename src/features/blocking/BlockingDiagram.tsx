import { useRef, useState } from 'react';
import type { BlockingData, Character } from '../../lib/types';

/**
 * Deliberately 2D and deliberately simple: a top-down floor plan.
 * Coordinates are normalised 0..1 so the same data renders at any size and
 * exports cleanly to the scene card.
 */

const W = 640;
const H = 400;

interface Props {
  data: BlockingData;
  characters: Character[];
  onChange?: (d: BlockingData) => void;
  readOnly?: boolean;
}

type Drag = { kind: 'mark'; index: number } | { kind: 'camera' } | null;

function wedgePath(cx: number, cy: number, headingDeg: number, fovDeg: number, len: number) {
  const a = ((headingDeg - 90 - fovDeg / 2) * Math.PI) / 180;
  const b = ((headingDeg - 90 + fovDeg / 2) * Math.PI) / 180;
  const x1 = cx + Math.cos(a) * len;
  const y1 = cy + Math.sin(a) * len;
  const x2 = cx + Math.cos(b) * len;
  const y2 = cy + Math.sin(b) * len;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${len} ${len} 0 0 1 ${x2} ${y2} Z`;
}

export function BlockingDiagram({ data, characters, onChange, readOnly }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag>(null);

  const charById = (id: string) => characters.find((c) => c.id === id);

  function toLocal(e: React.PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  function onMove(e: React.PointerEvent) {
    if (!drag || readOnly || !onChange) return;
    const p = toLocal(e);
    if (!p) return;
    if (drag.kind === 'camera') {
      onChange({ ...data, camera: { ...data.camera, x: p.x, y: p.y } });
    } else {
      const marks = data.marks.map((m, i) => (i === drag.index ? { ...m, x: p.x, y: p.y } : m));
      onChange({ ...data, marks });
    }
  }

  const cam = data.camera;
  const camX = cam.x * W;
  const camY = cam.y * H;

  return (
    <svg
      ref={svgRef}
      className="blocking-stage"
      viewBox={`0 0 ${W} ${H}`}
      onPointerMove={onMove}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
      style={{ cursor: readOnly ? 'default' : 'crosshair' }}
    >
      <rect x={0} y={0} width={W} height={H} fill="#f6f3ec" />

      {/* Floor grid — a metre-ish reference, not decoration. */}
      {Array.from({ length: 15 }, (_, i) => (
        <line key={`v${i}`} x1={i * 40 + 20} y1={0} x2={i * 40 + 20} y2={H} stroke="#e2dccd" strokeWidth={1} />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 40 + 20} x2={W} y2={i * 40 + 20} stroke="#e2dccd" strokeWidth={1} />
      ))}

      {/* Camera field of view */}
      <path d={wedgePath(camX, camY, cam.heading, cam.fovDeg, 460)} fill="#e8b04b" opacity={0.15} />
      <path
        d={wedgePath(camX, camY, cam.heading, cam.fovDeg, 460)}
        fill="none"
        stroke="#c99433"
        strokeWidth={1.2}
        strokeDasharray="5 5"
      />

      {/* Movement paths, drawn behind the pucks */}
      {data.marks.map((m, i) => {
        if (!m.path.length) return null;
        const pts = [{ x: m.x, y: m.y }, ...m.path];
        const d = pts.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x * W} ${p.y * H}`).join(' ');
        const c = charById(m.characterId);
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        const ang = (Math.atan2(last.y - prev.y, last.x - prev.x) * 180) / Math.PI;
        return (
          <g key={`p${i}`}>
            <path d={d} fill="none" stroke={c?.color ?? '#8d857a'} strokeWidth={2.4} strokeDasharray="7 5" opacity={0.85} />
            <polygon
              points="0,-5 11,0 0,5"
              fill={c?.color ?? '#8d857a'}
              transform={`translate(${last.x * W} ${last.y * H}) rotate(${ang})`}
            />
          </g>
        );
      })}

      {/* Character pucks */}
      {data.marks.map((m, i) => {
        const c = charById(m.characterId);
        const x = m.x * W;
        const y = m.y * H;
        const fa = ((m.facing - 90) * Math.PI) / 180;
        return (
          <g
            key={`m${i}`}
            style={{ cursor: readOnly ? 'default' : 'grab' }}
            onPointerDown={(e) => {
              if (readOnly) return;
              (e.target as Element).setPointerCapture?.(e.pointerId);
              setDrag({ kind: 'mark', index: i });
            }}
          >
            <line
              x1={x}
              y1={y}
              x2={x + Math.cos(fa) * 30}
              y2={y + Math.sin(fa) * 30}
              stroke={c?.color ?? '#8d857a'}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={x} cy={y} r={15} fill={c?.color ?? '#8d857a'} stroke="#23262a" strokeWidth={1.6} />
            <text
              x={x}
              y={y + 4.5}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="#23262a"
              fontFamily="Barlow, sans-serif"
            >
              {(c?.name ?? '?').charAt(0).toUpperCase()}
            </text>
            <text
              x={x}
              y={y + 32}
              textAnchor="middle"
              fontSize={13}
              fill="#23262a"
              fontFamily="Barlow, sans-serif"
              fontWeight={600}
            >
              {c?.name ?? 'Unassigned'}
            </text>
          </g>
        );
      })}

      {/* Camera puck */}
      <g
        style={{ cursor: readOnly ? 'default' : 'grab' }}
        onPointerDown={(e) => {
          if (readOnly) return;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDrag({ kind: 'camera' });
        }}
      >
        <rect
          x={camX - 17}
          y={camY - 12}
          width={34}
          height={24}
          rx={4}
          fill="#23262a"
          transform={`rotate(${cam.heading} ${camX} ${camY})`}
        />
        <polygon
          points={`${camX + 17},${camY - 7} ${camX + 27},${camY - 12} ${camX + 27},${camY + 12} ${camX + 17},${camY + 7}`}
          fill="#23262a"
          transform={`rotate(${cam.heading - 90} ${camX} ${camY})`}
        />
        <text
          x={camX}
          y={camY + 34}
          textAnchor="middle"
          fontSize={12}
          fill="#23262a"
          fontFamily="'IBM Plex Mono', monospace"
        >
          CAM {Math.round(cam.fovDeg)}&#176;
        </text>
      </g>
    </svg>
  );
}

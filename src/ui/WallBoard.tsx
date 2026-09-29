import { useMemo } from 'react';
import { BOARD_H, BOARD_W, FLAGS, HOLDS, mulberry32, routePolyline } from '../game/puzzle';
import { HOLD_COLORS, LAGUNA, SNOW_PATH, flagPennant } from '../game/wallArt';

const COLOR_NAME: Record<string, string> = { blue: 'azul', orange: 'naranja', gray: 'gris' };

export function blobPath(x: number, y: number, r: number, seed: number) {
  const rand = mulberry32(seed);
  const n = 9;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.78 + rand() * 0.35);
    d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr * 0.85).toFixed(1)}`;
  }
  return d + 'Z';
}

/** Rough position words so screen-reader users can follow the wall too. */
function where(x: number, y: number) {
  const v = y < 140 ? 'arriba' : y < 280 ? 'al medio' : 'abajo';
  const h = x < 100 ? 'a la izquierda' : x > 200 ? 'a la derecha' : 'al centro';
  return `${v}, ${h}`;
}

interface Props {
  marks: number[];
  onToggleMark: (i: number) => void;
  className?: string;
  /** Unique prefix for SVG ids. */
  idPrefix?: string;
}

/**
 * The climbing board (wall dialog) drawn from the puzzle data. The 3D texture
 * draws the same data on a canvas, so both show the identical route.
 */
export function WallBoard({ marks, onToggleMark, className, idPrefix = 'wb' }: Props) {
  const line = useMemo(() => routePolyline().map((p) => `${p.x},${p.y}`).join(' '), []);
  const paths = useMemo(() => HOLDS.map((h, i) => blobPath(h.x, h.y, h.r, i + 1)), []);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      role="group"
      aria-label="Muro de escalada: nieve arriba, una laguna abajo, tres banderas rojas y una línea de magnesio que sube desde la laguna pasando por varias presas"
    >
      <defs>
        <linearGradient id={`${idPrefix}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b3448" />
          <stop offset="1" stopColor="#1d2433" />
        </linearGradient>
        <pattern id={`${idPrefix}-t`} width="22" height="22" patternUnits="userSpaceOnUse">
          <rect x="12" y="14" width="2" height="2" fill="rgba(0,0,0,.4)" />
        </pattern>
      </defs>
      <rect width={BOARD_W} height={BOARD_H} rx="10" fill={`url(#${idPrefix}-g)`} />
      <rect width={BOARD_W} height={BOARD_H} rx="10" fill={`url(#${idPrefix}-t)`} />
      <polyline points={line} fill="none" stroke="rgba(243,230,204,.5)" strokeWidth="2" strokeDasharray="3 6" />
      {HOLDS.map((h, i) => {
        const marked = marks.includes(i);
        const body = (
          <>
            <path d={paths[i]} fill={HOLD_COLORS[h.color]} />
            <circle cx={h.x - 2} cy={h.y - 3} r={h.r * 0.35} fill="rgba(255,255,255,.28)" />
            {marked && <path className="chalk-mark" d={blobPath(h.x, h.y, h.r * 0.75, i + 99)} fill="#fbf8f1" opacity=".9" />}
          </>
        );
        const label = `Presa ${COLOR_NAME[h.color]} ${where(h.x, h.y)}${h.segment !== undefined ? ', sobre la línea' : ''}${
          marked ? ', marcada' : ''
        }`;
        return (
          <g
            key={i}
            className="hold-btn"
            role="button"
            tabIndex={0}
            aria-pressed={marked}
            aria-label={label}
            onClick={() => onToggleMark(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleMark(i);
              }
            }}
          >
            <circle cx={h.x} cy={h.y} r={20} fill="transparent" />
            {body}
          </g>
        );
      })}
      {FLAGS.map((f, i) => (
        <g key={i} role="img" aria-label={`Bandera roja ${where(f.x, f.y)}`}>
          <line x1={f.x} y1={f.y + 12} x2={f.x} y2={f.y - 16} stroke="#f3e6cc" strokeWidth="2" />
          <path d={flagPennant(f.x, f.y)} fill="#e2483d" />
        </g>
      ))}
      <path d={SNOW_PATH} fill="#eef3f8" />
      <g role="img" aria-label="Laguna al pie del muro">
        <ellipse cx={LAGUNA.cx} cy={LAGUNA.cy} rx={LAGUNA.rx} ry={LAGUNA.ry} fill="#3f8fc4" />
        <text x={LAGUNA.cx} y={LAGUNA.cy + 3} textAnchor="middle" fill="#f3e6cc" fontFamily="Georgia, serif" fontWeight="600" fontSize="9">
          LAGUNA
        </text>
      </g>
    </svg>
  );
}

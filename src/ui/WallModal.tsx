import { useMemo } from 'react';
import { BOARD_H, BOARD_W, FLAGS, HOLDS, ROUTE_BASE, mulberry32, routePolyline } from '../game/puzzle';
import { HOLD_COLORS } from '../scene/textures';
import { Modal } from './Modal';

interface Props {
  foundClue: boolean;
  marks: number[];
  onToggleMark: (i: number) => void;
  onClearMarks: () => void;
  onClose: () => void;
  onGoToBag: () => void;
  onGoToSafe: () => void;
}

const COLOR_NAME: Record<string, string> = { blue: 'azul', orange: 'naranja', gray: 'gris' };

function blobPath(x: number, y: number, r: number, seed: number) {
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

export function WallModal({ foundClue, marks, onToggleMark, onClearMarks, onClose, onGoToBag, onGoToSafe }: Props) {
  const line = useMemo(() => routePolyline().map((p) => `${p.x},${p.y}`).join(' '), []);
  const paths = useMemo(() => HOLDS.map((h, i) => blobPath(h.x, h.y, h.r, i + 1)), []);

  return (
    <Modal title="El muro de la ruta" kicker="Objeto 2 de 3" onClose={onClose} wide>
      <div className="wall-layout">
        <svg
          className="wall-art"
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          role="group"
          aria-label="Muro de escalada con presas de colores, tres banderas y una línea de magnesio que sube desde la base"
        >
          <defs>
            <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2b3448" />
              <stop offset="1" stopColor="#1d2433" />
            </linearGradient>
            <pattern id="tnuts" width="22" height="22" patternUnits="userSpaceOnUse">
              <rect x="12" y="14" width="2" height="2" fill="rgba(0,0,0,.4)" />
            </pattern>
          </defs>
          <rect width={BOARD_W} height={BOARD_H} rx="10" fill="url(#wallG)" />
          <rect width={BOARD_W} height={BOARD_H} rx="10" fill="url(#tnuts)" />
          <polyline points={line} fill="none" stroke="rgba(243,230,204,.5)" strokeWidth="2" strokeDasharray="3 6" />
          {HOLDS.map((h, i) => {
            const marked = marks.includes(i);
            const tappable = h.color === 'blue';
            const body = (
              <>
                <path d={paths[i]} fill={HOLD_COLORS[h.color]} />
                <circle cx={h.x - 2} cy={h.y - 3} r={h.r * 0.35} fill="rgba(255,255,255,.28)" />
                {marked && <path className="chalk-mark" d={blobPath(h.x, h.y, h.r * 0.75, i + 99)} fill="#fbf8f1" opacity=".9" />}
              </>
            );
            if (!tappable) return <g key={i} aria-hidden="true">{body}</g>;
            return (
              <g
                key={i}
                className="hold-btn"
                role="button"
                tabIndex={0}
                aria-pressed={marked}
                aria-label={`Presa ${COLOR_NAME[h.color]}${marked ? ', marcada con magnesio' : ''}`}
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
          {FLAGS.map((f) => (
            <g key={f.label} aria-label={`Bandera ${f.label}`} role="img">
              <line x1={f.x} y1={f.y + 12} x2={f.x} y2={f.y - 16} stroke="#f3e6cc" strokeWidth="2" />
              <path d={`M${f.x} ${f.y - 16} L${f.x + 18} ${f.y - 10} L${f.x} ${f.y - 4}Z`} fill="#e2483d" />
              <text x={f.x + 5} y={f.y + 11} fill="#f3e6cc" fontFamily="Georgia, serif" fontWeight="700" fontSize="12">
                {f.label}
              </text>
            </g>
          ))}
          <text x={ROUTE_BASE.x} y={ROUTE_BASE.y + 13} textAnchor="middle" fill="#f3e6cc" fontFamily="Georgia, serif" fontWeight="600" fontSize="13">
            BASE
          </text>
        </svg>

        <div className="wall-side">
          {foundClue ? (
            <>
              <p className="lead">
                La ficha lo dice: cada bandera es una cumbre. Sigue la línea de magnesio desde la BASE y cuenta las{' '}
                <em className="blue">presas azules</em> de cada tramo.
              </p>
              <p className="muted">Toca una presa azul para marcarla con magnesio y no perder la cuenta.</p>
              <div className="row">
                <button type="button" className="btn btn-ghost" onClick={onClearMarks} disabled={!marks.length}>
                  Borrar marcas
                </button>
                <button type="button" className="btn btn-primary" onClick={onGoToSafe} data-autofocus>
                  Ir a la caja
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="lead">
                Un pequeño muro de boulder con presas de tres colores y tres banderas. Parece una ruta… pero ¿qué se
                supone que hay que buscar?
              </p>
              <p className="muted">Quizás la bolsa de magnesio tenga la respuesta.</p>
              <button type="button" className="btn btn-primary" onClick={onGoToBag} data-autofocus>
                Revisar la bolsa
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

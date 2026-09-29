import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { sfx } from '../game/audio';
import { SOLUTION, diagnose, digitFromRotation, shortestStep, wrapDigit } from '../game/puzzle';
import { Modal } from './Modal';

interface Props {
  sawRoute: boolean;
  attempts: number;
  hintUsed: boolean;
  onHint: () => void;
  onWrong: () => void;
  onUnlock: () => void;
  onClose: () => void;
}

type Status = 'idle' | 'wrong' | 'unlocking';

const SIZE = 320;
const C = SIZE / 2;
const LEN = SOLUTION.length;

function angleOf(e: { clientX: number; clientY: number }, el: Element) {
  const r = el.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  return { deg: (Math.atan2(dx, -dy) * 180) / Math.PI, dist: Math.hypot(dx, dy) / (r.width / 2) };
}

const norm180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

export function SafeModal({ sawRoute, attempts, hintUsed, onHint, onWrong, onUnlock, onClose }: Props) {
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [digits, setDigits] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const drag = useRef<{ last: number; total: number; startDist: number } | null>(null);
  const lastDigit = useRef(0);
  const timers = useRef<number[]>([]);
  const value = digitFromRotation(rot);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // tactile click whenever a new number passes under the indicator
  useEffect(() => {
    if (value !== lastDigit.current) {
      lastDigit.current = value;
      sfx.tick();
    }
  }, [value]);

  const busy = status === 'unlocking';

  const step = useCallback(
    (n: number) => {
      if (busy) return;
      setRot((r) => Math.round(r / 36) * 36 - n * 36);
    },
    [busy],
  );

  const submit = (code: number[]) => {
    const verdict = diagnose(code);
    if (verdict === 'ok') {
      setStatus('unlocking');
      setMessage('Clac, clac… los pestillos ceden.');
      sfx.unlock();
      setRot((r) => r - 720);
      timers.current.push(window.setTimeout(onUnlock, 1500));
    } else {
      setStatus('wrong');
      sfx.wrong();
      onWrong();
      setMessage(
        verdict === 'order'
          ? 'Clac… los pestillos casi ceden. Esos números suenan bien, pero no en ese orden.'
          : verdict === 'color'
            ? 'El mecanismo se resiste. Contaste con cuidado, pero en cada tramo sobra algo: no todo en la línea es del color del agua.'
            : attempts >= 1 && !hintUsed
              ? 'El mecanismo se resiste otra vez. Si quieres, usa tu pista: no hay castigo.'
              : 'El mecanismo se resiste con un golpe seco. Nada se rompió: vuelve a mirar el muro y reintenta.',
      );
      timers.current.push(
        window.setTimeout(() => {
          setDigits([]);
          setStatus('idle');
        }, 900),
      );
    }
  };

  const setDigit = () => {
    if (busy || status === 'wrong' || digits.length >= LEN) return;
    sfx.set();
    const next = [...digits, value];
    setDigits(next);
    setMessage(null);
    if (next.length === LEN) submit(next);
  };

  const undo = () => {
    if (busy || status === 'wrong') return;
    setDigits((d) => d.slice(0, -1));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setDigit();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      undo();
    } else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      step(shortestStep(value, Number(e.key)));
    }
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (busy) return;
    const a = angleOf(e, e.currentTarget);
    if (a.dist > 1.02) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { last: a.deg, total: 0, startDist: a.dist };
    setDragging(true);
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const a = angleOf(e, e.currentTarget);
    const delta = norm180(a.deg - d.last);
    d.last = a.deg;
    d.total += Math.abs(delta);
    setRot((r) => r + delta);
  };

  const onUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (d.total < 4 && d.startDist > 0.45) {
      // A tap on a number: turn the shortest way to it.
      const a = angleOf(e, e.currentTarget);
      setRot((r) => {
        const snapped = Math.round(r / 36) * 36;
        // numeral n sits at screen angle n*36 + rotation
        const digit = wrapDigit(Math.round(norm180(a.deg - snapped) / 36));
        return snapped - shortestStep(digitFromRotation(snapped), digit) * 36;
      });
    } else {
      setRot((r) => Math.round(r / 36) * 36);
    }
  };

  const ticks = Array.from({ length: 50 }, (_, i) => i);
  const numbers = Array.from({ length: 10 }, (_, i) => i);
  const bolt = status === 'unlocking' ? 'bolts-open' : '';

  return (
    <Modal title="La caja fuerte" kicker="Objeto 3 de 3" onClose={busy ? undefined : onClose} wide className="safe-sheet">
      <div className="safe-layout">
        <div className={`dial-wrap ${status === 'wrong' ? 'shake' : ''} ${bolt}`}>
          <span className="bolt bolt-l" aria-hidden="true" />
          <span className="bolt bolt-r" aria-hidden="true" />
          <svg
            className={`dial ${dragging ? 'dragging' : ''}`}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="slider"
            tabIndex={0}
            aria-label="Dial de combinación. Flechas para girar, Enter para fijar el número, Retroceso para borrar."
            aria-valuemin={0}
            aria-valuemax={9}
            aria-valuenow={value}
            aria-valuetext={`Número ${value}`}
            onKeyDown={onKey}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            data-autofocus
          >
            <defs>
              <radialGradient id="brassRing" cx="0.35" cy="0.3" r="0.9">
                <stop offset="0" stopColor="#f6d59c" />
                <stop offset="0.45" stopColor="#c08c50" />
                <stop offset="0.8" stopColor="#8a5a2b" />
                <stop offset="1" stopColor="#5b3a18" />
              </radialGradient>
              <linearGradient id="bezelEdge" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff1d0" />
                <stop offset="0.5" stopColor="#8a5a2b" />
                <stop offset="1" stopColor="#3a220d" />
              </linearGradient>
              <radialGradient id="faceG" cx="0.4" cy="0.35" r="0.8">
                <stop offset="0" stopColor="#2c3446" />
                <stop offset="1" stopColor="#10141d" />
              </radialGradient>
              <radialGradient id="knobG" cx="0.35" cy="0.3" r="0.9">
                <stop offset="0" stopColor="#ffe6b5" />
                <stop offset="0.5" stopColor="#b8864e" />
                <stop offset="1" stopColor="#5b3a18" />
              </radialGradient>
              <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="rgba(255,255,255,.35)" />
                <stop offset="0.4" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            {/* fixed outer bezel */}
            <circle cx={C} cy={C} r={156} fill="url(#bezelEdge)" />
            <circle cx={C} cy={C} r={150} fill="url(#brassRing)" />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
              return <circle key={i} cx={C + Math.sin(a) * 141} cy={C - Math.cos(a) * 141} r={3.2} fill="#4a2f14" opacity=".75" />;
            })}
            <circle cx={C} cy={C} r={131} fill="#1a1410" />
            {/* rotating dial */}
            <g transform={`rotate(${rot} ${C} ${C})`} className="dial-rot">
              <circle cx={C} cy={C} r={128} fill="url(#faceG)" stroke="#b8864e" strokeWidth="2" />
              {ticks.map((i) => {
                const major = i % 5 === 0;
                return (
                  <line
                    key={i}
                    x1={C}
                    y1={C - 126}
                    x2={C}
                    y2={C - (major ? 108 : 116)}
                    stroke={major ? '#f3e6cc' : 'rgba(243,230,204,.45)'}
                    strokeWidth={major ? 3 : 1.4}
                    transform={`rotate(${i * 7.2} ${C} ${C})`}
                  />
                );
              })}
              {numbers.map((n) => (
                <text
                  key={n}
                  x={C}
                  y={C - 84}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`dial-num ${n === value ? 'dial-num-on' : ''}`}
                  transform={`rotate(${n * 36} ${C} ${C})`}
                >
                  {n}
                </text>
              ))}
              {/* knob with grip */}
              <circle cx={C} cy={C} r={62} fill="url(#knobG)" stroke="#3a220d" strokeWidth="2" />
              {Array.from({ length: 24 }, (_, i) => (
                <line
                  key={i}
                  x1={C}
                  y1={C - 62}
                  x2={C}
                  y2={C - 52}
                  stroke="rgba(58,34,13,.55)"
                  strokeWidth="2.5"
                  transform={`rotate(${i * 15} ${C} ${C})`}
                />
              ))}
              <circle cx={C} cy={C} r={40} fill="url(#knobG)" stroke="rgba(58,34,13,.6)" />
              <rect x={C - 3} y={C - 50} width="6" height="16" rx="3" fill="#f3e6cc" />
            </g>
            {/* static sheen + indicator */}
            <circle cx={C} cy={C} r={128} fill="url(#sheen)" pointerEvents="none" />
            <path d={`M${C - 11} 6 L${C + 11} 6 L${C} 30 Z`} fill="#e2483d" stroke="#5a0f0a" strokeWidth="1.5" />
            <text x={C} y={C + 6} textAnchor="middle" dominantBaseline="middle" className="dial-readout" pointerEvents="none">
              {value}
            </text>
          </svg>
        </div>

        <div className="safe-side">
          <div className="slots" aria-live="polite" aria-label={`Combinación: ${digits.length} de ${LEN} números fijados`}>
            {Array.from({ length: LEN }, (_, i) => (
              <span
                key={i}
                className={`slot ${i < digits.length ? 'slot-set' : ''} ${i === digits.length && !busy ? 'slot-cur' : ''} ${
                  busy ? 'slot-ok' : ''
                }`}
              >
                <small>{i + 1}</small>
                {i < digits.length ? digits[i] : i === digits.length && !busy ? value : '·'}
              </span>
            ))}
          </div>
          <p className="muted small center">
            {busy ? 'Abriendo…' : `Número ${Math.min(digits.length + 1, LEN)} de ${LEN} · gira el dial o usa las flechas`}
          </p>
          <div className="dial-controls">
            <button type="button" className="round-btn" onClick={() => step(-1)} aria-label="Girar a la izquierda (número anterior)" disabled={busy}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button type="button" className="btn btn-primary set-btn" onClick={setDigit} disabled={busy || status === 'wrong'}>
              Fijar {value}
            </button>
            <button type="button" className="round-btn" onClick={() => step(1)} aria-label="Girar a la derecha (número siguiente)" disabled={busy}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={undo} disabled={busy || !digits.length || status === 'wrong'}>
              Borrar
            </button>
            <button type="button" className="btn btn-ghost" onClick={onHint} disabled={busy}>
              {hintUsed ? 'Ver pista' : 'Pista (1)'}
            </button>
          </div>
          <p className={`safe-msg ${status}`} role="status" aria-live="assertive">
            {message ?? (sawRoute ? 'Tres números. ¿Hacia dónde corre el agua?' : 'Tres números. ¿Dónde estarán escritos?')}
          </p>
        </div>
      </div>
    </Modal>
  );
}

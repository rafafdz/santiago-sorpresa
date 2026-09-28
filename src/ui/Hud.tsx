import { formatClock } from '../game/puzzle';
import type { Step } from '../game/state';

interface Props {
  remaining: number;
  objective: string;
  steps: Step[];
  hintUsed: boolean;
  sound: boolean;
  unlocked: boolean;
  onHint: () => void;
  onReset: () => void;
  onHelp: () => void;
  onToggleSound: () => void;
  onShowInvite: () => void;
}

export function Hud(p: Props) {
  const overtime = p.remaining <= 0;
  const low = p.remaining > 0 && p.remaining < 60;
  return (
    <>
      <header className="hud-top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>La Caja de Santiago</span>
        </div>
        <div
          className={`timer ${low ? 'timer-low' : ''} ${overtime ? 'timer-over' : ''}`}
          role="timer"
          aria-label={overtime ? 'Tiempo extra' : `Quedan ${formatClock(p.remaining)}`}
        >
          {overtime && !p.unlocked ? '+ extra' : formatClock(p.remaining)}
        </div>
        <nav className="hud-actions" aria-label="Acciones del juego">
          <button type="button" className="icon-btn" onClick={p.onHint} aria-label={p.hintUsed ? 'Ver la pista usada' : 'Usar la única pista'}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
            </svg>
            {!p.hintUsed && <span className="badge">1</span>}
          </button>
          <button type="button" className="icon-btn" onClick={p.onToggleSound} aria-label={p.sound ? 'Silenciar sonido' : 'Activar sonido'} aria-pressed={!p.sound}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" />
              {p.sound ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /> : <path d="M17 9l5 6M22 9l-5 6" />}
            </svg>
          </button>
          <button type="button" className="icon-btn" onClick={p.onHelp} aria-label="Cómo jugar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17.5v.01" />
            </svg>
          </button>
          <button type="button" className="icon-btn" onClick={p.onReset} aria-label="Reiniciar el juego">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
            </svg>
          </button>
        </nav>
      </header>

      <section className="objective" aria-live="polite">
        <p className="kicker">Objetivo</p>
        <p>{p.objective}</p>
        {p.unlocked && (
          <button type="button" className="btn btn-primary btn-small" onClick={p.onShowInvite}>
            Leer la invitación
          </button>
        )}
      </section>

      <ol className="progress" aria-label="Progreso">
        {p.steps.map((s, i) => (
          <li key={s.key} className={s.done ? 'done' : ''} aria-label={`${s.label}: ${s.done ? 'resuelto' : 'pendiente'}`}>
            <span className="progress-dot" aria-hidden="true">
              {s.done ? '✓' : i + 1}
            </span>
            <span className="progress-label">{s.label}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

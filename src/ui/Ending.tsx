import { INVITATION, PLAYER } from '../config';
import { TIME_LIMIT_S, formatClock } from '../game/puzzle';

interface Props {
  elapsedS: number;
  onReplay: () => void;
  onLook: () => void;
}

export function Ending({ elapsedS, onReplay, onLook }: Props) {
  const inTime = elapsedS <= TIME_LIMIT_S;
  return (
    <div className="backdrop ending-backdrop">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 0.35}s` }} />
        ))}
      </div>
      <div className="invite" role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <div className="invite-seal" aria-hidden="true">
          S·L
        </div>
        <p className="kicker">Para {PLAYER.firstName} {PLAYER.lastName}</p>
        <h2 id="invite-title">{INVITATION.headline}</h2>
        <p className="invite-body">{INVITATION.body}</p>
        <dl className="invite-details">
          <div>
            <dt>Fecha</dt>
            <dd>{INVITATION.date}</dd>
          </div>
          <div>
            <dt>Dónde</dt>
            <dd>{INVITATION.where}</dd>
          </div>
          <div>
            <dt>Qué llevar</dt>
            <dd>{INVITATION.dress}</dd>
          </div>
        </dl>
        <p className="invite-closing">{INVITATION.closing}</p>
        <p className="invite-sign" aria-label={`Firmado por ${INVITATION.signature}`}>
          {INVITATION.signature}
        </p>
        <p className="invite-time">
          {inTime
            ? `Abriste la caja en ${formatClock(elapsedS)}. Encadenado a vista.`
            : `Abriste la caja en ${formatClock(elapsedS)}. Con tiempo extra, pero encadenado igual.`}
        </p>
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={onLook}>
            Ver la caja abierta
          </button>
          <button type="button" className="btn btn-primary" onClick={onReplay} autoFocus>
            Jugar de nuevo
          </button>
        </div>
      </div>
    </div>
  );
}

import { PLAYER } from '../config';

export function Intro({ onStart, returning }: { onStart: () => void; returning?: boolean }) {
  return (
    <div className="backdrop intro-backdrop">
      <div className="sheet intro" role="dialog" aria-modal="true" aria-labelledby="intro-title">
        <p className="kicker">Una invitación cerrada con llave</p>
        <h1 id="intro-title" className="title">
          La Caja de <span>{PLAYER.firstName}</span>
        </h1>
        <div className="letter">
          <p>
            <strong>{PLAYER.firstName}:</strong>
          </p>
          <p>
            Te dejamos una caja fuerte sobre esta mesa. Entre deploys con el equipo de Brasil, modelos que entrenar y la
            última pared que escalaste, pensamos que te faltaba un problema que no se resuelve con descenso de gradiente.
          </p>
          <p>Tienes cinco minutos. Lo que hay adentro es para ti.</p>
        </div>
        <ul className="howto" aria-label="Cómo jugar">
          <li>
            <span aria-hidden="true">↻</span> Arrastra para mirar la habitación.
          </li>
          <li>
            <span aria-hidden="true">◎</span> Toca lo que brilla en azul (o sus etiquetas).
          </li>
          <li>
            <span aria-hidden="true">✦</span> Tienes una sola pista de emergencia.
          </li>
        </ul>
        <button type="button" className="btn btn-primary" onClick={onStart} autoFocus>
          {returning ? 'Seguir jugando' : 'Entrar a la habitación'}
        </button>
      </div>
    </div>
  );
}

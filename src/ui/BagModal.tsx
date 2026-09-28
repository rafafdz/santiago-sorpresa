import { useState } from 'react';
import { PLAYER } from '../config';
import { sfx } from '../game/audio';
import { Modal } from './Modal';

interface Props {
  found: boolean;
  onFound: () => void;
  onClose: () => void;
  onGoToWall: () => void;
}

export function BagModal({ found, onFound, onClose, onGoToWall }: Props) {
  const [digging, setDigging] = useState(false);

  const dig = () => {
    setDigging(true);
    sfx.reveal();
    window.setTimeout(() => {
      setDigging(false);
      onFound();
    }, 700);
  };

  return (
    <Modal title={found ? 'Ficha de montaña' : 'Bolsa de magnesio'} kicker="Objeto 1 de 3" onClose={onClose}>
      {!found ? (
        <div className="bag-view">
          <svg className={`bag-art ${digging ? 'bag-shake' : ''}`} viewBox="0 0 200 200" aria-hidden="true">
            <defs>
              <linearGradient id="bagFabric" x1="0" x2="1">
                <stop offset="0" stopColor="#23566f" />
                <stop offset="0.5" stopColor="#3582a6" />
                <stop offset="1" stopColor="#1d4a60" />
              </linearGradient>
            </defs>
            <ellipse cx="100" cy="182" rx="66" ry="9" fill="rgba(0,0,0,.35)" />
            <path d="M42 70 Q36 150 52 176 Q100 190 148 176 Q164 150 158 70 Z" fill="url(#bagFabric)" />
            <ellipse cx="100" cy="70" rx="58" ry="14" fill="#f3e6cc" />
            <ellipse cx="100" cy="70" rx="48" ry="9" fill="#f9f7f2" />
            <path d="M44 80 Q100 96 156 80" stroke="#e2483d" strokeWidth="3" fill="none" />
            <rect x="96" y="84" width="10" height="20" rx="4" fill="#111" />
            {digging &&
              [0, 1, 2, 3, 4, 5].map((i) => (
                <circle key={i} className="puff" cx={70 + i * 12} cy={60} r={10 + (i % 3) * 4} fill="#fffaf0" />
              ))}
          </svg>
          <p className="lead">
            Todavía tiene magnesio de la última sesión de boulder. Al moverla, algo metálico suena en el fondo.
          </p>
          <button type="button" className="btn btn-primary" onClick={dig} disabled={digging} data-autofocus>
            {digging ? 'Buscando…' : 'Meter la mano'}
          </button>
        </div>
      ) : (
        <div className="token-view">
          <svg className="token-art" viewBox="0 0 200 200" role="img" aria-label="Ficha de bronce con una montaña grabada y la palabra LAGUNA">
            <defs>
              <radialGradient id="tokenG" cx="0.4" cy="0.35" r="0.7">
                <stop offset="0" stopColor="#f6d59c" />
                <stop offset="0.6" stopColor="#c08c50" />
                <stop offset="1" stopColor="#7d5428" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="92" fill="url(#tokenG)" stroke="#5b3a18" strokeWidth="4" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="#5b3a18" strokeWidth="1.5" strokeDasharray="2 5" />
            <path d="M34 128 L74 72 L92 96 L118 52 L166 128" fill="none" stroke="#4a2f14" strokeWidth="5" strokeLinejoin="round" />
            <path d="M110 64 L118 52 L126 64" fill="none" stroke="#f3e6cc" strokeWidth="3" />
            <text x="100" y="158" textAnchor="middle" fill="#4a2f14" fontFamily="Georgia, serif" fontWeight="700" fontSize="22" letterSpacing="3">
              LAGUNA
            </text>
          </svg>
          <blockquote className="engraving">
            <p>{PLAYER.firstName}:</p>
            <p>Toda ruta empieza en la BASE.</p>
            <p>Cada bandera roja es una cumbre: I, II y III.</p>
            <p>
              El número de cada cumbre son las <em className="blue">presas azules</em> de su tramo.
            </p>
            <p>La cuerda une el muro con la caja.</p>
          </blockquote>
          <button type="button" className="btn btn-primary" onClick={onGoToWall} data-autofocus>
            Ir al muro
          </button>
        </div>
      )}
    </Modal>
  );
}

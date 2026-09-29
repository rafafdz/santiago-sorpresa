import { Modal } from './Modal';
import { WallBoard } from './WallBoard';

interface Props {
  foundClue: boolean;
  marks: number[];
  onToggleMark: (i: number) => void;
  onClearMarks: () => void;
  onClose: () => void;
  onGoToBag: () => void;
  onGoToSafe: () => void;
}

export function WallModal({ foundClue, marks, onToggleMark, onClearMarks, onClose, onGoToBag, onGoToSafe }: Props) {
  return (
    <Modal title="El muro de la ruta" kicker="Objeto 2 de 3" onClose={onClose} wide>
      <div className="wall-layout">
        <WallBoard className="wall-art" idPrefix="wall-modal" marks={marks} onToggleMark={onToggleMark} />

        <div className="wall-side">
          {foundClue ? (
            <>
              <p className="lead">
                Nieve arriba, una laguna abajo y una línea de magnesio que sube entre las dos. Tres banderas rojas la cortan
                en tramos. Ten la ficha a mano: el muro responde a lo que dice.
              </p>
              <p className="muted">Toca las presas para marcarlas con magnesio y no perder la cuenta.</p>
              <div className="row">
                <button type="button" className="btn btn-primary btn-wide" onClick={onGoToSafe} data-autofocus>
                  Ir a la caja
                </button>
                <button type="button" className="btn btn-ghost" onClick={onGoToBag}>
                  Releer la ficha
                </button>
                <button type="button" className="btn btn-ghost" onClick={onClearMarks} disabled={!marks.length}>
                  Borrar marcas
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="lead">
                Un pequeño muro de boulder: presas de tres colores, tres banderas y una línea de magnesio que sube desde
                una laguna pintada. Parece una ruta… pero ¿qué hay que buscar?
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

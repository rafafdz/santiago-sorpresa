import { Suspense, lazy, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { setSoundEnabled, sfx } from './game/audio';
import { TIME_LIMIT_S } from './game/puzzle';
import { initialState, objective, reducer, remainingSeconds, steps } from './game/state';
import type { HotspotId } from './scene/sceneProps';
import { BagModal } from './ui/BagModal';
import { Ending } from './ui/Ending';
import { Hud } from './ui/Hud';
import { Intro } from './ui/Intro';
import { Modal } from './ui/Modal';
import { SafeModal } from './ui/SafeModal';
import { WallModal } from './ui/WallModal';

// three.js lives in its own chunk so the intro paints before the 3D renderer is parsed.
const SceneView = lazy(() => import('./scene/SceneView'));

function usePrefersReducedMotion() {
  const [rm, setRm] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setRm(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return rm;
}

export default function App() {
  const [s, dispatch] = useReducer(reducer, initialState);
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [timeUpShown, setTimeUpShown] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const endingTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (s.phase === 'intro' || s.finishedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [s.phase, s.finishedAt]);

  const remaining = remainingSeconds(s, now);

  useEffect(() => {
    if (remaining <= 0 && !s.unlocked && !timeUpShown && s.phase === 'play') {
      setTimeUpShown(true);
      setToast('Se acabó el reloj oficial… pero esta caja es paciente. Sigue cuando quieras.');
    }
  }, [remaining, s.unlocked, s.phase, timeUpShown]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(id);
  }, [toast]);

  const onTap = useCallback(
    (id: HotspotId) => {
      if (s.phase !== 'play' || s.modal) return;
      if (id === 'safe' && s.unlocked) {
        dispatch({ type: 'showEnding', show: true });
        return;
      }
      dispatch({ type: 'open', modal: id });
      if (id === 'wall') dispatch({ type: 'sawRoute' });
    },
    [s.phase, s.modal, s.unlocked],
  );

  const openWall = () => {
    dispatch({ type: 'open', modal: 'wall' });
    dispatch({ type: 'sawRoute' });
  };

  const reset = () => {
    clearTimeout(endingTimer.current);
    dispatch({ type: 'reset' });
    setNow(Date.now());
    setTimeUpShown(false);
    setToast(null);
    setResetSignal((n) => n + 1);
  };

  const focus: HotspotId | null = s.unlocked ? null : !s.foundClue ? 'bag' : !s.sawRoute ? 'wall' : 'safe';
  const sceneProps = {
    focus,
    tokenRevealed: s.foundClue,
    safeOpen: s.unlocked,
    interactive: s.phase === 'play' && !s.modal,
    reducedMotion,
    onTap,
    resetSignal,
  };
  const elapsed = s.startedAt && s.finishedAt ? (s.finishedAt - s.startedAt) / 1000 : TIME_LIMIT_S - remaining;

  return (
    <div className={`app ${reducedMotion ? 'reduced' : ''}`}>
      <div className="grain" aria-hidden="true" />
      <Suspense fallback={<div className="scene scene-loading">Preparando la habitación…</div>}>
        <SceneView {...sceneProps} />
      </Suspense>

      {s.phase !== 'intro' && (
        <Hud
          remaining={remaining}
          objective={objective(s)}
          steps={steps(s)}
          hintUsed={s.hintUsed}
          sound={sound}
          unlocked={s.unlocked}
          onHint={() => dispatch({ type: 'useHint' })}
          onReset={() => dispatch({ type: 'open', modal: 'reset' })}
          onHelp={() => dispatch({ type: 'open', modal: 'help' })}
          onToggleSound={() => {
            setSoundEnabled(!sound);
            setSound(!sound);
          }}
          onShowInvite={() => dispatch({ type: 'showEnding', show: true })}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {s.phase === 'intro' && <Intro onStart={() => { sfx.tick(); dispatch({ type: 'start', now: Date.now() }); }} />}

      {s.modal === 'help' && (
        <Modal title="Cómo jugar" kicker="La Caja de Santiago" onClose={() => dispatch({ type: 'close' })}>
          <ul className="howto">
            <li><span aria-hidden="true">↻</span> Arrastra con un dedo para girar la vista; pellizca o usa la rueda para acercarte.</li>
            <li><span aria-hidden="true">◎</span> Toca los objetos o sus etiquetas. El objetivo actual brilla en azul.</li>
            <li><span aria-hidden="true">⌨</span> En la caja: flechas para girar el dial, Enter para fijar, Retroceso para borrar.</li>
            <li><span aria-hidden="true">✦</span> Tienes una pista. Equivocarte no tiene castigo.</li>
          </ul>
          <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'close' })}>
            Entendido
          </button>
        </Modal>
      )}

      {s.modal === 'bag' && (
        <BagModal
          found={s.foundClue}
          onFound={() => dispatch({ type: 'foundClue' })}
          onClose={() => dispatch({ type: 'close' })}
          onGoToWall={openWall}
        />
      )}

      {s.modal === 'wall' && (
        <WallModal
          foundClue={s.foundClue}
          marks={s.marks}
          onToggleMark={(index) => {
            sfx.tick();
            dispatch({ type: 'toggleMark', index });
          }}
          onClearMarks={() => dispatch({ type: 'clearMarks' })}
          onClose={() => dispatch({ type: 'close' })}
          onGoToBag={() => dispatch({ type: 'open', modal: 'bag' })}
          onGoToSafe={() => dispatch({ type: 'open', modal: 'safe' })}
        />
      )}

      {s.modal === 'safe' && (
        <SafeModal
          sawRoute={s.sawRoute}
          attempts={s.attempts}
          hintUsed={s.hintUsed}
          onHint={() => dispatch({ type: 'useHint' })}
          onWrong={() => dispatch({ type: 'wrong' })}
          onUnlock={() => {
            dispatch({ type: 'unlock', now: Date.now() });
            dispatch({ type: 'close' });
            endingTimer.current = window.setTimeout(() => dispatch({ type: 'showEnding', show: true }), reducedMotion ? 300 : 2600);
          }}
          onClose={() => dispatch({ type: 'close' })}
        />
      )}

      {s.modal === 'hint' && (
        <Modal title="Tu pista" kicker="Una sola, bien usada" onClose={() => dispatch({ type: 'close' })}>
          <p className="lead">{s.hintText}</p>
          <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'close' })}>
            Gracias
          </button>
        </Modal>
      )}

      {s.modal === 'reset' && (
        <Modal title="¿Reiniciar?" kicker="Volver al principio" onClose={() => dispatch({ type: 'close' })}>
          <p className="lead">Se cierra la caja, vuelve la ficha a la bolsa y el reloj empieza de nuevo en 05:00.</p>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'close' })}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={reset}>
              Reiniciar
            </button>
          </div>
        </Modal>
      )}

      {s.showEnding && (
        <Ending
          elapsedS={elapsed}
          onReplay={reset}
          onLook={() => {
            dispatch({ type: 'showEnding', show: false });
          }}
        />
      )}
    </div>
  );
}

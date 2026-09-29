import { useEffect, useRef, useState } from 'react';
import { EscapeScene, type ContextState, type HotspotId } from './EscapeScene';
import { PINS, type SceneProps } from './sceneProps';
import { WebGLUnavailableError } from './webgl';

type Status = 'ok' | 'recovering' | 'unavailable';

/**
 * The 3D view (loaded lazily with React.lazy). Game state lives in App, so
 * rebuilding the canvas after a lost GPU context never loses progress.
 */
export default function SceneView(props: SceneProps) {
  const { focus, interactive, reducedMotion, onTap, resetSignal } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EscapeScene | null>(null);
  const pinRefs = useRef<Partial<Record<HotspotId, HTMLButtonElement | null>>>({});
  const latest = useRef(props);
  latest.current = props;
  const [status, setStatus] = useState<Status>('ok');
  // Bumping this remounts the <canvas>, giving us a brand-new WebGL context.
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: EscapeScene;
    try {
      scene = new EscapeScene(canvas, {
        onTap: (id) => latest.current.onTap(id),
        onContextState: (state: ContextState) => {
          if (state === 'lost') setStatus('recovering');
          else if (state === 'restored') setStatus('ok');
          else setGeneration((g) => g + 1);
        },
        reducedMotion,
      });
    } catch (err) {
      if (!(err instanceof WebGLUnavailableError)) console.error(err);
      setStatus('unavailable');
      return;
    }
    setStatus('ok');
    scene.setPins(pinRefs.current);
    // re-apply the current game state (matters after a rebuild)
    const p = latest.current;
    scene.setFocus(p.focus);
    scene.setTokenRevealed(p.tokenRevealed);
    scene.setSafeOpen(p.safeOpen);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [reducedMotion, generation]);

  useEffect(() => sceneRef.current?.setFocus(focus), [focus]);
  useEffect(() => sceneRef.current?.setTokenRevealed(props.tokenRevealed), [props.tokenRevealed]);
  useEffect(() => sceneRef.current?.setSafeOpen(props.safeOpen), [props.safeOpen]);
  useEffect(() => {
    if (resetSignal) sceneRef.current?.resetView();
  }, [resetSignal]);

  return (
    <div className="scene" aria-label="Habitación en 3D: arrastra para girar la vista" role="region">
      <canvas key={generation} ref={canvasRef} className="scene-canvas" />
      {status === 'ok' && (
        <div className="pins" aria-hidden={!interactive}>
          {PINS.map((p) => (
            <button
              key={p.id}
              ref={(el) => {
                pinRefs.current[p.id] = el;
              }}
              type="button"
              className={`pin ${focus === p.id ? 'pin-focus' : ''}`}
              aria-label={p.aria}
              tabIndex={interactive ? 0 : -1}
              onClick={() => onTap(p.id)}
            >
              <span className="pin-dot" aria-hidden="true" />
              <span className="pin-label">{p.label}</span>
            </button>
          ))}
        </div>
      )}
      {status === 'recovering' && (
        <p className="gl-status" role="status">
          Recuperando los gráficos 3D…
        </p>
      )}
      {status === 'unavailable' && (
        <div className="gl-error" role="alert">
          <h2>No pudimos iniciar los gráficos 3D</h2>
          <p>
            Este juego necesita WebGL. Activa la aceleración gráfica del navegador (en Chrome: Configuración → Sistema →
            “Usar aceleración gráfica”) o abre el enlace en Chrome o Firefox actualizados.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setGeneration((g) => g + 1)}>
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

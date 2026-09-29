import { useEffect, useRef } from 'react';
import { EscapeScene, type HotspotId } from './EscapeScene';
import { PINS, type SceneProps } from './sceneProps';

/**
 * The 3D view. Loaded lazily (React.lazy) only when WebGL is available, so the
 * lite view never downloads or evaluates three.js.
 */
export default function SceneView({ focus, tokenRevealed, safeOpen, interactive, reducedMotion, onTap, resetSignal, onFail }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EscapeScene | null>(null);
  const pinRefs = useRef<Partial<Record<HotspotId, HTMLButtonElement | null>>>({});
  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  const failRef = useRef(onFail);
  failRef.current = onFail;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: EscapeScene;
    try {
      scene = new EscapeScene(canvas, {
        onTap: (id) => tapRef.current(id),
        onContextLost: () => failRef.current('lost'),
        reducedMotion,
      });
    } catch (err) {
      console.warn('3D view unavailable, switching to the lite view', err);
      // Defer so we never update the parent during this effect's commit.
      queueMicrotask(() => failRef.current('init'));
      return;
    }
    scene.setPins(pinRefs.current);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => sceneRef.current?.setFocus(focus), [focus]);
  useEffect(() => sceneRef.current?.setTokenRevealed(tokenRevealed), [tokenRevealed]);
  useEffect(() => sceneRef.current?.setSafeOpen(safeOpen), [safeOpen]);
  useEffect(() => {
    if (resetSignal) sceneRef.current?.resetView();
  }, [resetSignal]);

  return (
    <div className="scene" aria-label="Habitación en 3D: arrastra para girar la vista" role="region">
      <canvas ref={canvasRef} className="scene-canvas" />
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
    </div>
  );
}

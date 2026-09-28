import { useEffect, useRef, useState } from 'react';
import { EscapeScene, type HotspotId } from './EscapeScene';

interface Props {
  focus: HotspotId | null;
  tokenRevealed: boolean;
  safeOpen: boolean;
  interactive: boolean;
  reducedMotion: boolean;
  onTap: (id: HotspotId) => void;
  resetSignal: number;
}

const PINS: { id: HotspotId; label: string; aria: string }[] = [
  { id: 'bag', label: 'Magnesio', aria: 'Inspeccionar la bolsa de magnesio' },
  { id: 'wall', label: 'Muro', aria: 'Mirar de cerca el muro de escalada' },
  { id: 'safe', label: 'Caja fuerte', aria: 'Acercarse a la caja fuerte' },
];

export function SceneView({ focus, tokenRevealed, safeOpen, interactive, reducedMotion, onTap, resetSignal }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EscapeScene | null>(null);
  const pinRefs = useRef<Partial<Record<HotspotId, HTMLButtonElement | null>>>({});
  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: EscapeScene;
    try {
      scene = new EscapeScene(canvas, { onTap: (id) => tapRef.current(id), reducedMotion });
    } catch (err) {
      console.error(err);
      setFailed(true);
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
      {failed && (
        <p className="scene-fallback">
          Tu navegador no pudo iniciar WebGL. Igual puedes jugar con los botones de cada objeto.
        </p>
      )}
      <div className={`pins ${failed ? 'pins-static' : ''}`} aria-hidden={!interactive}>
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

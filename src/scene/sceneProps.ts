/** Shared contract for the 3D and lite views (no three.js imports here). */
export type HotspotId = 'bag' | 'wall' | 'safe';

export interface SceneProps {
  focus: HotspotId | null;
  tokenRevealed: boolean;
  safeOpen: boolean;
  interactive: boolean;
  reducedMotion: boolean;
  onTap: (id: HotspotId) => void;
  resetSignal: number;
  /** 3D only: the renderer could not start ('init') or the GPU context was lost ('lost'). */
  onFail: (reason: 'init' | 'lost') => void;
}

export const PINS: { id: HotspotId; label: string; aria: string }[] = [
  { id: 'bag', label: 'Magnesio', aria: 'Inspeccionar la bolsa de magnesio' },
  { id: 'wall', label: 'Muro', aria: 'Mirar de cerca el muro de escalada' },
  { id: 'safe', label: 'Caja fuerte', aria: 'Acercarse a la caja fuerte' },
];

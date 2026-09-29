/** Props of the 3D view and its hotspots (no three.js imports here, so App stays light). */
export type HotspotId = 'bag' | 'wall' | 'safe';

export interface SceneProps {
  focus: HotspotId | null;
  tokenRevealed: boolean;
  safeOpen: boolean;
  interactive: boolean;
  reducedMotion: boolean;
  onTap: (id: HotspotId) => void;
  resetSignal: number;
}

export const PINS: { id: HotspotId; label: string; aria: string }[] = [
  { id: 'bag', label: 'Magnesio', aria: 'Inspeccionar la bolsa de magnesio' },
  { id: 'wall', label: 'Muro', aria: 'Mirar de cerca el muro de escalada' },
  { id: 'safe', label: 'Caja fuerte', aria: 'Acercarse a la caja fuerte' },
];

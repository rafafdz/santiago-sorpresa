import { BOARD_W, ROUTE_BASE, SNOW_LINE } from './puzzle';

export const HOLD_COLORS: Record<string, string> = {
  blue: '#5fb4e8',
  orange: '#d9793a',
  gray: '#7b8594',
};

/** Shared landmark shapes, drawn identically on the 3D texture (Path2D) and the 2D SVG view. */

/** Jagged snow cap along the top of the wall. */
export const SNOW_PATH = (() => {
  const peaks = [0, 18, 34, 56, 74, 98, 120, 140, 166, 188, 210, 236, 258, 280, BOARD_W];
  let d = `M0 0 H${BOARD_W} V${SNOW_LINE - 8}`;
  for (let i = peaks.length - 1; i >= 0; i--) d += ` L${peaks[i]} ${SNOW_LINE - 8 + (i % 2 ? 12 : 0)}`;
  return d + ' Z';
})();

/** The laguna at the foot of the wall, where the chalk line starts. */
export const LAGUNA = { cx: ROUTE_BASE.x, cy: ROUTE_BASE.y + 8, rx: 70, ry: 10 };

/** Flag outline (pole + pennant), relative to the flag point. */
export const flagPennant = (x: number, y: number) => `M${x} ${y - 16} L${x + 18} ${y - 10} L${x} ${y - 4}Z`;

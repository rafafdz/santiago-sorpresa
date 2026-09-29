/**
 * Puzzle data and deterministic helpers.
 *
 * The climbing-wall route is the single source of truth: both the 3D wall
 * texture and the 2D "route" view are drawn from this data, and the safe's
 * combination is *derived* from it, so the clue and the answer can never drift.
 *
 * Rules the player deduces from the token ("sube por el color del agua",
 * "cada bandera guarda lo que pisaste para alcanzarla", "se lee como corre el
 * agua: de la nieve a la laguna"):
 *   - only holds of the water colour (blue) on the chalk line count;
 *   - each flag's number is the blue holds of the segment that ends at it;
 *   - digits are read from the highest flag (snow) down to the lowest (laguna).
 *
 * Coordinates live in a 300 x 420 board (origin top-left, y grows downward).
 */

export type HoldColor = 'blue' | 'orange' | 'gray';

export interface Hold {
  x: number;
  y: number;
  r: number;
  color: HoldColor;
  /** Segment index for holds on the chalk line; undefined for off-route decoys. */
  segment?: number;
}

export interface Flag {
  x: number;
  y: number;
}

export const BOARD_W = 300;
export const BOARD_H = 420;

/** Where the chalk line starts: the laguna painted at the foot of the wall. */
export const ROUTE_BASE = { x: 150, y: 400 };
/** Top edge of the painted snow cap. */
export const SNOW_LINE = 26;

type RouteHold = [number, number, HoldColor];

/** Holds on the chalk line, per segment, in climbing order (base → flag). */
const segmentHolds: RouteHold[][] = [
  [
    [118, 378, 'blue'],
    [160, 360, 'gray'],
    [128, 332, 'blue'],
    [172, 318, 'blue'],
    [140, 292, 'blue'],
  ],
  [
    [214, 244, 'blue'],
    [178, 230, 'blue'],
    [142, 218, 'gray'],
    [106, 206, 'blue'],
    [76, 184, 'blue'],
    [102, 160, 'blue'],
    [72, 138, 'gray'],
    [52, 112, 'blue'],
    [96, 108, 'blue'],
  ],
  [
    [176, 82, 'blue'],
    [206, 62, 'gray'],
    [238, 72, 'blue'],
  ],
];

/** Flag at the end of each segment (same index). No labels: order is deduced. */
export const FLAGS: Flag[] = [
  { x: 190, y: 270 },
  { x: 136, y: 90 },
  { x: 262, y: 44 },
];

/** Off-route holds, just to make the wall look like a real wall. */
const decoys: RouteHold[] = [
  [52, 356, 'orange'],
  [246, 334, 'orange'],
  [252, 206, 'orange'],
  [226, 150, 'orange'],
  [36, 262, 'orange'],
  [272, 112, 'orange'],
  [58, 62, 'orange'],
  [208, 190, 'orange'],
  [88, 298, 'gray'],
  [236, 386, 'gray'],
  [26, 168, 'gray'],
  [158, 150, 'gray'],
  [274, 272, 'gray'],
  [110, 44, 'gray'],
  [262, 238, 'gray'],
];

/** Tiny deterministic PRNG so hold sizes/shapes are stable between renders. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildHolds(): Hold[] {
  const rand = mulberry32(20260928);
  const holds: Hold[] = [];
  segmentHolds.forEach((seg, segment) => {
    seg.forEach(([x, y, color]) => holds.push({ x, y, r: 11 + rand() * 4, color, segment }));
  });
  decoys.forEach(([x, y, color]) => holds.push({ x, y, r: 10 + rand() * 5, color }));
  return holds;
}

export const HOLDS: Hold[] = buildHolds();

/** Ordered polyline the chalk route follows: base → holds → flag, per segment. */
export function routePolyline(): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [ROUTE_BASE];
  segmentHolds.forEach((seg, i) => {
    seg.forEach(([x, y]) => pts.push({ x, y }));
    pts.push({ x: FLAGS[i].x, y: FLAGS[i].y });
  });
  return pts;
}

/** Holds on the chalk line per segment, optionally filtered by colour. */
export function segmentCounts(holds: Hold[] = HOLDS, color?: HoldColor): number[] {
  const counts = FLAGS.map(() => 0);
  for (const h of holds) {
    if (h.segment !== undefined && (!color || h.color === color)) counts[h.segment]++;
  }
  return counts;
}

/** Segment indices in reading order: "de la nieve a la laguna" = highest flag first. */
export function readingOrder(flags: Flag[] = FLAGS): number[] {
  return flags.map((f, i) => ({ y: f.y, i })).sort((a, b) => a.y - b.y).map((f) => f.i);
}

/** The combination: blue holds per segment, read from the snow down to the laguna. */
export function deriveCode(holds: Hold[] = HOLDS, flags: Flag[] = FLAGS): number[] {
  const counts = segmentCounts(holds, 'blue');
  return readingOrder(flags).map((i) => counts[i]);
}

export const SOLUTION: readonly number[] = Object.freeze(deriveCode());

export function checkCode(digits: readonly number[]): boolean {
  return digits.length === SOLUTION.length && digits.every((d, i) => d === SOLUTION[i]);
}

export type Diagnosis = 'ok' | 'order' | 'color' | 'wrong';

const sameMultiset = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * Gentle, spoiler-free feedback for a submitted code:
 * right numbers in the wrong order, or counted every hold on the line (not just blue).
 */
export function diagnose(digits: readonly number[]): Diagnosis {
  if (checkCode(digits)) return 'ok';
  if (sameMultiset(digits, SOLUTION)) return 'order';
  if (sameMultiset(digits, segmentCounts())) return 'color';
  return 'wrong';
}

/** Wrap any integer into 0..9 (dial positions). */
export function wrapDigit(n: number): number {
  return ((Math.round(n) % 10) + 10) % 10;
}

/** Dial rotation (degrees, clockwise-positive) → digit under the top indicator. */
export function digitFromRotation(deg: number): number {
  return wrapDigit(-deg / 36);
}

/** Shortest signed step count to go from one digit to another on a 10-position dial. */
export function shortestStep(from: number, to: number): number {
  const d = wrapDigit(to - from);
  return d > 5 ? d - 10 : d;
}

export const TIME_LIMIT_S = 5 * 60;

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

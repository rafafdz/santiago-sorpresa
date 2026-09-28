/**
 * Puzzle data and deterministic helpers.
 *
 * The climbing-wall route is the single source of truth: both the 3D wall
 * texture and the 2D "route" view are drawn from ROUTE, and the safe's
 * combination is *derived* from it (blue holds per segment), so the clue and
 * the answer can never drift apart.
 *
 * Coordinates live in a 300 x 420 board (origin top-left, y grows downward).
 */

export type HoldColor = 'blue' | 'orange' | 'gray';

export interface Hold {
  x: number;
  y: number;
  r: number;
  color: HoldColor;
  /** Index into ROUTE.segments for route holds; undefined for decoys. */
  segment?: number;
}

export interface Flag {
  x: number;
  y: number;
  label: string;
}

export const BOARD_W = 300;
export const BOARD_H = 420;

export const ROUTE_BASE = { x: 150, y: 402 };

const segmentHolds: [number, number][][] = [
  // Tramo I — base to first summit flag
  [
    [122, 372],
    [168, 348],
    [132, 318],
    [172, 292],
  ],
  // Tramo II — the long traverse to the left
  [
    [176, 244],
    [138, 228],
    [102, 208],
    [76, 182],
    [104, 158],
    [74, 134],
    [106, 112],
  ],
  // Tramo III — the short push to the top
  [
    [182, 80],
    [222, 62],
  ],
];

export const FLAGS: Flag[] = [
  { x: 206, y: 268, label: 'I' },
  { x: 136, y: 92, label: 'II' },
  { x: 258, y: 40, label: 'III' },
];

const decoys: [number, number, HoldColor][] = [
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
  [30, 112, 'gray'],
  [158, 150, 'gray'],
  [274, 272, 'gray'],
  [110, 40, 'gray'],
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
    seg.forEach(([x, y]) => holds.push({ x, y, r: 11 + rand() * 4, color: 'blue', segment }));
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

/** The combination: number of blue holds in each segment, in order. */
export function deriveCode(holds: Hold[] = HOLDS): number[] {
  const counts = FLAGS.map(() => 0);
  for (const h of holds) {
    if (h.color === 'blue' && h.segment !== undefined) counts[h.segment]++;
  }
  return counts;
}

export const SOLUTION: readonly number[] = Object.freeze(deriveCode());

export function checkCode(digits: readonly number[]): boolean {
  return digits.length === SOLUTION.length && digits.every((d, i) => d === SOLUTION[i]);
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

import { describe, expect, it } from 'vitest';
import {
  FLAGS,
  HOLDS,
  SOLUTION,
  checkCode,
  deriveCode,
  digitFromRotation,
  formatClock,
  routePolyline,
  shortestStep,
  wrapDigit,
} from './puzzle';

describe('route puzzle', () => {
  it('derives the combination from the blue holds on each segment', () => {
    expect(deriveCode()).toEqual([4, 7, 2]);
    expect(SOLUTION).toEqual([4, 7, 2]);
  });

  it('only counts blue route holds, never decoys', () => {
    const extraDecoys = [...HOLDS, { x: 0, y: 0, r: 10, color: 'orange' as const, segment: 0 }];
    expect(deriveCode(extraDecoys)).toEqual([4, 7, 2]);
  });

  it('has one flag per digit and a route that ends on the last flag', () => {
    expect(FLAGS).toHaveLength(SOLUTION.length);
    const line = routePolyline();
    expect(line[line.length - 1]).toEqual({ x: FLAGS[2].x, y: FLAGS[2].y });
    expect(line).toHaveLength(1 + 4 + 7 + 2 + 3);
  });

  it('keeps decoy holds visually separate from route holds', () => {
    const route = HOLDS.filter((h) => h.color === 'blue');
    const decoys = HOLDS.filter((h) => h.color !== 'blue');
    for (const d of decoys) {
      for (const r of route) expect(Math.hypot(d.x - r.x, d.y - r.y)).toBeGreaterThan(30);
    }
  });

  it('checks codes exactly', () => {
    expect(checkCode([4, 7, 2])).toBe(true);
    expect(checkCode([2, 7, 4])).toBe(false);
    expect(checkCode([4, 7])).toBe(false);
  });
});

describe('dial helpers', () => {
  it('wraps digits', () => {
    expect(wrapDigit(10)).toBe(0);
    expect(wrapDigit(-1)).toBe(9);
    expect(wrapDigit(23)).toBe(3);
  });

  it('maps rotation to the digit under the indicator', () => {
    expect(digitFromRotation(0)).toBe(0);
    expect(digitFromRotation(-36)).toBe(1);
    expect(digitFromRotation(36)).toBe(9);
    expect(digitFromRotation(-36 * 7 - 10)).toBe(7);
  });

  it('finds the shortest way around the dial', () => {
    expect(shortestStep(0, 9)).toBe(-1);
    expect(shortestStep(8, 1)).toBe(3);
    expect(shortestStep(2, 7)).toBe(5);
  });

  it('formats the countdown', () => {
    expect(formatClock(300)).toBe('05:00');
    expect(formatClock(61.2)).toBe('01:02');
    expect(formatClock(-4)).toBe('00:00');
  });
});

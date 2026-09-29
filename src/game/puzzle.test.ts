import { describe, expect, it } from 'vitest';
import {
  FLAGS,
  HOLDS,
  SOLUTION,
  checkCode,
  deriveCode,
  diagnose,
  digitFromRotation,
  formatClock,
  readingOrder,
  routePolyline,
  segmentCounts,
  shortestStep,
  wrapDigit,
} from './puzzle';

describe('route puzzle', () => {
  it('counts blue holds per segment, climbing order', () => {
    expect(segmentCounts(HOLDS, 'blue')).toEqual([4, 7, 2]);
    expect(segmentCounts()).toEqual([5, 9, 3]);
  });

  it('reads from the snow (highest flag) down to the laguna', () => {
    expect(readingOrder()).toEqual([2, 1, 0]);
    expect(deriveCode()).toEqual([2, 7, 4]);
    expect(SOLUTION).toEqual([2, 7, 4]);
  });

  it('ignores off-route holds even if they are blue', () => {
    const extra = [...HOLDS, { x: 0, y: 0, r: 10, color: 'blue' as const }];
    expect(deriveCode(extra)).toEqual([2, 7, 4]);
  });

  it('has one flag per digit and a route that ends on the top flag', () => {
    expect(FLAGS).toHaveLength(SOLUTION.length);
    const line = routePolyline();
    expect(line[line.length - 1]).toEqual({ x: FLAGS[2].x, y: FLAGS[2].y });
    expect(line).toHaveLength(1 + 5 + 9 + 3 + 3);
  });

  it('keeps every hold visually separate', () => {
    for (let i = 0; i < HOLDS.length; i++)
      for (let j = i + 1; j < HOLDS.length; j++)
        expect(Math.hypot(HOLDS[i].x - HOLDS[j].x, HOLDS[i].y - HOLDS[j].y)).toBeGreaterThan(29);
  });

  it('checks codes exactly', () => {
    expect(checkCode([2, 7, 4])).toBe(true);
    expect(checkCode([4, 7, 2])).toBe(false);
    expect(checkCode([2, 7])).toBe(false);
  });

  it('gives gentle, spoiler-free diagnoses', () => {
    expect(diagnose([2, 7, 4])).toBe('ok');
    expect(diagnose([4, 7, 2])).toBe('order');
    expect(diagnose([5, 9, 3])).toBe('color');
    expect(diagnose([3, 9, 5])).toBe('color');
    expect(diagnose([1, 2, 3])).toBe('wrong');
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

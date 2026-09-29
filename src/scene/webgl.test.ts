import { describe, expect, it } from 'vitest';
import { chooseRenderMode, detectWebGL, maxPixelRatio, viewFromQuery } from './webgl';

const ctx = (lost = false) => ({ isContextLost: () => lost, getExtension: () => ({ loseContext: () => {} }) });
const canvasWith = (map: Record<string, unknown>) => () => ({ getContext: (id: string) => map[id] ?? null });

describe('detectWebGL', () => {
  it('prefers WebGL2', () => {
    expect(detectWebGL(canvasWith({ webgl2: ctx(), webgl: ctx() }))).toEqual({ supported: true, version: 2 });
  });
  it('falls back to WebGL1', () => {
    expect(detectWebGL(canvasWith({ webgl: ctx() }))).toEqual({ supported: true, version: 1 });
    expect(detectWebGL(canvasWith({ 'experimental-webgl': ctx() }))).toEqual({ supported: true, version: 1 });
  });
  it('reports no support when no context can be created', () => {
    expect(detectWebGL(canvasWith({}))).toEqual({ supported: false, version: 0 });
    expect(detectWebGL(() => null)).toEqual({ supported: false, version: 0 });
  });
  it('treats an already-lost context as unsupported', () => {
    expect(detectWebGL(canvasWith({ webgl2: ctx(true) })).supported).toBe(false);
  });
  it('survives getContext throwing (some Android WebViews do)', () => {
    const throwing = () => ({
      getContext: (id: string) => {
        if (id === 'webgl2') throw new Error('blocked');
        return id === 'webgl' ? ctx() : null;
      },
    });
    expect(detectWebGL(throwing)).toEqual({ supported: true, version: 1 });
    expect(
      detectWebGL(() => {
        throw new Error('no canvas');
      }).supported,
    ).toBe(false);
  });
  it('releases the probe context', () => {
    let released = false;
    const gl = { isContextLost: () => false, getExtension: () => ({ loseContext: () => (released = true) }) };
    detectWebGL(canvasWith({ webgl2: gl }));
    expect(released).toBe(true);
  });
});

describe('chooseRenderMode', () => {
  const yes = { supported: true, version: 2 as const };
  const no = { supported: false, version: 0 as const };
  it('always uses the lite view without WebGL, even if 3D was requested', () => {
    expect(chooseRenderMode({ webgl: no })).toBe('lite');
    expect(chooseRenderMode({ webgl: no, query: '3d', pref: '3d' })).toBe('lite');
  });
  it('defaults to 3D when WebGL works', () => {
    expect(chooseRenderMode({ webgl: yes })).toBe('3d');
  });
  it('honours the query first, then the saved preference', () => {
    expect(chooseRenderMode({ webgl: yes, pref: 'lite' })).toBe('lite');
    expect(chooseRenderMode({ webgl: yes, query: '3d', pref: 'lite' })).toBe('3d');
    expect(chooseRenderMode({ webgl: yes, query: 'lite', pref: '3d' })).toBe('lite');
  });
  it('parses the ?vista= parameter', () => {
    expect(viewFromQuery('?vista=ligera')).toBe('lite');
    expect(viewFromQuery('?vista=3d')).toBe('3d');
    expect(viewFromQuery('?x=1')).toBeNull();
  });
});

describe('maxPixelRatio', () => {
  it('caps phones lower than desktops', () => {
    expect(maxPixelRatio(true, 3)).toBe(1.5);
    expect(maxPixelRatio(false, 3)).toBe(2);
    expect(maxPixelRatio(true, 1)).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { createGLContext, maxPixelRatio, rendererSettings, watchContextLoss } from './webgl';

const gl = (lost = false) => ({ isContextLost: () => lost });
const canvasWith = (map: Record<string, unknown>) => {
  const asked: string[] = [];
  return {
    asked,
    getContext: (id: string) => {
      asked.push(id);
      return map[id] ?? null;
    },
  };
};

describe('createGLContext (WebGL2 → WebGL1)', () => {
  it('uses WebGL2 when available', () => {
    const c = canvasWith({ webgl2: gl(), webgl: gl() });
    expect(createGLContext(c, {})?.version).toBe(2);
    expect(c.asked).toEqual(['webgl2']);
  });

  it('falls back to WebGL1', () => {
    expect(createGLContext(canvasWith({ webgl: gl() }), {})?.version).toBe(1);
    expect(createGLContext(canvasWith({ 'experimental-webgl': gl() }), {})?.version).toBe(1);
  });

  it('skips a context that is already lost', () => {
    expect(createGLContext(canvasWith({ webgl2: gl(true), webgl: gl() }), {})?.version).toBe(1);
  });

  it('survives getContext throwing (some Android WebViews do)', () => {
    const c = {
      getContext: (id: string) => {
        if (id === 'webgl2') throw new Error('blocked');
        return id === 'webgl' ? gl() : null;
      },
    };
    expect(createGLContext(c, {})?.version).toBe(1);
  });

  it('returns null when there is no WebGL at all', () => {
    expect(createGLContext(canvasWith({}), {})).toBeNull();
  });

  it('passes the context attributes through', () => {
    let got: unknown;
    createGLContext({ getContext: (_id: string, a?: unknown) => ((got = a), gl()) }, { antialias: false, stencil: false });
    expect(got).toEqual({ antialias: false, stencil: false });
  });
});

describe('renderer settings', () => {
  it('caps pixel ratio at 1.5 on phones and 2 on desktop', () => {
    expect(maxPixelRatio(true, 3)).toBe(1.5);
    expect(maxPixelRatio(true, 1)).toBe(1);
    expect(maxPixelRatio(false, 3)).toBe(2);
    expect(maxPixelRatio(false, 0)).toBe(1);
  });

  it('keeps full quality on desktop', () => {
    const s = rendererSettings({ mobile: false, dpr: 2 });
    expect(s).toMatchObject({ pixelRatio: 2, antialias: true, shadowMapSize: 1024, softShadows: true });
  });

  it('budgets phones: capped DPR and cheaper shadows, MSAA kept', () => {
    expect(rendererSettings({ mobile: true, dpr: 3 })).toMatchObject({
      pixelRatio: 1.5,
      antialias: true,
      shadowMapSize: 512,
      softShadows: false,
    });
    expect(rendererSettings({ mobile: true, dpr: 3 }).attributes).toMatchObject({
      antialias: true,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
    });
  });
});

describe('watchContextLoss', () => {
  function setup() {
    const target = new EventTarget();
    const log: string[] = [];
    const timers: (() => void)[] = [];
    const dispose = watchContextLoss(target, {
      onLost: () => log.push('lost'),
      onRestored: () => log.push('restored'),
      onGiveUp: () => log.push('giveup'),
      setTimer: (fn) => timers.push(fn) - 1,
      clearTimer: (id) => (timers[id as number] = () => {}),
    });
    const fire = (type: string) => {
      const e = new Event(type, { cancelable: true });
      target.dispatchEvent(e);
      return e;
    };
    return { log, timers, dispose, fire };
  }

  it('prevents the default on loss so the browser may restore the context', () => {
    const { fire, log } = setup();
    expect(fire('webglcontextlost').defaultPrevented).toBe(true);
    expect(log).toEqual(['lost']);
  });

  it('resumes on restore and cancels the give-up timer', () => {
    const { fire, log, timers } = setup();
    fire('webglcontextlost');
    fire('webglcontextrestored');
    timers.forEach((t) => t());
    expect(log).toEqual(['lost', 'restored']);
  });

  it('gives up when the context is never restored', () => {
    const { fire, log, timers } = setup();
    fire('webglcontextlost');
    timers.forEach((t) => t());
    expect(log).toEqual(['lost', 'giveup']);
  });

  it('stops listening after dispose', () => {
    const { fire, log, dispose } = setup();
    dispose();
    fire('webglcontextlost');
    expect(log).toEqual([]);
  });
});

/**
 * WebGL capability detection and render-mode choice.
 * Deliberately free of any `three` import so the lightweight 2D view never loads the 3D renderer.
 */

export type RenderMode = '3d' | 'lite';
export type WebGLSupport = { supported: boolean; version: 0 | 1 | 2 };

type CanvasLike = { getContext(id: string, opts?: unknown): unknown };
type GLLike = {
  isContextLost?: () => boolean;
  getExtension?: (name: string) => { loseContext?: () => void } | null;
};

const NONE: WebGLSupport = { supported: false, version: 0 };

/** Try WebGL2, then WebGL1. A context that is already lost counts as unsupported. */
export function detectWebGL(
  makeCanvas: () => CanvasLike | null = () => (typeof document === 'undefined' ? null : document.createElement('canvas')),
): WebGLSupport {
  try {
    const canvas = makeCanvas();
    if (!canvas) return NONE;
    const attempts: [string, 1 | 2][] = [
      ['webgl2', 2],
      ['webgl', 1],
      ['experimental-webgl', 1],
    ];
    for (const [id, version] of attempts) {
      let gl: GLLike | null = null;
      try {
        gl = canvas.getContext(id, { failIfMajorPerformanceCaveat: false }) as GLLike | null;
      } catch {
        gl = null;
      }
      if (!gl) continue;
      if (gl.isContextLost?.()) return NONE;
      // Release the probe context right away; mobile browsers cap how many can exist.
      gl.getExtension?.('WEBGL_lose_context')?.loseContext?.();
      return { supported: true, version };
    }
  } catch {
    /* fall through */
  }
  return NONE;
}

export const VIEW_PREF_KEY = 'caja-santiago:vista';

/** Reads ?vista=ligera|3d from a query string. */
export function viewFromQuery(search: string): RenderMode | null {
  const v = new URLSearchParams(search).get('vista');
  if (v === 'ligera' || v === 'lite' || v === '2d') return 'lite';
  if (v === '3d') return '3d';
  return null;
}

/** Decide the view: without WebGL it is always the lite view; otherwise query > saved preference > 3D. */
export function chooseRenderMode(opts: { webgl: WebGLSupport; query?: RenderMode | null; pref?: RenderMode | null }): RenderMode {
  if (!opts.webgl.supported) return 'lite';
  return opts.query ?? opts.pref ?? '3d';
}

export function readViewPref(): RenderMode | null {
  try {
    const v = localStorage.getItem(VIEW_PREF_KEY);
    return v === 'lite' || v === '3d' ? v : null;
  } catch {
    return null;
  }
}

export function saveViewPref(mode: RenderMode) {
  try {
    localStorage.setItem(VIEW_PREF_KEY, mode);
  } catch {
    /* storage unavailable (private mode) — the choice just won't persist */
  }
}

/** Coarse-pointer / small screens get a lower pixel ratio cap to save GPU memory and battery. */
export function maxPixelRatio(isMobile: boolean, dpr: number): number {
  return Math.min(dpr || 1, isMobile ? 1.5 : 2);
}

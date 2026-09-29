/**
 * WebGL plumbing for the 3D scene: context selection (WebGL2 → WebGL1),
 * per-device renderer settings and context-loss handling.
 *
 * No `three` import here, so it stays cheap to test and to load early.
 * three.js is pinned to r162 on purpose: it is the last release whose
 * WebGLRenderer still runs on WebGL1, which many older Android GPUs/WebViews need.
 */

export type WebGLVersion = 1 | 2;
export type GLContext = WebGLRenderingContext | WebGL2RenderingContext;

type CanvasLike = { getContext(id: string, opts?: unknown): unknown };
type GLLike = { isContextLost?: () => boolean };

export const CONTEXT_IDS: [string, WebGLVersion][] = [
  ['webgl2', 2],
  ['webgl', 1],
  ['experimental-webgl', 1],
];

/**
 * Create the best available context on `canvas`: WebGL2 if possible, else WebGL1.
 * Returns null when no usable (non-lost) context can be created.
 */
export function createGLContext<T = GLContext>(
  canvas: CanvasLike,
  attributes: WebGLContextAttributes,
): { gl: T; version: WebGLVersion } | null {
  for (const [id, version] of CONTEXT_IDS) {
    let gl: GLLike | null = null;
    try {
      gl = canvas.getContext(id, attributes) as GLLike | null;
    } catch {
      gl = null; // some Android WebViews throw instead of returning null
    }
    if (gl && !gl.isContextLost?.()) return { gl: gl as T, version };
  }
  return null;
}

export interface DeviceInfo {
  mobile: boolean;
  dpr: number;
}

export interface RendererSettings {
  pixelRatio: number;
  antialias: boolean;
  shadowMapSize: number;
  softShadows: boolean;
  anisotropy: number;
  attributes: WebGLContextAttributes;
}

/** Phones are capped at 1.5× pixel ratio; desktops at 2×. */
export function maxPixelRatio(mobile: boolean, dpr: number): number {
  return Math.min(dpr || 1, mobile ? 1.5 : 2);
}

/**
 * Rendering budget per device. Same scene and materials everywhere; phones get a
 * lower pixel ratio and cheaper shadows. MSAA stays on: mobile GPUs are tile-based,
 * where it is nearly free, and the capped pixel ratio would otherwise show jaggies.
 */
export function rendererSettings({ mobile, dpr }: DeviceInfo): RendererSettings {
  const pixelRatio = maxPixelRatio(mobile, dpr);
  const antialias = true;
  return {
    pixelRatio,
    antialias,
    shadowMapSize: mobile ? 512 : 1024,
    softShadows: !mobile,
    anisotropy: mobile ? 2 : 4,
    attributes: {
      alpha: false,
      antialias,
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
    },
  };
}

export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined') return { mobile: false, dpr: 1 };
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  return { mobile: coarse || small, dpr: window.devicePixelRatio || 1 };
}

export interface ContextWatchOptions {
  onLost: () => void;
  onRestored: () => void;
  /** Called when the browser does not restore the context in time (caller should rebuild the canvas). */
  onGiveUp: () => void;
  timeoutMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
}

/**
 * Listen for webglcontextlost/restored on a canvas. Calling preventDefault() on
 * "lost" tells the browser we can restore; if it never does, we give up after a timeout.
 * Returns a disposer.
 */
export function watchContextLoss(target: EventTarget, opts: ContextWatchOptions): () => void {
  const setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = opts.clearTimer ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));
  let timer: unknown = null;

  const lost = (e: Event) => {
    e.preventDefault();
    opts.onLost();
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      opts.onGiveUp();
    }, opts.timeoutMs ?? 3000);
  };
  const restored = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
    opts.onRestored();
  };
  target.addEventListener('webglcontextlost', lost);
  target.addEventListener('webglcontextrestored', restored);
  return () => {
    if (timer !== null) clearTimer(timer);
    target.removeEventListener('webglcontextlost', lost);
    target.removeEventListener('webglcontextrestored', restored);
  };
}

/** Thrown when neither WebGL2 nor WebGL1 is available. */
export class WebGLUnavailableError extends Error {
  constructor() {
    super('WebGL unavailable');
    this.name = 'WebGLUnavailableError';
  }
}

let cached: boolean | null = null;

/** Returns true when a WebGL2 or WebGL1 context can be created. Cached after first call. */
export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('nowebgl')) {
    cached = false;
    return cached;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    cached = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

let cached: boolean | null = null;

/** Feature-detects WebGL once. Used to choose between the 3D scene and static fallbacks. */
export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    if (new URLSearchParams(location.search).has('no3d')) return (cached = false); // manual fallback testing
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    cached = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

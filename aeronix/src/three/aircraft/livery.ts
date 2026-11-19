import * as THREE from 'three';
import { clamp, smoothstep } from '../../utils/math';

/**
 * Original AERONIX AIRWAYS livery, painted procedurally onto canvas textures.
 *
 * Fuselage texture space (matches createFuselageGeometry UVs, flipY = false):
 *   canvas X → along the body, tail (0) → nose (W)
 *   canvas Y → around the body, top (0) → starboard (H/4) → belly (H/2) → port (3H/4) → top (H)
 */

const COLORS = {
  pearl: '#f3f5f8',
  pearlShade: '#e4e8ee',
  navy: '#0b1f35',
  deepNavy: '#071629',
  silver: '#aebbc8',
  gold: '#c5a46d',
  glass: '#101a26',
};

/** Navy belly boundary offset (in fraction of circumference) below the side line, along the body. */
function bellyOffset(t: number) {
  const tail = smoothstep(0.0, 0.3, t); // sweeps up toward the tail
  const nose = smoothstep(0.74, 1.0, t); // recedes under the nose
  return -0.05 + 0.115 * tail + 0.13 * nose;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, fill: string, accent: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, -size / 2);
  ctx.lineTo(size * 0.42, size / 2);
  ctx.lineTo(size * 0.26, size / 2);
  ctx.lineTo(0, -size * 0.06);
  ctx.lineTo(-size * 0.26, size / 2);
  ctx.lineTo(-size * 0.42, size / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = size * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-size * 0.28, size * 0.26);
  ctx.lineTo(size * 0.28, size * 0.26);
  ctx.stroke();
  ctx.restore();
}

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

/** Windows, doors and cockpit glazing for the starboard band (top → side of the canvas). */
function drawSideDetails(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const sideY = H * 0.25;
  const winW = W * 0.0052;
  const winH = H * 0.026;
  const winY = sideY - H * 0.046;
  const doors = [0.29, 0.47, 0.7, 0.835];
  const doorW = W * 0.0165;
  for (let t = 0.245; t < 0.86; t += 0.0081) {
    if (doors.some((d) => Math.abs(t - d) < 0.017)) continue;
    const x = t * W;
    ctx.fillStyle = COLORS.glass;
    roundRect(ctx, x - winW / 2, winY - winH / 2, winW, winH, winW * 0.48);
    ctx.fill();
    ctx.fillStyle = 'rgba(174,187,200,0.35)';
    roundRect(ctx, x - winW / 2 + 1, winY - winH / 2 + 1, winW - 2, winH * 0.35, winW * 0.4);
    ctx.fill();
  }
  ctx.lineWidth = Math.max(1.5, W * 0.00045);
  doors.forEach((d) => {
    const x = d * W;
    const top = winY - winH * 1.05;
    ctx.strokeStyle = 'rgba(80,95,112,0.55)';
    roundRect(ctx, x - doorW / 2, top, doorW, H * 0.108, doorW * 0.18);
    ctx.stroke();
    ctx.fillStyle = COLORS.glass;
    roundRect(ctx, x - winW / 2, winY - winH / 2, winW, winH, winW * 0.48);
    ctx.fill();
  });
  ctx.fillStyle = COLORS.glass;
  ctx.strokeStyle = COLORS.silver;
  ctx.lineWidth = Math.max(1, W * 0.0003);
  const panes: [number, number, number, number][] = [
    [0.9505, 0.958, 0.104, 0.168],
    [0.9585, 0.966, 0.096, 0.162],
    [0.9665, 0.9745, 0.068, 0.15],
  ];
  panes.forEach(([t0, t1, a0, a1]) => {
    ctx.beginPath();
    ctx.moveTo(t0 * W, a1 * H);
    ctx.lineTo(t1 * W, (a1 - 0.012) * H);
    ctx.lineTo(t1 * W, a0 * H);
    ctx.lineTo(t0 * W, (a0 + 0.01) * H);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
}

const TITLE = { t: 0.56, a: 0.25 - 0.118, size: 0.07 } as const;

/** Emblem + AERONIX AIRWAYS wordmark, centred on the current origin. */
function drawTitleBlock(ctx: Ctx, H: number) {
  const h = H * TITLE.size;
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${h}px "Inter Tight Variable", "Inter Variable", Arial, sans-serif`;
  ctx.letterSpacing = `${h * 0.22}px`;
  const w1 = ctx.measureText('AERONIX').width;
  ctx.font = `500 ${h * 0.62}px "Inter Variable", Arial, sans-serif`;
  ctx.letterSpacing = `${h * 0.36}px`;
  const w2 = ctx.measureText('AIRWAYS').width;
  const emblem = h * 1.1;
  const gap = h * 0.6;
  const total = emblem + gap + w1 + gap + w2;
  let x = -total / 2;
  drawEmblem(ctx, x + emblem / 2, 0, emblem, COLORS.navy, COLORS.gold);
  x += emblem + gap;
  ctx.fillStyle = COLORS.navy;
  ctx.font = `700 ${h}px "Inter Tight Variable", "Inter Variable", Arial, sans-serif`;
  ctx.letterSpacing = `${h * 0.22}px`;
  ctx.fillText('AERONIX', x, 0);
  x += w1 + gap;
  ctx.fillStyle = '#3c5470';
  ctx.font = `500 ${h * 0.62}px "Inter Variable", Arial, sans-serif`;
  ctx.letterSpacing = `${h * 0.36}px`;
  ctx.fillText('AIRWAYS', x, h * 0.04);
  ctx.letterSpacing = '0px';
}

function drawRegistration(ctx: Ctx, H: number) {
  ctx.font = `600 ${H * 0.022}px "Inter Variable", Arial, sans-serif`;
  ctx.fillStyle = '#51657c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AX-NXA', 0, 0);
  ctx.textAlign = 'start';
}

/**
 * Starboard markings are drawn directly. For the port side, details are mirrored across the
 * belly line (a → 1 − a) and text blocks are rotated 180° about their own centre, which —
 * given the UV layout — makes them read left-to-right (nose-left) from the port side.
 */
function drawAllMarkings(ctx: Ctx, W: number, H: number) {
  drawSideDetails(ctx, W, H);
  ctx.save();
  ctx.translate(0, H);
  ctx.scale(1, -1);
  drawSideDetails(ctx, W, H);
  ctx.restore();

  const blocks: [number, number, (c: Ctx) => void][] = [
    [TITLE.t, TITLE.a, (c) => drawTitleBlock(c, H)],
    [0.16, 0.25 - 0.03, (c) => drawRegistration(c, H)],
  ];
  for (const [t, a, draw] of blocks) {
    ctx.save();
    ctx.translate(t * W, a * H);
    draw(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(t * W, (1 - a) * H);
    ctx.rotate(Math.PI);
    draw(ctx);
    ctx.restore();
  }
}

export function createFuselageLivery(width = 4096): THREE.CanvasTexture {
  const W = width;
  const H = width / 4;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) throw new Error('2D canvas unavailable');

  // Pearl base with subtle around-shading
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, COLORS.pearl);
  base.addColorStop(0.5, COLORS.pearlShade);
  base.addColorStop(1, COLORS.pearl);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Navy belly with flowing boundary
  const steps = 256;
  const boundary = (t: number) => clamp(0.25 + bellyOffset(t), 0.18, 0.49);
  ctx.fillStyle = COLORS.navy;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) ctx.lineTo((i / steps) * W, boundary(i / steps) * H);
  for (let i = steps; i >= 0; i--) ctx.lineTo((i / steps) * W, (1 - boundary(i / steps)) * H);
  ctx.closePath();
  ctx.fill();

  // Silver + gold pinstripes following the boundary on both sides
  const stripe = (offset: number, color: string, widthPx: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx;
    for (const side of [1, -1]) {
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const b = boundary(t) - offset;
        const y = side === 1 ? b * H : (1 - b) * H;
        if (i === 0) ctx.moveTo(t * W, y);
        else ctx.lineTo(t * W, y);
      }
      ctx.stroke();
    }
  };
  stripe(0.009, COLORS.silver, H * 0.007);
  stripe(0.017, COLORS.gold, H * 0.0035);

  // Faint panel lines for surface detail
  ctx.strokeStyle = 'rgba(40,60,85,0.07)';
  ctx.lineWidth = 1;
  for (let t = 0.05; t < 0.96; t += 0.0625) {
    ctx.beginPath();
    ctx.moveTo(t * W, 0);
    ctx.lineTo(t * W, H);
    ctx.stroke();
  }
  [0.12, 0.38, 0.62, 0.88].forEach((a) => {
    ctx.beginPath();
    ctx.moveTo(0, a * H);
    ctx.lineTo(W, a * H);
    ctx.stroke();
  });

  drawAllMarkings(ctx, W, H);

  // Tail cone / APU exhaust
  const tailGrad = ctx.createLinearGradient(0, 0, W * 0.025, 0);
  tailGrad.addColorStop(0, '#4b5866');
  tailGrad.addColorStop(1, 'rgba(75,88,102,0)');
  ctx.fillStyle = tailGrad;
  ctx.fillRect(0, 0, W * 0.025, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Vertical stabiliser livery. UV: u = chordwise (0 LE → 1 TE), v = spanwise (0 root → 1 tip). */
export function createTailLivery(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const S = size;
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#0e2742');
  g.addColorStop(1, COLORS.deepNavy);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  // Flowing silver & gold sweep (original design)
  ctx.lineCap = 'round';
  ctx.strokeStyle = COLORS.silver;
  ctx.lineWidth = S * 0.02;
  ctx.beginPath();
  ctx.moveTo(S * 0.05, S * 0.18);
  ctx.bezierCurveTo(S * 0.4, S * 0.25, S * 0.6, S * 0.55, S * 1.05, S * 0.62);
  ctx.stroke();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = S * 0.008;
  ctx.beginPath();
  ctx.moveTo(S * 0.05, S * 0.23);
  ctx.bezierCurveTo(S * 0.4, S * 0.3, S * 0.6, S * 0.6, S * 1.05, S * 0.67);
  ctx.stroke();
  // Emblem: v grows with canvas y (flipY = false), so the tip is at the bottom of the canvas.
  ctx.save();
  ctx.translate(S * 0.5, S * 0.5);
  ctx.scale(1, -1);
  drawEmblem(ctx, 0, 0, S * 0.3, '#f4f7fa', COLORS.gold);
  ctx.restore();
  // Root fairing band
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(0, S * 0.035, S, S * 0.006);
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

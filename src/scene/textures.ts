import * as THREE from 'three';
import { BOARD_H, BOARD_W, FLAGS, HOLDS, mulberry32, routePolyline } from '../game/puzzle';
import { HOLD_COLORS, LAGUNA, SNOW_PATH, flagPennant } from '../game/wallArt';


function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { c, ctx };
}

function finish(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Irregular blob path used for climbing holds (canvas). */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number) {
  const rand = mulberry32(seed);
  const n = 9;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.78 + rand() * 0.35);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.85;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** The climbing board, drawn from the exact same data as the 2D route view. */
export function wallTexture(): THREE.CanvasTexture {
  const s = 2;
  const { c, ctx } = canvas(BOARD_W * s, BOARD_H * s);
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, 0, 0, BOARD_H);
  g.addColorStop(0, '#2b3448');
  g.addColorStop(1, '#1d2433');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  // T-nut grid
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 14; y < BOARD_H; y += 22) for (let x = 12; x < BOARD_W; x += 22) ctx.fillRect(x, y, 2, 2);
  // chalky route line
  ctx.setLineDash([3, 6]);
  ctx.strokeStyle = 'rgba(243,230,204,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  routePolyline().forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);
  HOLDS.forEach((h, i) => {
    blob(ctx, h.x, h.y, h.r, i + 1);
    ctx.fillStyle = HOLD_COLORS[h.color];
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    blob(ctx, h.x - 2, h.y - 3, h.r * 0.45, i + 50);
    ctx.fill();
  });
  FLAGS.forEach((f) => drawFlag(ctx, f.x, f.y));
  // landmarks: snow on top, laguna at the foot
  ctx.fillStyle = '#eef3f8';
  ctx.fill(new Path2D(SNOW_PATH));
  ctx.fillStyle = '#3f8fc4';
  ctx.beginPath();
  ctx.ellipse(LAGUNA.cx, LAGUNA.cy, LAGUNA.rx, LAGUNA.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3e6cc';
  ctx.font = '600 9px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAGUNA', LAGUNA.cx, LAGUNA.cy + 3);
  return finish(c);
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = '#f3e6cc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x, y - 16);
  ctx.stroke();
  ctx.fillStyle = '#e2483d';
  ctx.fill(new Path2D(flagPennant(x, y)));
}

export function woodTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(512, 256);
  ctx.fillStyle = '#3b2518';
  ctx.fillRect(0, 0, 512, 256);
  const rand = mulberry32(7);
  for (let i = 0; i < 90; i++) {
    const y = rand() * 256;
    ctx.strokeStyle = `rgba(${rand() > 0.5 ? '20,10,5' : '110,70,40'},${0.12 + rand() * 0.2})`;
    ctx.lineWidth = 0.5 + rand() * 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y + Math.sin(x / 60 + i) * 3 + (rand() - 0.5) * 2);
    ctx.stroke();
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function plasterTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(256, 256);
  ctx.fillStyle = '#161d2b';
  ctx.fillRect(0, 0, 256, 256);
  const rand = mulberry32(11);
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '0,0,0'},${rand() * 0.05})`;
    ctx.fillRect(rand() * 256, rand() * 256, 2, 2);
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 3);
  return t;
}

/** Brass token face: mountain engraving + LAGUNA. */
export function tokenTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(256, 256);
  const g = ctx.createRadialGradient(110, 100, 10, 128, 128, 128);
  g.addColorStop(0, '#f0c98a');
  g.addColorStop(1, '#9a6a33');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#4a2f14';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(40, 170);
  ctx.lineTo(95, 95);
  ctx.lineTo(120, 128);
  ctx.lineTo(160, 70);
  ctx.lineTo(216, 170);
  ctx.stroke();
  ctx.fillStyle = '#4a2f14';
  ctx.font = '700 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAGUNA', 128, 212);
  return finish(c);
}

/** Label for a bag of Brazilian coffee — the office's contribution to the table. */
export function coffeeTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(256, 320);
  ctx.fillStyle = '#1f5a3a';
  ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = '#f2c230';
  ctx.beginPath();
  ctx.moveTo(128, 70);
  ctx.lineTo(220, 150);
  ctx.lineTo(128, 230);
  ctx.lineTo(36, 150);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a2a6c';
  ctx.beginPath();
  ctx.arc(128, 150, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3e6cc';
  ctx.textAlign = 'center';
  ctx.font = '800 38px Georgia, serif';
  ctx.fillText('CAFÉ', 128, 50);
  ctx.font = '600 20px Helvetica, Arial, sans-serif';
  ctx.fillText('Minas Gerais', 128, 272);
  ctx.font = 'italic 16px Georgia, serif';
  ctx.fillText('pro time, com carinho', 128, 298);
  return finish(c);
}

/** Notebook page with a little loss curve — ML flavor. */
export function notebookTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(256, 320);
  ctx.fillStyle = '#efe4cc';
  ctx.fillRect(0, 0, 256, 320);
  ctx.strokeStyle = 'rgba(80,120,170,0.35)';
  ctx.lineWidth = 1;
  for (let y = 40; y < 320; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a3550';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 90);
  ctx.lineTo(30, 250);
  ctx.lineTo(230, 250);
  ctx.stroke();
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const x = 34 + i * 4.8;
    const y = 240 - 140 * Math.exp(-i / 9) - 8 + Math.sin(i * 1.7) * 3;
    if (i) ctx.lineTo(x, 330 - y);
    else ctx.moveTo(x, 330 - y);
  }
  ctx.stroke();
  ctx.fillStyle = '#2a3550';
  ctx.font = 'italic 20px Georgia, serif';
  ctx.fillText('loss ↓  grip ↑', 40, 290);
  return finish(c);
}

/** Soft round sprite used for chalk dust and glows. */
export function softDotTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return finish(c);
}

// Seamless rotating + cycling gradient field — shared by the live canvas and the video export.
// Seamless rotating + cycling gradient field. Deterministic: phase in [0,1) → identical frame.
const TAU = Math.PI * 2;

// Cyclic palette (last wraps to first) — sampled from the reference image only.
const PALETTE = [
  [253, 251, 255],
  [242, 232, 251],
  [214, 176, 244],
  [178, 96, 244],
  [150, 78, 242],
  [110, 116, 240],
  [26, 112, 222],
  [20, 90, 210],
  [60, 168, 226],
  [120, 220, 232],
  [214, 190, 246],
];

function paletteAt(p: number) {
  p = p - Math.floor(p);
  const n = PALETTE.length;
  const f = p * n;
  const i = Math.floor(f);
  const k = f - i;
  const a = PALETTE[i % n], b = PALETTE[(i + 1) % n];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
}

let noisePattern: CanvasPattern | null = null;
function getNoise(ctx: CanvasRenderingContext2D, size = 256) {
  if (noisePattern) return noisePattern;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 145;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noisePattern = ctx.createPattern(c, 'repeat');
  return noisePattern;
}

const BLOBS = [
  { c: [178, 96, 244], a: 0.85, x: 0.34, y: 0.58, rx: 0.34, ry: 0.32, f: 0, s: 1 },
  { c: [22, 108, 226], a: 0.95, x: 0.76, y: 0.62, rx: 0.30, ry: 0.34, f: 1.7, s: 1 },
  { c: [116, 220, 234], a: 0.7, x: 0.66, y: 0.72, rx: 0.20, ry: 0.20, f: 3.1, s: 2 },
  { c: [232, 154, 246], a: 0.62, x: 0.66, y: 0.12, rx: 0.24, ry: 0.22, f: 4.4, s: 1 },
  { c: [255, 253, 255], a: 0.9, x: 0.12, y: 0.14, rx: 0.30, ry: 0.28, f: 5.6, s: 1 },
];

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  opts: { grain?: number; px?: number; py?: number } = {}
) {
  const grain = opts.grain ?? 0.42;
  const px = opts.px ?? 0;   // parallax offset x
  const py = opts.py ?? 0;
  const unit = Math.min(w, h);
  t = t - Math.floor(t);

  ctx.save();
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // Rotating base band, hues travelling around the cyclic palette.
  const cx = w / 2 + px, cy = h / 2 + py;
  const ang = (-58 + 26 * Math.sin(TAU * t)) * Math.PI / 180;
  const L = Math.hypot(w, h) * 1.15;
  const g = ctx.createLinearGradient(
    cx - Math.cos(ang) * L / 2, cy - Math.sin(ang) * L / 2,
    cx + Math.cos(ang) * L / 2, cy + Math.sin(ang) * L / 2
  );
  const N = 48;
  for (let i = 0; i <= N; i++) g.addColorStop(i / N, paletteAt(i / N - t));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft drifting fields — Lissajous paths with integer harmonics stay seamless.
  ctx.filter = `blur(${(unit * 0.07).toFixed(1)}px)`;
  for (const b of BLOBS) {
    const ph = b.f;
    const bx = (b.x + 0.07 * Math.cos(TAU * t * b.s + ph) + 0.035 * Math.cos(TAU * 2 * t + ph)) * w + px;
    const by = (b.y + 0.06 * Math.sin(TAU * t * b.s + ph * 1.3) + 0.03 * Math.sin(TAU * 2 * t + ph)) * h + py;
    const pulse = 1 + 0.14 * Math.sin(TAU * t + ph);
    const rx = b.rx * unit * 2 * pulse, ry = b.ry * unit * 2 * pulse;
    const r = Math.max(rx, ry);
    const rg = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    const [cr, cg, cb] = b.c;
    rg.addColorStop(0, `rgba(${cr},${cg},${cb},${b.a})`);
    rg.addColorStop(0.5, `rgba(${cr},${cg},${cb},${b.a * 0.45})`);
    rg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(rx / r, ry / r);
    ctx.translate(-bx, -by);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.filter = 'none';
  ctx.restore();

  if (grain > 0) {
    const pat = getNoise(ctx);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grain;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = grain * 0.35;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

export const LOOP_SECONDS = 30;

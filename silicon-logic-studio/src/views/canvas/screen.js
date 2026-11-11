// Obraz virtuálního monitoru: VRAM se převede na malý canvas 1:1 (jen po zápisu) a roztáhne bez vyhlazování.
import { screenInfo, screenRgb } from '../../engine/logicEngine.js';

const cache = new WeakMap(); // součástka -> { canvas, rev }

export function paintScreen(ctx, comp, x, y, w, h) {
  if (!comp.vram) return;
  const { cols, rows } = screenInfo(comp);
  let e = cache.get(comp);
  if (!e || e.canvas.width !== cols || e.canvas.height !== rows) {
    e = { canvas: document.createElement('canvas'), rev: -1 };
    e.canvas.width = cols;
    e.canvas.height = rows;
    cache.set(comp, e);
  }
  if (e.rev !== comp.vramRev) {
    const c = e.canvas.getContext('2d');
    const img = c.createImageData(cols, rows);
    for (let i = 0; i < cols * rows; i++) {
      const [r, g, b] = screenRgb(comp, comp.vram[i] || 0);
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    e.rev = comp.vramRev;
  }
  const s = Math.min(w / cols, h / rows); // zachovat poměr stran (320×240 není čtverec)
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(e.canvas, x + (w - cols * s) / 2, y + (h - rows * s) / 2, cols * s, rows * s);
  ctx.imageSmoothingEnabled = smooth;
}

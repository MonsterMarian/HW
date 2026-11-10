// Rozložení dílů na stole: řady zleva doprava, nová řada když se díl nevejde do šířky.
// sizes = [{ w, d }] v mm (půdorys), vrací [{ x, z }] = levý zadní roh každého dílu
// a celkový rozměr. Pořadí dílů zůstává (kusovník čte zleva doprava, shora dolů).
export function packRows(sizes, { gap = 40, maxW } = {}) {
  const area = sizes.reduce((a, s) => a + (s.w + gap) * (s.d + gap), 0);
  const widest = Math.max(0, ...sizes.map((s) => s.w));
  const limit = Math.max(widest, maxW ?? Math.sqrt(area) * 1.5);
  const out = [];
  let x = 0, z = 0, rowD = 0, width = 0;
  for (const s of sizes) {
    if (x > 0 && x + s.w > limit) { z += rowD + gap; x = 0; rowD = 0; }
    out.push({ x, z });
    x += s.w + gap;
    rowD = Math.max(rowD, s.d);
    width = Math.max(width, x - gap);
  }
  return { positions: out, width, depth: sizes.length ? z + rowD : 0 };
}

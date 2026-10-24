// Généré par site-src/build.py depuis src/lib/video.js (ne pas modifier ici).
const r2 = x => Math.round(x * 100) / 100;
export function lossOf(vs) {
  const ok = (vs || []).filter(x => x > 0); if (!ok.length) return { best: null, last: null, loss: null };
  const best = Math.max(...ok), last = ok[ok.length - 1];
  return { best: r2(best), last: r2(last), loss: ok.length > 1 ? Math.round((best - last) / best * 100) : 0 };
}
export function lossNote(loss, limit) {
  if (loss == null) return null;
  const L = limit || 20;
  if (loss <= L) return { k: 'ok', l: 'Perte de ' + loss + ' % : dans ta limite de ' + L + ' %.' };
  return { k: 'over', l: 'Perte de ' + loss + ' % : au-delà de ta limite de ' + L + ' %. Arrête la série plus tôt ou baisse la charge à la prochaine.' };
}

// Généré par site-src/build.py depuis src/lib/force.js (ne pas modifier ici).
// Analyse d'une mesure de force (capteur Tindeq Progressor ou autre dynamomètre) : échantillons [temps en s, force en kg].
// Force max : pic de la force lissée sur 0,25 s. Force critique : test de Giles et al. 2019, 24 tractions de 7 s avec 3 s de repos,
// force critique = moyenne des moyennes des 6 dernières tractions.

// Force lissée : moyenne glissante sur `win` secondes ; retourne [[t, kg], …]
export function smooth(samples, win = 0.25) {
  const out = [];
  let j = 0, sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i][1];
    while (samples[i][0] - samples[j][0] > win) { sum -= samples[j][1]; j++; }
    out.push([samples[i][0], sum / (i - j + 1)]);
  }
  return out;
}
const r1 = x => Math.round(x * 10) / 10;

// Début de l'effort : première force au-dessus de max(2 kg, 8 % du pic)
export function startOf(samples) {
  if (!samples.length) return null;
  const pk = Math.max(...samples.map(s => s[1])), thr = Math.max(2, pk * 0.08);
  const s = samples.find(x => x[1] >= thr);
  return s ? s[0] : null;
}

// Test de force max : pic lissé (0,25 s) et meilleure moyenne sur 5 s (force tenue)
export function maxTest(samples) {
  if (samples.length < 5) return null;
  const sm = smooth(samples), peak = Math.max(...sm.map(s => s[1]));
  if (!(peak > 0)) return null;
  const sm5 = smooth(samples, 5);
  let hold = 0; const t0 = startOf(samples) || 0;
  for (const s of sm5) if (s[0] - t0 >= 4.9 && s[1] > hold) hold = s[1];
  return { peak: r1(peak), hold5: hold ? r1(hold) : null, n: samples.length };
}

// Test de force critique : `reps` tractions de `on` s, `off` s de repos, départ au premier effort
export function cfTest(samples, opts) {
  const o = Object.assign({ on: 7, off: 3, reps: 24, last: 6, skip: 0.5 }, opts || {});
  const t0 = startOf(samples);
  if (t0 == null) return null;
  const reps = [];
  for (let i = 0; i < o.reps; i++) {
    const a = t0 + i * (o.on + o.off) + o.skip, b = t0 + i * (o.on + o.off) + o.on;
    const w = samples.filter(s => s[0] >= a && s[0] <= b);
    if (w.length < 3) break;
    reps.push(w.reduce((x, s) => x + s[1], 0) / w.length);
  }
  if (reps.length < o.last + 2) return null;
  const sm = smooth(samples), peak = Math.max(...sm.map(s => s[1])), tail = reps.slice(-o.last);
  const cf = tail.reduce((x, v) => x + v, 0) / tail.length;
  return { cf: r1(cf), pic: r1(peak), reps: reps.map(r1), complete: reps.length >= o.reps, ratio: Math.round(cf / peak * 100) };
}

// Force de contact (RFD, rate of force development) : de combien de kilos la force monte par seconde au début d'un effort explosif.
// L'enregistrement commence détendu (au moins 0,5 s de repos), l'effort part sur le signal. Le début de l'effort est détecté sur la force brute :
// premier moment où elle dépasse le repos de plus de max(0,5 kg, 3 écarts-types) pendant 3 mesures de suite, puis on remonte au passage du seuil de repos (interpolé entre deux mesures).
// RFD 0–200 ms (mesure principale, la plus fiable avec ~80 mesures/s) et RFD 0–100 ms = (force à t − force de repos) / t.
// Fenêtres : Levernier et Laffaye 2019 (200 premières ms), Maffiuletti et al. 2016 (revue).
const at = (s, t) => {
  if (t <= s[0][0]) return s[0][1];
  for (let i = 1; i < s.length; i++) if (s[i][0] >= t) { const a = s[i - 1], b = s[i]; return b[0] === a[0] ? b[1] : a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return s[s.length - 1][1];
};
export function rfdTest(samples, opts) {
  const o = Object.assign({ rest: 0.5, minRest: 0.3, minKg: 0.5, minPeak: 5, after: 0.3 }, opts || {});
  if (!samples || samples.length < 20) return { error: 'short' };
  const t0 = samples[0][0], base = samples.filter(s => s[0] - t0 <= o.rest);
  if (base.length < 5 || samples[samples.length - 1][0] - t0 < o.rest + 0.5) return { error: 'short' };
  const mu = base.reduce((x, s) => x + s[1], 0) / base.length;
  const sd = Math.sqrt(base.reduce((x, s) => x + (s[1] - mu) * (s[1] - mu), 0) / base.length);
  if (Math.max(...base.map(s => s[1])) > 2) return { error: 'tense' }; // il tirait déjà avant le signal
  const thr = mu + Math.max(o.minKg, 3 * sd);
  let i = samples.findIndex((s, j) => s[0] - t0 > o.rest && j + 2 < samples.length && s[1] >= thr && samples[j + 1][1] >= thr && samples[j + 2][1] >= thr);
  if (i < 0) return { error: 'weak' };
  let j = i; const low = mu + Math.max(0.15, sd);
  while (j > 0 && samples[j - 1][1] > low) j--;
  // le début tombe entre deux mesures (12 ms à 80 mesures/s) : on interpole le passage du seuil de repos
  let on = samples[j][0];
  if (j > 0 && samples[j][1] > samples[j - 1][1] && samples[j - 1][1] <= low) on = samples[j - 1][0] + (low - samples[j - 1][1]) / (samples[j][1] - samples[j - 1][1]) * (samples[j][0] - samples[j - 1][0]);
  const end = samples[samples.length - 1][0];
  if (end - on < o.after + 0.2) return { error: 'short' };
  const sm = smooth(samples, 0.1), peak = Math.max(...sm.filter(s => s[0] >= on).map(s => s[1]));
  if (peak - mu < o.minPeak) return { error: 'weak' };
  const f = w => (at(samples, on + w) - mu) / w;
  return { rfd100: Math.round(f(0.1)), rfd200: Math.round(f(0.2)), peak: r1(peak), pct200: Math.round((at(samples, on + 0.2) - mu) / (peak - mu) * 100), onset: Math.round((on - t0) * 1000) / 1000 };
}
// Meilleur essai : le plus grand RFD 0–200 ms
export function rfdBest(trials) {
  let b = -1;
  (trials || []).forEach((t, i) => { if (t && !t.error && (b < 0 || t.rfd200 > trials[b].rfd200)) b = i; });
  return b;
}
// Symétrie gauche/droite : la plus faible des deux mains en % de la plus forte
export function symmetry(l, r) {
  if (!(l > 0) || !(r > 0)) return null;
  return Math.round(Math.min(l, r) / Math.max(l, r) * 100);
}

// Qu'est-ce que le capteur peut remplir : tests de force des doigts
export const TINDEQ_TESTS = { 'fmax-semi': 'max', 'fmax-tendu': 'max', pinch: 'max', cf: 'cf', 'rfd-doigts': 'rfd' };
export const tindeqKind = tid => TINDEQ_TESTS[tid] || null;

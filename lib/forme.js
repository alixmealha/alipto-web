// Généré par site-src/build.py depuis src/lib/rules.js (ne pas modifier ici).
export const WELL = [
  ['sommeil', 'Sommeil', 'très mauvais', 'excellent'],
  ['fatigue', 'Fatigue', 'épuisé', 'frais'],
  ['courbatures', 'Courbatures', 'très courbaturé', 'aucune'],
  ['stress', 'Stress', 'très stressé', 'détendu'],
  ['humeur', 'Humeur', 'très basse', 'excellente']
];
export function score(e) {
  if (!e || !e.well) return null;
  let t = 0;
  for (const [k] of WELL) { const v = e.well[k]; if (typeof v !== 'number') return null; t += v; }
  return t;
}
export const DEFAULT_BANDS = [
  [20, 'En forme', 'good', 'Séance telle que prévue. Bon jour pour un effort intense ou un test.'],
  [15, 'Correct', 'ok', 'Séance telle que prévue.'],
  [11, 'Fatigué', 'warn', 'Garde la séance mais allège : environ un tiers de volume en moins, pas de nouveau record ni de palier de charge.'],
  [0, 'Très fatigué', 'crit', 'Version décharge : moitié du volume, rien au maximum, ou repos actif. Si ça dure plus de 2 jours, parles-en.']
];
export function verdict(t) {
  const b = DEFAULT_BANDS.find(x => t >= x[0]) || DEFAULT_BANDS[DEFAULT_BANDS.length - 1];
  return { lbl: b[1], cls: b[2], txt: b[3], min: b[0] };
}

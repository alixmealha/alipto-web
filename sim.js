// Simulations du site : forme du matin (accueil, L'appli), test au Tindeq (accueil, labo), vitesse de barre et titre du labo,
// liaison et machine à sous des sources (méthode), fond de L'appli. La logique vient de l'appli : site/lib/ est copié
// depuis src/lib par site-src/build.py. Mouvement réduit : chaque simulation s'affiche directement dans son état final.
import { WELL, score, verdict } from '/lib/forme.js';
import { rfdTest } from '/lib/force.js';
import { lossOf, lossNote } from '/lib/vbt.js';

const gsap = window.gsap, ST = window.ScrollTrigger;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 900px)').matches;
const anim = !!gsap && !reduce;
if (gsap) gsap.registerPlugin(...[ST, window.SplitText, window.DrawSVGPlugin].filter(Boolean));
const fr = (x, d = 0) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const enVue = (el, f, threshold = 0.35) => new IntersectionObserver(es => es.forEach(e => f(e.isIntersecting)), { threshold }).observe(el);

// ---------------------------------------------------------------- forme du matin
// Le feu suit la même règle que la Lecture du jour de l'appli (src/lib/insights.js) : palier « good » ou « ok » = vert
const FEU = { good: 'Feu vert : séance telle que prévue', ok: 'Feu vert : séance telle que prévue', warn: 'Feu orange : séance allégée ou adaptée', crit: 'Feu rouge : version décharge ou repos actif' };
const COUL = { good: 'var(--good)', ok: 'var(--good)', warn: 'var(--warn)', crit: 'var(--crit)' };   // Palette.level() de l'appli iOS

function forme(ph) {
  const sc = ph.querySelector('.ap-sc'), of = ph.querySelector('.ap-of'), arc = ph.querySelector('.arc');
  const v = ph.querySelector('.ap-v'), vt = v.querySelector('span'), why = ph.querySelector('.ap-why');
  let shown = 0, tw = null;
  const ring = (t, cls) => {
    const draw = x => { sc.textContent = t == null ? '?' : Math.round(x); arc.style.strokeDashoffset = 100 - x / 25 * 100; };
    ph.style.setProperty('--vc', t == null ? 'var(--rule)' : COUL[cls]);
    of.textContent = t == null ? 'forme' : '/25';
    if (tw) tw.kill();
    if (!anim || t == null) { draw(t || 0); shown = t || 0; return; }
    const o = { x: shown };   // compteur et anneau : 1,4 s en décélération (MOTION.md)
    tw = gsap.to(o, { x: t, duration: 1.4, ease: 'power3.out', onUpdate: () => draw(o.x) });
    shown = t;
  };
  const render = () => {
    const well = {};
    WELL.forEach(([k]) => { const i = ph.querySelector(`.ap-q[data-k="${k}"] input:checked`); if (i) well[k] = +i.value; });
    const n = Object.keys(well).length, t = score({ well });
    if (t == null) {
      ring(null); v.dataset.cls = ''; why.textContent = '';
      vt.textContent = n ? `Encore ${5 - n} question${5 - n > 1 ? 's' : ''}` : 'Remplis ta forme du matin : la séance s’ajuste';
      return;
    }
    const r = verdict(t);
    ring(t, r.cls); v.dataset.cls = r.cls; vt.textContent = FEU[r.cls]; why.textContent = r.lbl + ' · ' + r.txt;
  };
  ph.addEventListener('change', render);
  render();
  return render;
}

// Accueil : la forme du jour de la démo est presque remplie ; un point de toucher répond à la dernière question, puis une
// note pulse et une bulle invite à toucher, jusqu'au premier toucher du visiteur.
const DEMO_WELL = { sommeil: 4, fatigue: 4, courbatures: 3, stress: 4, humeur: 4 };   // DemoData.swift : 19 sur 25
function invite(ph) {
  const render = forme(ph), tap = ph.querySelector('.ap-tap'), scr = ph.querySelector('.screen');
  const tip = ph.parentElement.querySelector('.hv-tip');
  const note = (k, v) => ph.querySelector(`.ap-q[data-k="${k}"] input[value="${v}"]`);
  const pulse = note('sommeil', 5).closest('label');   // 20 sur 25 : le verdict passe à « En forme »
  let tl = null;
  const stop = () => {
    if (tl) tl.kill();
    tap.classList.remove('on', 'press'); pulse.classList.remove('pulse');
    if (tip) tip.classList.add('off');
  };
  ph.addEventListener('pointerdown', stop, { once: true });
  ph.addEventListener('keydown', stop, { once: true });
  const fill = ks => { ks.forEach(k => { note(k, DEMO_WELL[k]).checked = true; }); render(); };
  if (!anim) { fill(Object.keys(DEMO_WELL)); return; }
  fill(['sommeil', 'fatigue', 'courbatures', 'stress']);
  const at = el => { const a = el.getBoundingClientRect(), b = scr.getBoundingClientRect(); return `translate(${a.left - b.left + a.width / 2}px, ${a.top - b.top + a.height / 2}px)`; };
  const cible = note('humeur', 4).closest('label');
  tl = gsap.timeline({ delay: 1.6 })
    .call(() => {   // le doigt entre par le bas de l'écran, puis se pose sur la note
      tap.style.transition = 'none';
      const b = scr.getBoundingClientRect();
      tap.style.transform = `translate(${b.width * 0.72}px, ${b.height * 0.86}px)`;
      tap.offsetWidth; tap.style.transition = '';
      tap.classList.add('on'); tap.style.transform = at(cible);
    })
    .call(() => tap.classList.add('press'), null, '+=0.8')
    .call(() => { tap.classList.remove('press'); note('humeur', 4).checked = true; render(); }, null, '+=0.15')
    .call(() => tap.classList.remove('on'), null, '+=0.6')
    .call(() => pulse.classList.add('pulse'), null, '+=1.2');
}

// Accueil : anneau autour du téléphone. La goutte du logo trace l'anneau en ambre ; au tour suivant elle ressort bleue de
// derrière le téléphone et repasse en bleu par-dessus, et ainsi de suite. Le changement de couleur a lieu en haut,
// derrière le téléphone (l'anneau est moins haut que lui).
function anneau(svg) {
  const u = svg.querySelector('.ch-u'), o = svg.querySelector('.ch-o'), g = svg.querySelector('.ch-g');
  const COL = ['var(--oil)', 'var(--accent)'];
  let tour = 0;
  const couleurs = () => {
    o.style.stroke = g.style.color = COL[tour % 2];
    u.style.stroke = COL[(tour + 1) % 2]; u.style.strokeDasharray = tour ? '100 0' : '0 100';
  };
  const goutte = deg => {   // l'arrondi de la goutte en avant, la pointe derrière (sens des aiguilles d'une montre)
    const a = deg * Math.PI / 180;
    g.setAttribute('transform', `translate(${(100 + 96 * Math.cos(a)).toFixed(2)} ${(100 + 96 * Math.sin(a)).toFixed(2)}) rotate(${deg.toFixed(1)})`);
  };
  couleurs();
  if (!anim) {   // mouvement réduit : la moitié de l'anneau en ambre, la goutte au bout, côté visible
    o.style.strokeDasharray = '50 100'; o.style.strokeDashoffset = '12.5'; goutte(45);
    return;
  }
  const st = { p: 0 };
  const tw = gsap.to(st, {
    p: 1, duration: 9, ease: 'none', repeat: -1, paused: true,
    onUpdate: () => { o.style.strokeDasharray = `${st.p * 100} 100`; goutte(-90 + 360 * st.p); },
    onRepeat: () => { tour++; couleurs(); }
  });
  goutte(-90);
  enVue(svg, x => (x ? tw.play() : tw.pause()), 0);
}

// Accueil, carte Labo : le test de force de contact se passe dans le téléphone (TindeqSheet) : 3, 2, 1, essai en direct,
// puis l'écran de résultat (le chiffre compte pendant que la courbe se dessine, comme dans l'appli)
function tindeq(ph) {
  const q = s => ph.querySelector(s);
  const vues = ['.tq-count', '.tq-run', '.tq-done'].map(q), vue = i => vues.forEach((x, j) => x.classList.toggle('on', j === i));
  const n = q('.tq-n'), mot = q('.tq-w'), sous = q('.tq-sub'), kg = q('.tq-kg b'), jauge = q('.tq-g i'), big = q('.tq-big b');
  const ligne = q('.tq-line'), aire = q('.tq-area'), m1 = q('.m1'), m2 = q('.m2');
  const on = RES.onset, X = t => 14 + (t - on) / 0.4 * 272, Y = f => 104 - f / 45 * 90;
  const pts = ESSAI.filter(([t]) => t >= on - 0.01 && t <= on + 0.4).map(([t, f]) => [X(t), Y(Math.max(0, f - 0.2))]);
  const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
  ligne.setAttribute('d', d);
  aire.setAttribute('d', d + `L${pts[pts.length - 1][0].toFixed(1)} 104L${pts[0][0].toFixed(1)} 104Z`);
  [[m1, on + 0.1, RES.rfd100 / 10], [m2, on + 0.2, RES.rfd200 / 5]].forEach(([m, t, f]) => {   // 12,2 kg à 100 ms, 26 kg à 200 ms
    const x = X(t), y = Y(f), l = m.querySelector('line'), c = m.querySelector('circle'), tx = m.querySelector('text');
    l.setAttribute('x1', x); l.setAttribute('x2', x); c.setAttribute('cx', x); c.setAttribute('cy', y);
    tx.setAttribute('x', x + 7); tx.setAttribute('y', y + 16);
  });
  const L = ligne.getTotalLength();
  const essai = i => {
    const [t, f] = ESSAI[i], go = t >= DEBUT;
    mot.textContent = go ? 'Tire !' : 'Relâche…'; mot.classList.toggle('go', go);
    sous.textContent = go ? 'Le plus vite et le plus fort possible' : 'Reste détendu, tire dès que « Tire ! » s’affiche.';
    kg.textContent = fr(Math.max(0, f), 1); jauge.style.transform = `scaleX(${Math.min(1, Math.max(0, f) / 80)})`;
  };
  const fin = () => { vue(2); big.textContent = RES.rfd200; ligne.style.strokeDasharray = 'none'; aire.style.opacity = 1; m1.classList.add('on'); m2.classList.add('on'); };
  if (!anim) { fin(); return; }
  const o = { i: 0 }, c = { v: 0 }, trace = { p: 0 };
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6 })
    .call(() => { vue(0); n.textContent = 3; }).call(() => { n.textContent = 2; }, null, 1).call(() => { n.textContent = 1; }, null, 2)
    .call(() => { o.i = 0; essai(0); vue(1); }, null, 3)
    .to(o, { i: ESSAI.length - 1, duration: FIN * 1.25, ease: 'none', onUpdate: () => essai(Math.round(o.i)) }, 3)
    .call(() => {
      vue(2); big.textContent = 0; c.v = 0; trace.p = 0;
      ligne.style.strokeDasharray = `0 ${L}`; aire.style.opacity = 0; m1.classList.remove('on'); m2.classList.remove('on');
    }, null, '+=0.8')
    .to(c, { v: RES.rfd200, duration: 1.4, ease: 'power3.out', onUpdate: () => { big.textContent = Math.round(c.v); } }, '<')
    .to(trace, { p: 1, duration: 1.2, ease: 'power2.inOut', onUpdate: () => {
      ligne.style.strokeDasharray = `${trace.p * L} ${L}`; aire.style.opacity = trace.p;
      m1.classList.toggle('on', trace.p > 0.25); m2.classList.toggle('on', trace.p > 0.5);
    } }, '<')
    .to({}, { duration: 4.5 });
  enVue(ph, x => (x ? tl.play() : tl.pause()), 0.3);
}

// L'appli : la scène du matin jouée au défilement (réponses, score, verdict, puis « moins de temps »), réversible
function scene(sec) {
  const ph = sec.querySelector('.sim-ph'), render = forme(ph), steps = [...sec.querySelectorAll('.mt-s')];
  const qs = [...ph.querySelectorAll('.ap-q')], tap = ph.querySelector('.ap-tap'), sheet = ph.querySelector('.ap-sheet'), scr = ph.querySelector('.screen');
  const col = sec.querySelector('.mt-col'), drop = col.querySelector('.mt-drop'), fill = col.querySelector('.mt-fill');
  let Y = [];   // centre de chaque repère (point de 12 px à 3 px du haut de l'étape)
  const repere = () => { Y = steps.map(s => s.offsetTop + 9); fill.style.top = Y[0] + 'px'; fill.style.height = (Y[2] - Y[0]) + 'px'; };
  const goutte = p => {   // les repères sont atteints quand leur étape s'affiche : 0, 25 % (cinq réponses), 60 % (moins de temps)
    const K = [0, 0.25, 0.6], i = p < K[1] ? 0 : 1, f = Math.min(1, Math.max(0, (p - K[i]) / (K[i + 1] - K[i])));
    const y = Y[i] + (Y[i + 1] - Y[i]) * f;
    drop.style.transform = `translateY(${y.toFixed(1)}px)`; fill.style.transform = `scaleY(${((y - Y[0]) / (Y[2] - Y[0])).toFixed(4)})`;
  };
  repere(); addEventListener('resize', repere);
  const REP = [3, 4, 4, 4, 4];   // 19 sur 25 : la forme du profil de démonstration (capture iOS « Aujourd’hui »)
  let last = -1;
  const at = p => {
    goutte(p);
    const n = Math.max(0, Math.min(5, Math.floor((p - 0.05) / 0.05) + 1));   // une réponse tous les 5 % du défilement
    if (n !== last) {
      qs.forEach((q, i) => q.querySelectorAll('input').forEach(inp => { inp.checked = i < n && +inp.value === REP[i]; }));
      last = n; render();
    }
    const k = n < 5 ? 0 : p < 0.6 ? 1 : 2;   // l'étape s'affiche au moment où son action se passe dans le téléphone
    steps.forEach((s, i) => { s.classList.toggle('on', i === k); s.classList.toggle('vu', i <= k); });
    sheet.classList.toggle('on', p >= 0.6);
    sheet.classList.toggle('ok', p >= 0.72);
    const cible = n >= 1 && n < 5 ? qs[n].querySelector(`input[value="${REP[n]}"]`) : p >= 0.6 && p < 0.72 ? sheet.querySelector('.ap-chips .on') : null;
    if (cible && tap) {   // le doigt se pose là où va l'action suivante
      const a = cible.closest('label, span').getBoundingClientRect(), b = scr.getBoundingClientRect();
      tap.style.transform = `translate(${a.left - b.left + a.width / 2}px, ${a.top - b.top + a.height / 2}px)`;
      tap.classList.add('on');
    } else if (tap) tap.classList.remove('on');
  };
  if (!anim || !ST) { at(1); steps.forEach(s => s.classList.add('vu')); return; }
  if (!mobile) {
    sec._st = ST.create({ trigger: sec.querySelector('.mt-grid'), start: 'top 12%', end: '+=240%', pin: true, scrub: 0.4, onUpdate: self => at(self.progress) });
    at(0);
  } else {   // téléphone : pas d'épinglage, la scène se joue d'elle-même quand le téléphone est à l'écran
    const o = { p: 0 };
    const tl = gsap.to(o, { p: 1, duration: 9, ease: 'none', paused: true, onUpdate: () => at(o.p) });
    at(0);
    enVue(ph, on => { if (on && !tl.isActive() && tl.progress() < 1) tl.play(); }, 0.6);
  }
}

// ---------------------------------------------------------------- L'appli : la journée
// Anneau-horloge du haut (24 h, minuit en haut) : la goutte tourne en boucle (un tour ≈ 12 s), ambre de 7 h à 21 h 30 en traçant le jour,
// bleue de 21 h 30 à 7 h en traçant la nuit ; à 7 h, l'anneau tracé s'efface en fondu pendant que le nouveau jour repart.
// Chaque heure mène à son moment de la journée
function horloge(nav) {
  const q = s => nav.querySelector(s), jour = q('.hg-a'), nuit = q('.hg-n'), g = q('.hg-g'), drop = q('.hg-g path'), halo = [...nav.querySelectorAll('#hg-halo stop')];
  const pts = [...nav.querySelectorAll('li[data-t]')], lune = q('li.nuit');
  const Lj = jour.getTotalLength(), Ln = nuit.getTotalLength(), T0 = 7, T1 = 21.5, R = 150, TOUR = 12;
  const AMB = [245, 176, 75], BLEU = [134, 162, 255];
  const teinte = k => 'rgb(' + AMB.map((c, i) => Math.round(c + (BLEU[i] - c) * k)).join(',') + ')';
  const lisse = x => (x = Math.max(0, Math.min(1, x)), x * x * (3 - 2 * x));
  // t : heure de 7 à 31 (31 = 7 h le lendemain)
  const pos = t => {
    const a = t * 15, rad = a * Math.PI / 180;
    g.setAttribute('transform', `translate(${(R * Math.sin(rad)).toFixed(2)} ${(-R * Math.cos(rad)).toFixed(2)}) rotate(${(a - 90).toFixed(1)})`);   // l'arrondi en avant
    jour.style.strokeDasharray = `${(Math.min(1, (t - T0) / (T1 - T0)) * Lj).toFixed(1)} ${Lj.toFixed(1)}`;
    nuit.style.strokeDasharray = `${(Math.max(0, (t - T1) / (31 - T1)) * Ln).toFixed(1)} ${Ln.toFixed(1)}`;
    // fondu ambre → bleu autour de 21 h 30, bleu → ambre juste avant 7 h
    const k = t < T1 ? lisse((t - (T1 - 0.4)) / 0.4) : 1 - lisse((t - (31 - 0.5)) / 0.5);
    const c = teinte(k); drop.style.fill = c; halo.forEach(st => st.setAttribute('stop-color', c));
    pts.forEach(li => li.classList.toggle('lit', t >= +li.dataset.t - 0.01));
    lune.classList.toggle('lit', t >= 26.25);
  };
  nav.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    const id = a.getAttribute('href'), cible = document.querySelector(id), m = document.querySelector('.matin'), st = m && m._st;
    if (!cible) return;
    e.preventDefault();
    const behavior = reduce ? 'auto' : 'smooth';
    if (st && (id === '#journee' || id === '#midi')) scrollTo({ top: st.start + (id === '#midi' ? 0.8 : 0.42) * (st.end - st.start), behavior });   // la scène épinglée : là où le moment se joue
    else cible.scrollIntoView({ block: id === '#journee' || id === '#midi' ? 'start' : 'center', behavior });
    history.replaceState(null, '', id);
  });
  if (!anim) return pos(31);   // mouvement réduit : jour et nuit tracés, goutte fixe à 7 h (31 h), ambre
  // l'ancien tour s'efface en fondu (copie des deux tracés) pendant que le nouveau jour se trace
  const tr = q('.hg-tr'), fant = tr.cloneNode(true); fant.classList.add('hg-old'); fant.style.opacity = 0; tr.before(fant);
  const o = { t: T0 };
  pos(T0);
  const tl = gsap.to(o, { t: 31, duration: TOUR, ease: 'none', repeat: -1, paused: true, onUpdate: () => pos(o.t),
    onRepeat: () => gsap.fromTo(fant, { opacity: 1 }, { opacity: 0, duration: 1.1, ease: 'power2.out' }) });
  gsap.delayedCall(0.5, () => enVue(nav, on => (on ? tl.play() : tl.pause()), 0.2));
}

// Le détail de chaque moment arrive quand il passe au centre de l'écran, et reste
function vus(steps) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('vu'); }), { rootMargin: '-30% 0px -30% 0px' });
  steps.forEach(s => (anim ? io.observe(s) : s.classList.add('vu')));
}

// 18 h 30 : le minuteur tourne en boucle (exos.timerView de l'appli pour un finger lift 7/3) : mise en place 10 s, « Tire » 7 s,
// « Relâche » 3 s, repos de série (la série 1 est faite, son tiret se remplit), puis « Tire » de la série 2
const TONS = { prep: ['#e8ebe6', '#22272b'], work: ['#86a2ff', '#1c2a5a'], rest: ['#b7c0c7', '#23292e'], setrest: ['#f5b04b', '#3a2a10'] };   // RingTimerView.tone()
const PHASES = [
  { d: 10, ton: 'prep', h: 'Série 1 / 4', w: 'Mise en place', i: 'Puis tire', l: 'Charge 42 kg', fait: 0, stop: true },
  { d: 7, ton: 'work', h: 'Série 1 / 4', w: 'Tire', i: 'Répétition 1 / 6', l: 'Charge 42 kg', fait: 0, tq: true },
  { d: 3, ton: 'rest', h: 'Série 1 / 4', w: 'Relâche', i: 'Répétition 1 / 6', l: 'Charge 42 kg', fait: 0 },
  { d: 4, ton: 'setrest', h: 'Série 1 / 4 faite', w: 'Repos', i: 'Série 2 ensuite', l: 'Charge 42 kg', fait: 1, stop: true, total: 120 },
  { d: 7, ton: 'work', h: 'Série 2 / 4', w: 'Tire', i: 'Répétition 1 / 6', l: 'Charge 42 kg', fait: 1, tq: true },
];
function chrono(ph) {
  const q = s => ph.querySelector(s), scr = q('.screen');
  const clock = q('.tm-clock'), stop = q('.tm-stop'), h = q('.tm-h'), w = q('.tm-w'), arc = q('.tm-arc'), n = q('.tm-n');
  const info = q('.tm-i'), load = q('.tm-l'), dash = [...ph.querySelectorAll('.tm-d i')], tq = q('.tm-tq'), courbe = q('.tm-curve path');
  const T = PHASES.reduce((a, p) => a + p.d, 0), DEPART = 24 * 60 + 37;   // chrono de séance : 24:37 au début de la boucle
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const force = e => Math.max(0, Math.min(1, e / 0.45)) * 42 + Math.sin(e * 9) * 0.8 + Math.sin(e * 23) * 0.5 - (e > 6.6 ? (e - 6.6) * 90 : 0);
  let tours = 0, cur = -1;
  const etat = t => {
    let k = 0, a = 0; while (t >= a + PHASES[k].d && k < PHASES.length - 1) { a += PHASES[k].d; k++; }
    const p = PHASES[k], e = t - a, left = p.total ? p.total - e : p.d - e;
    if (k !== cur) {
      cur = k;
      scr.style.setProperty('--tc', TONS[p.ton][0]); scr.style.setProperty('--tb', TONS[p.ton][1]);
      h.textContent = p.h; w.textContent = p.w; info.textContent = p.i; load.textContent = p.l;
      dash.forEach((d, i) => d.classList.toggle('on', i < p.fait));
      stop.classList.toggle('off', !p.stop); tq.classList.toggle('live', !!p.tq);
    }
    const s = Math.ceil(left - 1e-6);
    n.textContent = p.total ? mmss(s) : s; n.classList.toggle('mm', !!p.total);
    arc.style.strokeDasharray = `${(left / (p.total || p.d)) * 100} 100`;
    clock.textContent = mmss(DEPART + tours * T + t);
    if (p.tq) {   // la courbe de force de la levée se trace dans le bloc Tindeq (trait pointillé : tes 42 kg)
      const pts = []; for (let x = 0; x <= e; x += 0.08) pts.push([x / p.d * 200, 40 - Math.max(0, force(x)) / 50 * 36]);
      courbe.setAttribute('d', pts.length ? 'M' + pts.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join('L') : '');
    }
  };
  if (!anim) { etat(1.5); return; }
  const o = { t: 0 };
  const tw = gsap.to(o, { t: T, duration: T, ease: 'none', repeat: -1, paused: true, onUpdate: () => etat(o.t % T), onRepeat: () => { tours++; cur = -1; } });
  etat(0);
  enVue(ph, x => (x ? tw.play() : tw.pause()), 0.3);
}

// 20 h 15 : Hugo touche la ligne de Camille, la conversation s'ouvre, son dernier message arrive, puis la réponse de Hugo
// (l'appli n'affiche pas « … écrit » : le message arrive directement)
function coach(ph) {
  const q = s => ph.querySelector(s), scr = q('.screen'), tap = q('.ap-tap');
  const row = q('.co-row.cam'), last = row.querySelector('.co-last'), time = row.querySelector('.co-time'), rowN = row.querySelector('.co-n');
  const cardN = q('.co-ath .co-n'), tab = q('.ap-tabs .ap-badge');
  const neu = q('.co-new'), d2 = q('.co-d2'), reply = q('.co-reply');
  const debut = () => {
    scr.classList.remove('open'); row.classList.remove('lu', 'press');
    last.textContent = 'Merci coach, je te tiens au courant !'; time.textContent = '18:55';
    [rowN, cardN].forEach(b => b.classList.remove('off')); tab.textContent = '11';
    [neu, d2, reply].forEach(x => x.classList.add('hide'));
  };
  const fin = () => {
    scr.classList.add('open'); [rowN, cardN].forEach(b => b.classList.add('off')); tab.textContent = '9';
    [neu, d2, reply].forEach(x => x.classList.remove('hide'));
    row.classList.add('lu'); last.textContent = 'Toi : J’ai allégé ta séance de jeudi : moins de volume, repos complets. Feu vert pour la suite ?'; time.textContent = '20:15';
  };
  if (!anim) { fin(); return; }
  const at = el => { const a = el.getBoundingClientRect(), b = scr.getBoundingClientRect(); return `translate(${a.left - b.left + a.width * 0.4}px, ${a.top - b.top + a.height / 2}px)`; };
  const tl = gsap.timeline({ paused: true, repeat: -1 })
    .call(debut)
    .call(() => { tap.style.transition = 'none'; const b = scr.getBoundingClientRect(); tap.style.transform = `translate(${b.width * 0.6}px, ${b.height * 0.8}px)`; tap.offsetWidth; tap.style.transition = ''; }, null, 0.9)
    .call(() => { tap.classList.add('on'); tap.style.transform = at(row); }, null, 1.0)
    .call(() => { tap.classList.add('press'); row.classList.add('press'); }, null, 1.8)
    .call(() => { tap.classList.remove('press', 'on'); scr.classList.add('open'); [rowN, cardN].forEach(b => b.classList.add('off')); tab.textContent = '9'; }, null, 2.0)
    .call(() => neu.classList.remove('hide'), null, 2.7)
    .call(() => { d2.classList.remove('hide'); reply.classList.remove('hide'); }, null, 4.4)
    .call(() => { row.classList.remove('press'); row.classList.add('lu'); last.textContent = 'Toi : J’ai allégé ta séance de jeudi : moins de volume, repos complets. Feu vert pour la suite ?'; time.textContent = '20:15'; }, null, 8.4)
    .call(() => scr.classList.remove('open'), null, 8.6)
    .to({}, { duration: 1.6 }, 8.6);
  debut();
  enVue(ph, x => (x ? tl.play() : tl.pause()), 0.3);
}

// 21 h 30 : « Tes sports » se touche comme dans l'appli (ordre de choix, le premier est le sport principal) ; « Continuer »
// mène à l'étape 2/6 « Objectif » (objectifs du sport principal, comme GoalStep), puis l'écran revient seul à 1/6.
// Sans toucher pendant 4 s, le point de toucher fait la démonstration.
function sports(wrap) {
  const ph = wrap.querySelector('.sim-ph'), scr = ph.querySelector('.screen'), tap = ph.querySelector('.ap-tap');
  const chips = [...ph.querySelectorAll('.sp-c')], go = ph.querySelector('.sp-go'), main = ph.querySelector('.sp-main'), again = wrap.querySelector('.sp-again');
  const LBL = Object.fromEntries(chips.map(c => [c.dataset.id, c.textContent]));
  const v2 = ph.querySelector('.sp-2'), G = JSON.parse(v2.dataset.goals);
  const objectifs = () => {   // builderGoals : objectifs du premier sport choisi, dans l'ordre de SPORT_GOALS
    const sp = sel[0];
    v2.querySelector('.sp-en').textContent = sp ? 'en ' + G.l[sp].toLowerCase() : '';
    v2.querySelector('.sp-goals').innerHTML = (G.sg[sp] || []).map(id => `<p><b>${G.g[id][0]}</b><small>${G.g[id][1]}</small></p>`).join('');
  };
  let sel = [], retour = null, attente = null, demo = null, vu = false;
  const maj = () => {
    chips.forEach(c => { const i = sel.indexOf(c.dataset.id); c.setAttribute('aria-pressed', i >= 0); c.textContent = (i >= 0 ? (i + 1) + '. ' : '') + LBL[c.dataset.id]; });
    go.disabled = !sel.length;
    main.innerHTML = sel.length > 1 ? `Sport principal : <b>${LBL[sel[0]]}</b>. Pour changer l’ordre, décoche puis recoche le sport à passer en premier.` : '';
  };
  const reset = () => {
    clearTimeout(retour); sel = []; maj(); scr.classList.remove('next'); again.hidden = true;
    ph.querySelectorAll('.sp-v')[0].removeAttribute('inert'); ph.querySelectorAll('.sp-v')[1].setAttribute('inert', '');
    veille();
  };
  const suite = () => {
    objectifs(); scr.classList.add('next'); again.hidden = false;
    ph.querySelectorAll('.sp-v')[0].setAttribute('inert', ''); ph.querySelectorAll('.sp-v')[1].removeAttribute('inert');
    clearTimeout(attente); clearTimeout(retour); retour = setTimeout(reset, 5000);
  };
  const toggle = id => { sel = sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]; maj(); };
  const humain = () => { if (demo) { demo.kill(); demo = null; tap.classList.remove('on', 'press'); } veille(); };
  chips.forEach(c => c.addEventListener('click', () => toggle(c.dataset.id)));
  go.addEventListener('click', suite);
  again.addEventListener('click', reset);
  ph.addEventListener('pointerdown', e => { if (e.isTrusted) humain(); });
  ph.addEventListener('keydown', humain);
  const at = el => { const a = el.getBoundingClientRect(), b = scr.getBoundingClientRect(); return `translate(${a.left - b.left + a.width / 2}px, ${a.top - b.top + a.height / 2}px)`; };
  const touche = (el, f) => tl => tl
    .call(() => { tap.classList.add('on'); tap.style.transform = at(el); })
    .call(() => { tap.classList.add('press'); el.classList.add('press'); }, null, '+=0.75')
    .call(() => { tap.classList.remove('press'); el.classList.remove('press'); f(); }, null, '+=0.15');
  const lance = () => {
    if (!vu || scr.classList.contains('next') || sel.length) return;
    const b = scr.getBoundingClientRect();
    tap.style.transition = 'none'; tap.style.transform = `translate(${b.width * 0.7}px, ${b.height * 0.85}px)`; tap.offsetWidth; tap.style.transition = '';
    demo = gsap.timeline({ onComplete: () => { demo = null; } });
    touche(chips[0], () => toggle('escalade'))(demo);
    touche(chips[1], () => toggle('muscu'))(demo);
    demo.to({}, { duration: 0.5 });
    touche(go, () => { tap.classList.remove('on'); suite(); })(demo);
  };
  const veille = () => { clearTimeout(attente); if (anim) attente = setTimeout(lance, 4000); };
  maj(); ph.querySelectorAll('.sp-v')[1].setAttribute('inert', '');
  enVue(ph, x => { vu = x; if (x) { if (demo) demo.play(); else veille(); } else { clearTimeout(attente); if (demo) demo.pause(); } }, 0.5);
}

// ---------------------------------------------------------------- test au Tindeq
// Courbe d'un essai de montée en force à 80 mesures/s : elle passe par la mesure de démo de l'appli (12,5 kg à 100 ms,
// 26,3 kg à 200 ms, pic 41,6 kg) ; les chiffres affichés sont ceux que rfdTest() de l'appli calcule sur ces mesures.
const K = [[0, 0], [0.1, 12.5], [0.2, 26.3], [0.32, 35.2], [0.5, 40.2], [0.75, 41.4], [1.2, 41.0], [1.6, 40.4]];
function mono(P) {   // interpolation monotone (Fritsch-Carlson) : pas de bosse parasite entre deux points
  const n = P.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return x => {
    if (x <= P[0][0]) return P[0][1];
    if (x >= P[n - 1][0]) return P[n - 1][1];
    let i = 0; while (P[i + 1][0] < x) i++;
    const h = P[i + 1][0] - P[i][0], t = (x - P[i][0]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * P[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * P[i + 1][1] + (t3 - t2) * h * m[i + 1];
  };
}
const HZ = 80, REPOS = 0.8, DEBUT = REPOS + 0.004, FIN = REPOS + 1.6;
const ESSAI = (() => {
  const f = mono(K); let s = 7;
  const bruit = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 0.12;   // bruit du capteur, toujours le même tirage
  const out = [];
  for (let t = 0; t <= FIN; t += 1 / HZ) { const x = t - DEBUT; out.push([+t.toFixed(4), +(0.2 + (x > 0 ? f(x) : 0) + bruit()).toFixed(2)]); }
  return out;
})();
const RES = rfdTest(ESSAI);   // { rfd100: 122, rfd200: 130, peak: 41.6, pct200: 63, onset: 0.801 }

function force(box) {
  const path = box.querySelector('.fs-path'), dot = box.querySelector('.fs-dot'), live = box.querySelector('.fs-live b');
  const v100 = box.querySelector('.v100'), v200 = box.querySelector('.v200'), vpk = box.querySelector('.vpk'), win = box.querySelector('.fs-win');
  const m100 = box.querySelector('.m100'), m200 = box.querySelector('.m200');
  const on = RES.onset, ipk = ESSAI.reduce((b, s, i) => (s[1] > ESSAI[b][1] ? i : b), 0);
  // fenêtre de temps affichée : l'essai entier, ou (zoom) les 200 premières millisecondes de l'effort et un peu d'avant
  const vue = { z: 0 }, LO = on - 0.06, HI = on + 0.32;
  const X = t => { const lo = LO * vue.z, hi = FIN + (HI - FIN) * vue.z; return 28 + (t - lo) / (hi - lo) * 284; };
  const Y = kg => 150 - kg / 45 * 138;
  box.querySelector('.fs-res b').textContent = RES.rfd200 + ' kg/s';
  let n = 0;   // dernière mesure affichée
  const dessin = () => {
    path.setAttribute('d', 'M' + ESSAI.slice(0, n + 1).map(([t, kg]) => X(t).toFixed(1) + ' ' + Y(kg).toFixed(1)).join('L'));
    dot.setAttribute('cx', X(ESSAI[n][0])); dot.setAttribute('cy', Y(ESSAI[n][1]));
    m100.setAttribute('transform', `translate(${X(on + 0.1)} 0)`); m200.setAttribute('transform', `translate(${X(on + 0.2)} 0)`);
    const t = ESSAI[n][0];
    win.setAttribute('x', X(on)); win.setAttribute('width', t > on ? X(Math.min(t, on + 0.2)) - X(on) : 0);
  };
  const etat = i => {
    n = i; const t = ESSAI[i][0];
    live.textContent = fr(Math.max(0, ESSAI[i][1]), 1);
    box.classList.toggle('s100', t >= on + 0.1); box.classList.toggle('s200', t >= on + 0.2);
    v100.textContent = t >= on + 0.1 ? RES.rfd100 : '–';
    v200.textContent = t >= on + 0.2 ? RES.rfd200 : '–';
    vpk.textContent = i >= ipk + 8 ? fr(RES.peak, 1) : '–';
    dessin();
  };
  if (!anim) { etat(ESSAI.length - 1); box.classList.add('done'); return; }
  const o = { i: 0 };
  const tl = gsap.timeline({ paused: true })
    .call(() => { box.classList.remove('done', 'zoom'); vue.z = 0; })
    .to(o, { i: ESSAI.length - 1, duration: FIN * 1.25, ease: 'none', onUpdate: () => etat(Math.round(o.i)) })   // un peu plus lent que le réel, pour lire
    .call(() => box.classList.add('done'));
  if (box.classList.contains('lab')) {   // la caméra s'approche du début de l'effort, puis revient sur l'essai entier
    tl.call(() => box.classList.add('zoom'), null, '+=0.6')
      .to(vue, { z: 1, duration: 0.9, ease: 'power3.inOut', onUpdate: dessin }, '<')
      .call(() => box.classList.remove('zoom'), null, '+=2.4')
      .to(vue, { z: 0, duration: 0.6, ease: 'power3.inOut', onUpdate: dessin }, '<');
  }
  tl.to({}, { duration: 2.5 });
  etat(0);
  let vu = false;
  tl.eventCallback('onComplete', () => { if (vu) tl.restart(); });
  enVue(box, x => { vu = x; if (x && !tl.isActive()) tl.restart(); });
}

// ---------------------------------------------------------------- vitesse de barre (labo)
function vbt(box) {
  const vs = box.dataset.v.split(',').map(Number), lim = +box.dataset.limit;
  const bars = [...box.querySelectorAll('.bars i')], barre = box.querySelector('.vs-bar'), rep = box.querySelector('.vs-rep');
  const perte = box.querySelector('.vs-loss'), note = box.querySelector('.vs-note'), loss = box.querySelector('.loss');
  const etat = n => {   // n répétitions faites : perte et message calculés par lossOf() et lossNote() de l'appli
    bars.forEach((b, i) => { b.classList.toggle('on', i < n); });
    const l = lossOf(vs.slice(0, n)), m = lossNote(n > 1 ? l.loss : null, lim);
    perte.textContent = n > 1 ? '−' + l.loss + ' %' : '0 %';
    note.textContent = m ? m.l : 'Première répétition : la référence de la série.';
    const over = m && m.k === 'over';
    loss.classList.toggle('over', !!over);
    bars.forEach((b, i) => b.classList.toggle('lim', over && i === n - 1));
    rep.textContent = over ? 'Série arrêtée' : 'Rép. ' + Math.max(1, n);
    return over;
  };
  if (!anim) { etat(vs.length); return; }
  box.classList.add('play');
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 2.6 });
  tl.call(() => etat(0));
  vs.forEach((v, i) => {
    const monte = 0.32 / v;   // plus la barre est lente, plus la montée dure
    tl.fromTo(barre, { y: 0 }, { y: -64, duration: monte, ease: 'power2.inOut' })
      .call(() => etat(i + 1))
      .fromTo(bars[i], { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: 'power3.out' }, '<')
      .to(barre, { y: 0, duration: 0.55, ease: 'power2.inOut' }, '+=0.15');
  });
  enVue(box, x => (x ? tl.play() : tl.pause()));
}

// ---------------------------------------------------------------- labo : le titre de la section vitesse arrive vite, une fois à l'écran
function vitesse(h2) {
  if (!anim || !window.SplitText) return;
  const split = window.SplitText.create(h2, { type: 'chars,words', aria: 'auto' });
  const lignes = [...h2.parentElement.querySelectorAll('.speed i')];
  gsap.set(split.chars, { opacity: 0 });
  let fait = false;
  enVue(h2, x => {
    if (!x || fait) return; fait = true;
    gsap.timeline({ onComplete: () => split.revert() })
      .fromTo(split.chars, { x: -70, skewX: -28, opacity: 0 }, { x: 0, skewX: 0, opacity: 1, duration: 0.42, stagger: 0.02, ease: 'power4.out' })
      .fromTo(lignes, { scaleX: 0, opacity: 0.9 }, { scaleX: 1, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' }, 0.05);
  }, 0.6);
}

// ---------------------------------------------------------------- méthode : la liaison entre les étapes se trace
function liaison(ol) {
  const wrap = ol.parentElement, svg = wrap.querySelector('.fl-link'), path = svg.querySelector('path'), lis = [...ol.querySelectorAll('li')];
  const trace = () => {   // une ligne qui passe par le haut de chaque étape (derrière les cartes, visible entre elles)
    const w = wrap.getBoundingClientRect();
    const pts = lis.map(li => { const r = li.getBoundingClientRect(); return [Math.round(r.left - w.left + r.width / 2), Math.round(r.top - w.top + 44)]; });
    path.setAttribute('d', 'M' + pts.map(p => p.join(' ')).join('L'));
    svg.setAttribute('viewBox', `0 0 ${Math.round(w.width)} ${Math.round(w.height)}`);
  };
  trace();
  addEventListener('resize', trace);
  if (!anim || !window.DrawSVGPlugin) { lis.forEach(li => li.classList.add('lit')); return; }
  gsap.fromTo(path, { drawSVG: '0%' }, {
    drawSVG: '100%', ease: 'none',
    scrollTrigger: { trigger: ol, start: 'top 75%', end: 'bottom 55%', scrub: 0.6, onUpdate: s => lis.forEach((li, i) => li.classList.toggle('lit', s.progress >= i / lis.length)) }
  });
}

// ---------------------------------------------------------------- méthode : machine à sous des sources
function slot(box) {
  const panel = box.closest('.src-panel');   // dans une pastille : les sources de la page ; sur la méthode : toutes
  const refs = [...(panel || document).querySelectorAll(panel ? '.src-cards li' : '.src-all li')].map(li => [li.querySelector('b').textContent, li.dataset.t]);
  const strips = [...box.querySelectorAll('.sl-strip')], go = box.querySelector('.sl-go');
  const live = document.createElement('p'); live.className = 'sr'; live.setAttribute('aria-live', 'polite'); box.appendChild(live);
  const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const item = ([s, t]) => `<li><b>${esc(s)}</b><span>${esc(t)}</span></li>`;
  const tirage = () => { const a = [...refs.keys()].sort(() => Math.random() - 0.5); return a.slice(0, 3).map(i => refs[i]); };
  const lance = () => {
    const fin = tirage();
    live.textContent = 'Références tirées : ' + fin.map(r => r.join(', ')).join(' ; ');
    strips.forEach((ul, i) => {
      const tours = anim ? 14 + i * 5 : 0;
      ul.innerHTML = Array.from({ length: tours }, () => item(refs[Math.floor(Math.random() * refs.length)])).join('') + item(fin[i]);
      if (!anim) return;
      const h = ul.firstElementChild.offsetHeight;
      gsap.fromTo(ul, { y: 0 }, { y: -tours * h, duration: 1.5 + i * 0.45, ease: 'power4.out' });   // les rouleaux s'arrêtent l'un après l'autre
    });
  };
  go.addEventListener('click', lance);
  let fait = false;
  enVue(box, x => { if (x && !fait) { fait = true; lance(); } }, 0.5);
}


// ---------------------------------------------------------------- « Les études derrière … » : la pastille ouvre le panneau des sources
function pastille(p) {
  const btn = p.querySelector('.src-pill'), panel = p.querySelector('.src-panel');
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', open); panel.hidden = !open;
  });
}

// ---------------------------------------------------------------- méthode : le logo se dessine une fois, à l'entrée du bloc
function logo(mark) {
  const drop = mark.querySelector('.sn-drop'), legs = mark.querySelectorAll('.sn-l1, .sn-l2');
  if (!anim || !window.DrawSVGPlugin) { mark.classList.add('drawn'); return; }
  gsap.set(legs, { drawSVG: '0%' }); gsap.set(drop, { y: -330, opacity: 0 });
  let fait = false;
  enVue(mark, x => {
    if (!x || fait) return; fait = true;
    gsap.timeline({ delay: 0.2 })
      .to(drop, { opacity: 1, duration: 0.15 })
      .to(drop, { y: 0, duration: 0.55, ease: 'power2.in' }, '<')
      .to(drop, { y: -22, duration: 0.16, ease: 'power2.out' })   // petit rebond à l'arrivée
      .to(drop, { y: 0, duration: 0.2, ease: 'power2.in' })
      .to(legs[0], { drawSVG: '100%', duration: 0.4, ease: 'power2.inOut' }, '+=0.05')   // jambe gauche, puis jambe droite (0,8 s)
      .to(legs[1], { drawSVG: '100%', duration: 0.4, ease: 'power2.inOut' })
      .call(() => mark.classList.add('drawn'));
  }, 0.5);
}

// ---------------------------------------------------------------- méthode : la gêne se trace ; au seuil de 4/10, le signal et les exercices du kiné
function reprise(box) {
  const ligne = box.querySelector('.rx-line'), k = +box.dataset.k;
  if (!anim) { box.classList.add('alerte'); return; }
  const L = ligne.getTotalLength(), o = { p: 0 };
  ligne.style.strokeDasharray = `0 ${L}`;
  let fait = false;
  enVue(box, x => {
    if (!x || fait) return; fait = true;
    gsap.to(o, { p: 1, duration: 2.6, ease: 'none', delay: 0.3, onUpdate: () => {
      ligne.style.strokeDasharray = `${o.p * L} ${L}`;
      if (o.p >= k) box.classList.add('alerte');
    } });
  }, 0.4);
}

// ---------------------------------------------------------------- appareils : des impulsions partent du logo le long de chaque ligne
function hub(box) {
  const svg = box.querySelector('.hl'), lines = [...svg.querySelectorAll('line:not(.soon)')];
  const nodes = [...box.querySelectorAll('.hn:not(.soon)')];
  nodes.forEach(n => { const c = n.querySelector('.hi'); if (c) n.style.setProperty('--c', c.style.getPropertyValue('--c')); });
  if (!anim) return;
  const tls = lines.map((l, i) => {
    const x1 = +l.getAttribute('x1'), y1 = +l.getAttribute('y1'), x2 = +l.getAttribute('x2'), y2 = +l.getAttribute('y2');
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', 4); c.setAttribute('class', 'pulse'); svg.appendChild(c);
    const o = { p: 0 }, dur = 1.5 + (i % 3) * 0.25;
    const draw = () => { c.setAttribute('cx', x1 + (x2 - x1) * o.p); c.setAttribute('cy', y1 + (y2 - y1) * o.p); c.style.opacity = Math.min(1, o.p * 6, (1 - o.p) * 5); };
    return gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.6 + i * 0.37, delay: i * 0.55 })   // décalées : jamais deux lignes ensemble
      .fromTo(o, { p: 0 }, { p: 1, duration: dur, ease: 'power1.in', onUpdate: draw })
      .call(() => { nodes[i].classList.add('lit'); gsap.delayedCall(0.7, () => nodes[i].classList.remove('lit')); });
  });
  enVue(box, x => { box.classList.toggle('on', x); tls.forEach(t => (x ? t.play() : t.pause())); }, 0.2);
}

// ---------------------------------------------------------------- L'appli : vagues du haut de page, ou la vidéo quand elle existera
function fond(bg) {
  const video = bg.querySelector('.ah-video'), eco = navigator.connection && navigator.connection.saveData;
  if (video && video.dataset.src && !reduce && !eco) {
    video.src = video.dataset.src; bg.classList.add('has-video'); video.play().catch(() => {});
    return;
  }
  if (!anim) return;
  bg.querySelectorAll('.wv').forEach((p, i) => {   // chaque couche glisse d'une demi-largeur (un nombre entier de vagues) : boucle sans couture
    gsap.to(p, { x: -1440, duration: [70, 52, 96, 60][i], ease: 'none', repeat: -1 });
    gsap.to(p, { y: [10, -8, 12, -6][i], duration: 7 + i * 2, ease: 'sine.inOut', repeat: -1, yoyo: true });
  });
}

document.querySelectorAll('.sim-ph[data-mode="interactif"]').forEach(invite);
document.querySelectorAll('.hero-viz .chrono').forEach(anneau);
document.querySelectorAll('[data-sim="tindeq"]').forEach(tindeq);
document.querySelectorAll('.horloge').forEach(horloge);
vus([...document.querySelectorAll('.story .step')]);
document.querySelectorAll('[data-sim="chrono"]').forEach(chrono);
document.querySelectorAll('[data-sim="coach"]').forEach(coach);
document.querySelectorAll('.sp-wrap').forEach(sports);
document.querySelectorAll('.srcp').forEach(pastille);
document.querySelectorAll('.sn-mark').forEach(logo);
document.querySelectorAll('[data-sim="reprise"]').forEach(reprise);
document.querySelectorAll('.hub').forEach(hub);
document.querySelectorAll('.matin').forEach(scene);
document.querySelectorAll('[data-sim="force"]').forEach(force);
document.querySelectorAll('[data-sim="vbt"]').forEach(vbt);
document.querySelectorAll('.fl').forEach(liaison);
document.querySelectorAll('[data-sim="slot"]').forEach(slot);
document.querySelectorAll('.ah-bg').forEach(fond);
document.querySelectorAll('h2[data-vite]').forEach(vitesse);

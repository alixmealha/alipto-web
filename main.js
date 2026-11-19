// Ancienne appli installée sur l'écran d'accueil (adresse …/carnet/, redirigée vers le domaine) : on file directement vers l'appli
if (location.pathname === '/' && (window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches))) location.replace('/app/');
// Site vitrine d'Alipto : animations au défilement, téléphone qui suit les fonctions, compteurs, inscription (Supabase).
document.documentElement.classList.remove('no-js');
(function () {
  const SUPABASE_URL = 'https://remthpcuidagjaxxkohc.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbXRocGN1aWRhZ2pheHhrb2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTQ0MTQsImV4cCI6MjEwNzM3MDQxNH0.6PFQMpJVPpHQNVB3IiKKUXfBGMa-oX-3Di9J0rdXwvc';
  // L'appli web : « /app/ » sur le domaine, sinon le dossier parent (aperçu sur GitHub Pages : …/carnet/site/ → …/carnet/)
  const APP = /\/site\/?/.test(location.pathname) ? new URL('../', location.href).href : new URL('/app/', location.href).href;
  document.querySelectorAll('[data-app]').forEach(a => { a.href = APP; });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 900px)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  const hasSplit = hasGSAP && typeof window.SplitText !== 'undefined';

  if (!reduce && hasST) {
    const plugins = [window.ScrollTrigger];
    if (hasSplit) plugins.push(window.SplitText);
    window.gsap.registerPlugin(...plugins);
    window.ScrollTrigger.config({ ignoreMobileResize: true });
  }

  // en-tête de l'accueil et des pages : entrée en cascade (GSAP)
  const hero = document.querySelector('.hero, .ph-c');
  if (hero && !reduce && hasGSAP) {
    const items = [
      hero.querySelector('.eyebrow'),
      ...(hero.querySelector('h1 .w') ? hero.querySelectorAll('h1 .w') : hero.querySelectorAll('h1')),
      hero.querySelector('.sub'),
      hero.querySelector('.lead'),
      hero.querySelector('.ctas'),
      hero.querySelector('.aud'),
      hero.querySelector('.hero-cta'),
      hero.querySelector('.who'),
      hero.querySelector('.proof')
    ].filter(el => el && !el.closest('.show')); // le panneau de démo entre d'un bloc, après le texte
    const demo = hero.querySelector('.demo, .show');

    const tl = window.gsap.timeline({
      defaults: { ease: 'power3.out', duration: 0.85, clearProps: 'transform,opacity,transition' }
    });
    if (items.length) {
      window.gsap.set(items, { transition: 'none' });
      tl.from(items, {
        y: (i, el) => (el.classList.contains('w') ? 36 : 26),
        opacity: 0,
        stagger: 0.1
      });
    }
    if (demo) {
      tl.from(demo, {
        y: 32,
        opacity: 0,
        duration: 0.95
      }, items.length ? '-=0.75' : 0);
    }
  }

  // dérive lente des vagues du haut de page (accueil, pages, tarifs, inscription)
  const waves = document.querySelector('.bgfx .waves');
  if (waves && !reduce && hasGSAP) {
    window.gsap.to(waves, {
      xPercent: mobile ? 1.5 : 2.5,
      yPercent: mobile ? -1.2 : -2,
      scale: mobile ? 1.02 : 1.04,
      duration: 24,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });
  }

  // en-tête opaque après le haut de page
  const top = document.getElementById('top');
  let lastScroll = 0;
  const onScroll = () => { top.classList.toggle('solid', scrollY > 30); lastScroll = performance.now(); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // menu sur téléphone
  const burger = document.querySelector('.burger');
  if (burger) {
    const set = on => {
      document.body.classList.toggle('menu-open', on); burger.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) { const a = document.querySelector('#menu a'); if (a) a.focus(); }
    };
    burger.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
    document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  }

  // Sans / Avec Alipto : bascule au clic ; jouée une fois à l'arrivée tant qu'on n'a pas cliqué
  const sa = document.querySelector('.sa');
  if (sa) {
    const btns = sa.querySelectorAll('.sa-tg button'), lists = { sans: sa.querySelector('.sa-pts-s'), avec: sa.querySelector('.sa-pts-a') };
    let touched = false;
    const etat = v => {
      sa.dataset.etat = v;
      btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false'));
      for (const k in lists) lists[k].hidden = k !== v;
    };
    btns.forEach(b => b.addEventListener('click', () => { touched = true; etat(b.dataset.v); }));
    etat('sans'); // sans JavaScript, les deux listes restent lisibles
    document.addEventListener('demo:pane', e => {
      if (e.detail !== 2 || touched || reduce) return;
      etat('sans'); setTimeout(() => { if (!touched) etat('avec'); }, 1100);
    });
    if (!reduce) {
      const aio = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { aio.disconnect(); setTimeout(() => { if (!touched) etat('avec'); }, 1100); }
      }), { threshold: 0.6 });
      aio.observe(sa.querySelector('.sa-viz'));
    }
  }

  // Assistant de programme : onglets (flèches du clavier), lecture automatique tant qu'on n'a pas choisi une étape,
  // en pause au survol ou au focus, arrêtée hors de l'écran ; aucune lecture automatique en mouvement réduit
  const asst = document.querySelector('.asst');
  if (asst) {
    const tabs = [...asst.querySelectorAll('[role=tab]')], panes = [...asst.querySelectorAll('.as-pane')];
    const sheet = asst.querySelector('.as-sheet'), k = asst.querySelector('.as-k');
    const DUR = [3200, 3400, 3800, 3800, 3400, 6500];
    let cur = 0, timer = null, manual = false, visible = false, hold = false, paused = false, t0 = 0, left = DUR[0];
    const paneOn = () => { const p = asst.closest('.sh-pane'); return !p || p.classList.contains('on'); }; // volet visible du panneau de démo
    const show = i => {
      cur = i;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; });
      panes.forEach((p, j) => { p.inert = j !== i; p.classList.remove('on'); if (j === i) { void p.offsetWidth; p.classList.add('on'); } }); // relance les animations de l'étape
      sheet.dataset.pas = i; sheet.setAttribute('aria-labelledby', tabs[i].id); k.textContent = i + 1;
      asst.style.setProperty('--t', DUR[i] + 'ms');
      const bar = tabs[i].querySelector('.as-bar'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; // la barre repart de zéro
      const ol = tabs[i].closest('ol'); // téléphone : la rangée d'étapes défile pour garder l'étape lue visible
      if (ol.scrollWidth > ol.clientWidth) ol.scrollTo({ left: tabs[i].parentElement.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' });
    };
    const stop = () => { clearTimeout(timer); timer = null; };
    const run = ms => { stop(); t0 = performance.now(); left = ms; timer = setTimeout(() => { show((cur + 1) % tabs.length); run(DUR[cur]); }, ms); };
    const sync = () => {
      const on = !manual && visible && paneOn() && !hold && !paused;
      asst.classList.toggle('auto', !manual && !reduce); asst.classList.toggle('paused', !on);
      if (on && !timer) run(left); else if (!on && timer) { stop(); left = Math.max(300, left - (performance.now() - t0)); }
    };
    const pick = (i, focus) => { manual = true; stop(); asst.classList.remove('auto'); show(i); if (focus) tabs[i].focus(); };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(i));
      t.addEventListener('keydown', e => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); pick((i + d + tabs.length) % tabs.length, true); }
        else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); pick(e.key === 'Home' ? 0 : tabs.length - 1, true); }
      });
    });
    show(0);
    document.addEventListener('demo:pause', e => { paused = e.detail; sync(); });
    document.addEventListener('demo:pane', () => { if (paneOn() && !manual) { stop(); show(0); left = DUR[0]; } sync(); });
    if (!reduce) {
      asst.addEventListener('pointerenter', () => { hold = true; sync(); });
      asst.addEventListener('pointerleave', () => { hold = false; sync(); });
      asst.addEventListener('focusin', () => { hold = true; sync(); });
      asst.addEventListener('focusout', () => { hold = false; sync(); });
      new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && !visible) { visible = true; show(cur); left = DUR[cur]; } else if (!e.isIntersecting) visible = false;
        sync();
      }), { threshold: 0.25 }).observe(asst.querySelector('.asst-viz')); // bas : sur téléphone la fiche est sous le texte
    }
  }

  // Panneau de démo du haut de l'accueil : volets en onglets, lecture automatique (pause au survol, au focus et par
  // le bouton), arrêtée hors de l'écran ou dès qu'on choisit un volet ; l'assistant et « Sans / Avec » rejouent quand leur volet
  // s'ouvre.
  document.querySelectorAll('.show').forEach(shw => {
    const btn = shw.querySelector('.sh-play');
    const tabs = [...shw.querySelectorAll('.sh-tabs [role=tab]')], panes = [...shw.querySelectorAll(':scope > .sh-body > .sh-pane')]; // pas les étapes de l'assistant, qui ont leurs propres onglets
    if (!tabs.length) return;
    let cur = 0, timer = null, manual = false, visible = false, hold = false, paused = false, t0 = 0, held = [];
    const togglePause = () => {
      paused = !paused; btn.setAttribute('aria-pressed', paused ? 'true' : 'false'); // libellé fixe « Mettre en pause » : l'état passe par aria-pressed
      document.dispatchEvent(new CustomEvent('demo:pause', { detail: paused }));
      document.documentElement.classList.toggle('demo-pause', paused);
      // les démos de sim.js tournent en GSAP : on arrête leurs boucles et longues animations, jamais les apparitions au défilement
      // (courtes, ou pilotées par ScrollTrigger), sinon la suite de la page resterait invisible
      if (!window.gsap) return;
      if (paused) {
        held = window.gsap.globalTimeline.getChildren(false, true, true)
          .filter(a => !a.paused() && !a.scrollTrigger && (a.repeat() === -1 || a.totalDuration() > 2));
        held.forEach(a => a.pause());
      } else { held.forEach(a => a.resume()); held = []; }
    };
    const pill = shw.querySelector('.sh-pill');
    const DUR = (shw.dataset.dur || '').split(',').map(Number).filter(Boolean); // durée de chaque volet (build.py › tabs_panel)
    let left = DUR[0] || 9000;
    const dur = i => DUR[i] || 9000;
    const show = (i, quiet) => {
      cur = i;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; });
      panes.forEach((p, j) => { p.inert = j !== i; p.classList.remove('on'); if (j === i) { void p.offsetWidth; p.classList.add('on'); } });
      pill.style.transform = `translateX(${i * 100}%)`;
      shw.style.setProperty('--t', dur(i) + 'ms');
      const bar = tabs[i].querySelector('.sh-bar'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
      if (!quiet) document.dispatchEvent(new CustomEvent('demo:pane', { detail: i }));
    };
    const stop = () => { clearTimeout(timer); timer = null; };
    const run = ms => { stop(); t0 = performance.now(); left = ms; timer = setTimeout(() => { show((cur + 1) % tabs.length); run(dur(cur)); }, ms); };
    const sync = () => {
      const on = !manual && visible && !hold && !paused;
      shw.classList.toggle('auto', !manual && !reduce); shw.classList.toggle('paused', !on);
      if (on && !timer) run(left); else if (!on && timer) { stop(); left = Math.max(300, left - (performance.now() - t0)); }
    };
    // la personne prend la main (onglet, étape de l'assistant, « Avec Alipto », note du téléphone) : la lecture automatique
    // s'arrête, et une pause en cours est levée, sinon les animations d'entrée du volet choisi resteraient figées et invisibles
    const takeOver = () => { manual = true; stop(); shw.classList.remove('auto'); if (paused) togglePause(); };
    const pick = (i, focus) => { takeOver(); show(i); if (focus) tabs[i].focus(); };
    shw.querySelector('.sh-body').addEventListener('click', e => { if (e.target.closest('button, input, [role=button]')) { takeOver(); sync(); } }, true);
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(i));
      t.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); pick((i + d + tabs.length) % tabs.length, true); }
        else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); pick(e.key === 'Home' ? 0 : tabs.length - 1, true); }
      });
    });
    btn.addEventListener('click', () => { togglePause(); sync(); });
    // lien vers une partie rangée dans un volet (/#assistant) : on ouvre ce volet
    const fromHash = () => {
      const el = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      const j = el ? panes.findIndex(p => p.contains(el)) : -1;
      if (j >= 0) { pick(j); el.scrollIntoView({ block: 'start' }); return true; }
      return false;
    };
    if (!fromHash()) show(0, true);
    addEventListener('hashchange', fromHash);
    if (!reduce) {
      shw.addEventListener('pointerenter', () => { hold = true; sync(); }); // survol ou focus n'importe où dans le panneau : on regarde, la lecture attend
      shw.addEventListener('pointerleave', () => { hold = false; sync(); });
      shw.addEventListener('focusin', () => { hold = true; sync(); });
      shw.addEventListener('focusout', () => { hold = false; sync(); });
      new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; sync(); }), { threshold: 0.3 }).observe(shw);
    }
  });

  // compteur individuel (ease-out cubique sur 1,4 s, ou immédiat si mouvement réduit)
  const countUp = el => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const n = +el.dataset.count;
    if (reduce) { el.textContent = n; return; }
    const t0 = performance.now(), d = 1400;
    const tick = t => {
      const k = Math.min(1, (t - t0) / d);
      el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // sections sous le hero de l'accueil : apparitions au défilement (GSAP + ScrollTrigger + SplitText)
  if (!reduce && hasST) {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    // Titres h2 : découpe par mots avec masque et montée, puis restauration du DOM accessible
    if (hasSplit) {
      document.querySelectorAll('main h2:not([data-vite])').forEach(h2 => {
        h2.classList.remove('reveal');
        const split = window.SplitText.create(h2, {
          type: 'words',
          mask: 'words',
          wordsClass: 'split-word',
          aria: 'auto'
        });
        if (!split.words.length) return;
        gsap.set(split.words, { yPercent: 115 });
        gsap.to(split.words, {
          yPercent: 0,
          duration: mobile ? 0.55 : 0.72,
          stagger: mobile ? 0.04 : 0.055,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: h2,
            start: 'top 85%',
            once: true
          },
          onComplete: () => split.revert()
        });
      });
    }

    // Bandeau des sports (.marquee)
    const marquee = document.querySelector('.marquee');
    if (marquee) {
      marquee.classList.remove('reveal');
      gsap.set(marquee, { opacity: 0, y: mobile ? 14 : 22 });
      gsap.to(marquee, {
        opacity: 1,
        y: 0,
        duration: mobile ? 0.5 : 0.65,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: marquee,
          start: 'top 88%',
          once: true
        }
      });
    }

    // Cartes en cascade (l'effet « eau » du site actuel) sur toutes les grilles, avec profondeur sur .bx-phones
    const bxCards = gsap.utils.toArray('.explore .bx, .pc-grid .pc, .fl li, .sp-grid .sp, .devs .dv, .pl-grid .pl, .pr-grid .pr-card, .s3 li, .ti-grid .tier, .tv-l li, .nums .num');
    if (bxCards.length) {
      bxCards.forEach(card => {
        card.classList.remove('reveal');
        const ph = card.querySelector('.bx-phones');
        if (ph) gsap.set(ph, { opacity: 0, y: mobile ? 18 : 28 });
      });
      gsap.set(bxCards, {
        opacity: 0,
        y: mobile ? 24 : 40,
        scale: 0.97,
        transition: 'none'
      });
      ScrollTrigger.batch(bxCards, {
        start: 'top 85%',
        once: true,
        onEnter: batch => {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: mobile ? 0.6 : 0.78,
            stagger: mobile ? 0.08 : 0.12,
            ease: 'power3.out',
            overwrite: true,
            clearProps: 'transform,opacity,scale,transition'
          });
          batch.forEach((card, i) => {
            const ph = card.querySelector('.bx-phones');
            if (ph) {
              gsap.to(ph, {
                opacity: 1,
                y: 0,
                duration: mobile ? 0.68 : 0.9,
                delay: i * (mobile ? 0.08 : 0.12) + (mobile ? 0.06 : 0.1),
                ease: 'power3.out',
                clearProps: 'transform,opacity'
              });
            }
          });
        }
      });
    }

    // Étapes (.story / .steps) : apparition du contenu interne de chaque étape sans toucher l'opacité de .step ni le téléphone collant
    gsap.utils.toArray('.story .step, .steps .step').forEach(step => {
      step.classList.remove('reveal');
      const parts = step.querySelectorAll(':scope > .k, :scope > h3, :scope > p, :scope > .inline');
      if (!parts.length) return;
      gsap.set(parts, { opacity: 0, y: mobile ? 18 : 28 });
      gsap.to(parts, {
        opacity: 1,
        y: 0,
        duration: mobile ? 0.55 : 0.7,
        stagger: mobile ? 0.06 : 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: step,
          start: 'top 85%',
          once: true
        }
      });
    });

    // Inscription (.signup) : entrée douce du bloc et du formulaire
    const sCard = document.querySelector('.signup .s-card');
    if (sCard) {
      sCard.classList.remove('reveal');
      const sForm = sCard.querySelector('.form');
      const sItems = sCard.querySelectorAll('.s-txt .eyebrow, .s-txt .lead, .s-txt .ticks, .s-txt .tf-btn');
      gsap.set(sCard, { opacity: 0, y: mobile ? 22 : 36 });
      if (sItems.length) gsap.set(sItems, { opacity: 0, y: mobile ? 14 : 20 });
      if (sForm) gsap.set(sForm, { opacity: 0, y: mobile ? 16 : 24 });
      ScrollTrigger.create({
        trigger: sCard,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(sCard, {
            opacity: 1,
            y: 0,
            duration: mobile ? 0.6 : 0.8,
            ease: 'power3.out',
            clearProps: 'transform,opacity'
          });
          if (sItems.length) {
            gsap.to(sItems, {
              opacity: 1,
              y: 0,
              duration: mobile ? 0.55 : 0.7,
              stagger: mobile ? 0.05 : 0.07,
              delay: 0.08,
              ease: 'power3.out',
              clearProps: 'transform,opacity'
            });
          }
          if (sForm) {
            gsap.to(sForm, {
              opacity: 1,
              y: 0,
              duration: mobile ? 0.6 : 0.78,
              delay: mobile ? 0.1 : 0.14,
              ease: 'power3.out',
              clearProps: 'transform,opacity'
            });
          }
        }
      });
    }

    // Rafraîchissement des positions après chargement des polices et des images.
    // refresh() remet la page à sa position du moment : pendant un défilement (lien « Créer un compte », #journee…), il le couperait net, donc on attend la fin.
    const refresh = () => {
      if (!ScrollTrigger.isScrolling()) return ScrollTrigger.refresh();
      const fin = () => { ScrollTrigger.removeEventListener('scrollEnd', fin); ScrollTrigger.refresh(); };
      ScrollTrigger.addEventListener('scrollEnd', fin);
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refresh);
    }
    if (document.readyState === 'complete') {
      refresh();
    } else {
      addEventListener('load', refresh, { once: true });
    }
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      if (!img.complete) img.addEventListener('load', refresh, { once: true });
    });
  }

  // apparitions
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.18 });
  document.querySelectorAll('.reveal, .m-card').forEach(el => io.observe(el));

  // compteurs
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    countUp(e.target);
  }), { threshold: 0.6 });
  document.querySelectorAll('[data-count]:not([data-gsap])').forEach(el => {
    if (reduce) countUp(el);
    else cio.observe(el);
  });

  // zoom dans l'écran des téléphones : comme une caméra qui s'approche, la capture s'agrandit (×1,6 à ×2) et se déplace
  // dans l'écran pour cadrer une zone (site-src/zones.json, en % de la capture), le cadre du téléphone ne bouge pas.
  // Mouvement : transform 2D ; maintien : vraie largeur et position de l'image (rendu net, sans transform) ; repos : rien.
  const zoomOn = hasGSAP && !reduce;
  const hoverOK = !mobile && matchMedia('(hover: hover)').matches;
  const ZS = new WeakMap();
  const zs = ph => {
    let s = ZS.get(ph);
    if (!s) {
      s = { scr: ph.querySelector('.screen'), img: ph.querySelector('.scr'), veils: [...ph.querySelectorAll('.veil')], v: 0, mode: 'rest', cur: null, token: 0, want: -1, shownZ: -1, zones: JSON.parse(ph.dataset.zones) };
      ZS.set(ph, s);
    }
    return s;
  };
  // hauteur visible de l'écran : le téléphone des cartes de l'accueil est coupé en bas par un fondu de 22 px
  const visH = (ph, s) => {
    const H = s.scr.offsetHeight, cut = ph.closest('.cut');
    if (!cut) return H;
    const r = s.scr.getBoundingClientRect(), c = cut.getBoundingClientRect(), k = r.height / H || 1;
    return Math.max(60, Math.min(H, (c.bottom - r.top) / k - 22));
  };
  // cadrage : la zone remplit ~80 % de la largeur (×1,6 à ×2, ou z.z), moins si elle ne tiendrait pas ; centrée dans la partie
  // visible, ou calée en haut (z.ancre = 'haut') pour que le bord bas tombe dans un vide
  // z.f (build.py, cadrage.py) : zoom et coin haut gauche de la fenêtre visible, calculés au pixel pour ne couper aucun texte
  const frame = (z, W, H, vis) => {
    const fw = z.w / 100, fh = z.h / 100;
    let k = z.f ? z.f[0] : Math.max(1, Math.min(z.z || Math.min(Math.max(0.8 / fw, 1.6), 2), 0.96 / fw, 0.96 * vis / (fh * H)));
    const w = Math.round(W * k), h = Math.round(H * k);
    k = w / W;
    const x = Math.round(Math.min(0, Math.max(W - w, z.f ? -z.f[1] * w : W / 2 - (z.x / 100 + fw / 2) * w)));
    const y = Math.round(Math.min(0, Math.max(H - h, z.f ? -z.f[2] * h : z.ancre === 'haut' ? -(z.y / 100 - 0.012) * h : vis / 2 - (z.y / 100 + fh / 2) * h)));
    return { k, w, h, x, y, cx: x + (z.x / 100 + fw / 2) * w, cy: y + (z.y / 100 + fh / 2) * h, rx: fw * w * 0.98 + 16, ry: fh * h * 0.98 + 16 };
  };
  const hold = (s, f) => {
    window.gsap.set(s.img, { clearProps: 'transform' });
    Object.assign(s.img.style, { width: f.w + 'px', height: f.h + 'px', left: f.x + 'px', top: f.y + 'px' });
    s.mode = 'hold'; s.cur = f;
  };
  const rest = s => { window.gsap.set(s.img, { clearProps: 'transform,transformOrigin,width,height,left,top' }); s.mode = 'rest'; s.cur = null; };
  // repart de l'état affiché (repos, maintien ou mouvement interrompu) : image à sa taille de repos + transform équivalent
  const toMotion = s => {
    const g = window.gsap;
    let x = 0, y = 0, k = 1;
    if (s.mode === 'hold') ({ x, y, k } = s.cur);
    else if (s.mode === 'move') { g.killTweensOf(s.img); x = g.getProperty(s.img, 'x'); y = g.getProperty(s.img, 'y'); k = g.getProperty(s.img, 'scaleX'); }
    s.img.style.width = s.img.style.height = s.img.style.left = s.img.style.top = '';
    g.set(s.img, { x, y, scale: k, force3D: false });
    s.mode = 'move';
  };
  // voile : deux couches qui se relaient (zone suivante), seule l'opacité s'anime
  const veil = (s, f, d) => {
    const g = window.gsap, old = s.veils[s.v];
    g.to(old, { opacity: 0, duration: f ? d * 0.6 : d, ease: 'power2.out', overwrite: true });
    if (!f) return;
    s.v ^= 1;
    const v = s.veils[s.v];
    v.style.setProperty('--cx', f.cx + 'px'); v.style.setProperty('--cy', f.cy + 'px');
    v.style.setProperty('--rx', f.rx + 'px'); v.style.setProperty('--ry', f.ry + 'px');
    g.to(v, { opacity: 1, duration: d * 0.9, ease: 'power2.inOut', overwrite: true });
  };
  const move = (ph, z, d) => new Promise(res => {
    const s = zs(ph), W = s.scr.offsetWidth, H = s.scr.offsetHeight;
    if (!z && s.mode === 'rest') return res();
    const ease = !z ? 'power2.out' : s.mode === 'rest' ? 'expo.out' : 'power2.inOut';
    toMotion(s);
    const f = z ? frame(z, W, H, visH(ph, s)) : null;
    veil(s, f, d);
    window.gsap.to(s.img, {
      x: f ? f.x : 0, y: f ? f.y : 0, scale: f ? f.k : 1, duration: d, ease, force3D: false,
      onComplete: () => { if (f) hold(s, f); else rest(s); res(); }, onInterrupt: res
    });
  });
  const cancel = s => { s.token++; if (s.dc) s.dc.kill(); return s.token; };
  const wait = (s, t) => new Promise(res => { s.dc = window.gsap.delayedCall(t, res); });
  // toutes les zones l'une après l'autre ; garde la dernière (survol) ou revient à l'écran entier (lecture unique)
  const tour = async (ph, o) => {
    const s = zs(ph), t = cancel(s), n = Math.min(s.zones.length, o.max || Infinity);
    for (let i = 0; i < n; i++) {
      await move(ph, s.zones[i], o.in);
      if (s.token !== t) return;
      if (i < n - 1 || !o.keep) { await wait(s, o.hold); if (s.token !== t) return; }
    }
    if (!o.keep) move(ph, null, o.out);
  };
  const back = (ph, d) => { const s = zs(ph); cancel(s); s.want = s.shownZ = -1; return move(ph, null, d || 0.5); };
  // rythme (audit S-12, S-13) : maintien de 2 s et plus pour lire un chiffre et sa légende ; sur mobile, une seule zone par écran
  const ONCE = mobile ? { in: 0.7, hold: 2.0, out: 0.5, max: 1 } : { in: 0.8, hold: 2.2, out: 0.5 };
  const HOVER = { in: 0.8, hold: 2.2, keep: true };
  // lecture unique à l'arrivée ; si l'on fait défiler vite, elle attend le premier arrêt
  const playOnce = (ph, start) => window.ScrollTrigger.create({
    trigger: ph, start, once: true,
    onEnter: self => {
      if (Math.abs(self.getVelocity()) < 600) return tour(ph, ONCE);
      const f = () => { window.ScrollTrigger.removeEventListener('scrollEnd', f); tour(ph, ONCE); };
      window.ScrollTrigger.addEventListener('scrollEnd', f);
    }
  });
  // survol : 120 ms d'intention, ignoré pendant un défilement (audit S-14)
  const onHover = (el, ph) => {
    let tmr;
    const go = () => { clearTimeout(tmr); if (performance.now() - lastScroll < 200) return; tmr = setTimeout(() => tour(ph, HOVER), 120); };
    const out = () => { clearTimeout(tmr); back(ph); };
    el.addEventListener('pointerenter', go); el.addEventListener('focus', go);
    el.addEventListener('pointerleave', out); el.addEventListener('blur', out);
  };
  // pages sur ordinateur : la section est découpée en phases (écran entier, zone 1… zone n, écran entier)
  const phaseOf = (p, n) => (p < 0.1 || p > 0.9 ? -1 : Math.min(n - 1, Math.floor((p - 0.1) / (0.8 / n))));
  // la zone voulue est mise en file : la suivante ne part qu'après 1 s de maintien de la précédente (audit S-11)
  const goTo = async (ph, i) => {
    const s = zs(ph);
    s.want = i;
    if (s.busy || s.shownZ === i) return;
    s.busy = true;
    while (s.shownZ !== s.want) {
      const since = (performance.now() - (s.at || 0)) / 1000;
      if (s.shownZ >= 0 && since < 1) await new Promise(r => window.gsap.delayedCall(1 - since, r));
      const t = s.want;
      await move(ph, t < 0 ? null : s.zones[t], t < 0 ? 0.6 : 0.8);
      s.shownZ = t; s.at = performance.now();
    }
    s.busy = false;
  };

  const zPhones = zoomOn ? [...document.querySelectorAll('.phone[data-zones]')] : [];
  if (zPhones.length) {
    // largeur de fenêtre modifiée : les cadrages en px ne valent plus, retour à l'écran entier
    let lastW = innerWidth;
    addEventListener('resize', () => {
      if (innerWidth === lastW) return;
      lastW = innerWidth;
      zPhones.forEach(ph => { const s = zs(ph); cancel(s); window.gsap.killTweensOf(s.img); rest(s); s.want = s.shownZ = -1; s.veils.forEach(v => window.gsap.set(v, { opacity: 0 })); });
    });
  }
  if (zoomOn && hasST) {
    // accueil : survol ou focus clavier de la carte (maintien tant qu'on y reste) ; une seule fois à l'écran sur tactile
    document.querySelectorAll('.bx').forEach(card => {
      const ph = card.querySelector('.phone[data-zones]');
      if (!ph) return;
      if (hoverOK) onHover(card, ph); else playOnce(ph, 'center 70%');
    });
    // accueil, « Chaque matin » : les trois écrans se lisent l'un après l'autre à l'arrivée ; au survol, l'écran rejoue sa visite
    const trio = [...document.querySelectorAll('.trio .phone[data-zones]')];
    if (trio.length && !mobile) window.ScrollTrigger.create({
      trigger: '.trio', start: 'top 62%', once: true,
      onEnter: () => trio.forEach((ph, i) => window.gsap.delayedCall(i * 0.9, () => tour(ph, ONCE)))
    });
    // sur mobile, la rangée défile de côté : chaque écran se lit quand il est vraiment à l'écran
    if (trio.length && mobile) {
      const tio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { tio.unobserve(e.target); tour(e.target, ONCE); } }), { threshold: 0.75 });
      trio.forEach(ph => tio.observe(ph));
    }
    if (hoverOK) trio.forEach(ph => onHover(ph, ph));
    // en-têtes (accueil, /appli/) : une visite de l'écran du réveil, une fois l'entrée finie
    document.querySelectorAll('.ah-phone .phone[data-zones], .hero-phone .phone[data-zones]').forEach(ph => {
      window.gsap.delayedCall(1.4, () => tour(ph, ONCE));
      if (hoverOK) onHover(ph, ph);
    });
    // pages : sur mobile, une lecture par écran au défilement ; sur ordinateur, la visite suit le défilement
    document.querySelectorAll('.viz .phone[data-zones], .step .inline .phone[data-zones]').forEach(ph => {
      if (ph.closest('.trio, .ah-phone, .hero-phone')) return;
      if (mobile) { playOnce(ph, 'center 60%'); if (!ph.closest('a')) ph.addEventListener('click', () => tour(ph, ONCE)); return; }
      if (ph.closest('.step')) return;
      window.ScrollTrigger.create({
        trigger: ph, start: 'center 85%', end: 'center 15%',
        onUpdate: self => goTo(ph, phaseOf(self.progress, zs(ph).zones.length)),
        onLeave: () => goTo(ph, -1), onLeaveBack: () => goTo(ph, -1)
      });
    });
  }

  // téléphone collant : l'écran suit l'étape lue, puis zoome sur ses zones ; retour à l'écran entier avant de changer d'écran
  const steps = [...document.querySelectorAll('.step')], shots = [...document.querySelectorAll('.sticky .shot')], dots = [...document.querySelectorAll('.dots i')], sticky = document.querySelector('.sticky');
  const TINTS = { programme: '#86a2ff', saison: '#f5b04b', aujourdhui: '#58c482', seance: '#86a2ff', forme: '#58c482', coach: '#f5b04b' };
  const shotPhone = name => { const sh = shots.find(x => x.dataset.name === name); return sh && sh.querySelector('.phone[data-zones]'); };
  let wanted = steps[0] && steps[0].dataset.shot, shown = wanted;
  const show = async name => {
    wanted = name;
    if (name === shown) return;
    const prev = shotPhone(shown);
    if (zoomOn && prev && zs(prev).mode !== 'rest') { await back(prev); if (wanted !== name) return; }
    shown = name;
    shots.forEach(s => s.classList.toggle('on', s.dataset.name === name));
    const i = steps.findIndex(s => s.dataset.shot === name);
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    steps.forEach((s, j) => s.classList.toggle('on', j === i));
    if (sticky) sticky.style.setProperty('--tint', TINTS[name] || '#86a2ff');
  };
  const sio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) show(e.target.dataset.shot); }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => sio.observe(s));
  if (steps[0]) {
    steps[0].classList.add('on');
    if (sticky) sticky.style.setProperty('--tint', TINTS[steps[0].dataset.shot] || '#86a2ff');
  }
  if (zoomOn && hasST && !mobile && sticky) {
    steps.forEach(step => {
      const name = step.dataset.shot;
      const leave = () => { const ph = shotPhone(name); if (ph) goTo(ph, -1); };
      window.ScrollTrigger.create({
        trigger: step, start: 'top 50%', end: 'bottom 50%',
        onUpdate: self => { const ph = shotPhone(name); if (ph && shown === name) goTo(ph, phaseOf(self.progress, zs(ph).zones.length)); },
        onLeave: leave, onLeaveBack: leave
      });
    });
  }

  // méthode : quelques vrais titres de sources citées dans l'appli défilent un par un sous le compteur
  const tick = document.querySelector('.src-tick');
  if (tick && hasGSAP && !reduce) {
    const ul = tick.querySelector('ul'), lis = [...ul.children];
    const hgt = Math.max(...lis.map(li => li.offsetHeight));
    tick.style.setProperty('--li', hgt + 'px');
    tick.classList.add('run');
    lis.slice(0, 2).forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); ul.appendChild(c); });
    let i = 0;
    const next = () => window.gsap.delayedCall(3.2, () => {
      i++;
      window.gsap.to(ul, { y: -i * hgt, duration: 0.8, ease: 'power3.inOut', onComplete: () => { if (i === lis.length) { window.gsap.set(ul, { y: 0 }); return; } next(); } });
    });
    next();
  }

  const mq = document.querySelector('.marquee');
  if (mq) new IntersectionObserver(es => es.forEach(e => mq.classList.toggle('off', !e.isIntersecting))).observe(mq);

  // film des coachs : lu seulement quand il est à l'écran
  const vio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; if (!reduce) v.play().catch(() => {}); } else v.pause(); }), { threshold: 0.35 });
  document.querySelectorAll('video[data-lazyplay]').forEach(v => vio.observe(v));
  if (reduce) document.querySelectorAll('video[autoplay]').forEach(v => { v.removeAttribute('autoplay'); v.pause(); v.controls = true; });


  // inscription
  const form = document.getElementById('signup'); if (!form) return;
  const msg = form.querySelector('.msg'), btn = form.querySelector('button');
  const say = (t, k) => { msg.textContent = t; msg.className = 'msg ' + (k || ''); };
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const f = new FormData(form), name = String(f.get('name') || '').trim(), email = String(f.get('email') || '').trim().toLowerCase(), password = String(f.get('password') || '');
    if (!name) return say('Indique ton prénom.', 'err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say('Cette adresse e-mail ne semble pas valide.', 'err');
    if (password.length < 8) return say('Le mot de passe doit faire au moins 8 caractères.', 'err');
    if (!f.get('ok')) return say('Il faut accepter la politique de confidentialité.', 'err');
    btn.disabled = true; say('Création du compte…');
    try {
      const r = await fetch(SUPABASE_URL + '/auth/v1/signup?redirect_to=' + encodeURIComponent(APP), {
        method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, data: { name } })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const m = (j.msg || j.error_description || j.message || '') + ' ' + (j.error_code || j.code || '');
        if (/signup.*(disabled|not allowed)/i.test(m)) say('Les inscriptions ouvrent très bientôt. Repasse dans quelques jours, ou demande un accès à ton coach.', 'err');
        else if (/already|registered|exists/i.test(m)) say('Un compte existe déjà avec cette adresse : connecte-toi depuis l’appli.', 'err');
        else if (/password/i.test(m)) say('Mot de passe trop faible : mélange lettres, chiffres et signes.', 'err');
        else if (/rate|limit|many/i.test(m) || r.status === 429) say('Trop d’essais d’affilée : réessaie dans quelques minutes.', 'err');
        else say('L’inscription n’a pas marché (' + (m.trim() || r.status) + ').', 'err');
        btn.disabled = false; return;
      }
      // confirmation par e-mail activée : pas de session tout de suite
      if (j.access_token && j.refresh_token) {
        say('Compte créé ! Ouverture de l’appli…', 'ok');
        location.href = APP + '#access_token=' + encodeURIComponent(j.access_token) + '&refresh_token=' + encodeURIComponent(j.refresh_token) + '&expires_in=' + (j.expires_in || 3600) + '&token_type=bearer&type=signup';
        return;
      }
      if (j.identities && j.identities.length === 0) { say('Un compte existe déjà avec cette adresse : connecte-toi depuis l’appli.', 'err'); btn.disabled = false; return; }
      form.reset();
      say('Presque fini : ouvre l’e-mail envoyé à ' + email + ' et touche le lien pour activer ton compte. Il t’amène directement dans l’appli.', 'ok');
    } catch (e) {
      say('Pas de connexion internet ? Réessaie dans un instant.', 'err');
    }
    btn.disabled = false;
  });
})();

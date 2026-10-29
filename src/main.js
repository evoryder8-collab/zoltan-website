import '@fontsource-variable/bodoni-moda';
import '@fontsource-variable/manrope';
import 'lenis/dist/lenis.css';
import './styles/base.css';
import './styles/glass.css';
import './styles/shell.css';
import './styles/orbs.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/film.css';
import './styles/honours.css';
import './styles/gallery.css';
import './styles/maps.css';
import './styles/terms.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import hu from './i18n/hu.js';
import en from './i18n/en.js';
import { registerDictionaries, setLang, storedLang } from './i18n/index.js';
import { detectLang } from './lib/lang.js';
import { fillIcons } from './lib/icons.js';
import { drawLaurelSvg } from './lib/laurel.js';
import { markPlaceholders, initReveals } from './lib/dom.js';
import { initGlass } from './lib/glass.js';
import { initSilk } from './lib/silk.js';
import { sound } from './lib/audio.js';
import { whenNear } from './lib/lazy.js';
import { tilt, initTilt, buzz } from './lib/tilt.js';
import { mountRibbon } from './lib/ribbon.js';
import { mountAura } from './lib/aura.js';
import { LOCATIONS } from './config.js';

import { runIntro } from './components/intro.js';
import { playOpening } from './components/opening.js';
import { initNav } from './components/nav.js';
import { renderTicker, renderName, prepareHero, enterHero } from './components/hero.js';
import { renderSections, initTopics, initStudioSwitch } from './components/sections.js';
import { renderEvents, initChampionships } from './components/championships.js';
import { initGallery } from './components/gallery.js';
import { initFilm } from './components/film.js';
import { initHonours } from './components/honours.js';
import { initTerms } from './components/terms.js';
import { initDirections } from './components/directions.js';
import { initOrbs } from './components/orbs.js';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

// ── language first, so nothing renders in the wrong one ──
registerDictionaries({ hu, en });
setLang(detectLang({ search: location.search, stored: storedLang(), languages: navigator.languages }), { persist: false });

// ── static markup ──
document.querySelectorAll('svg.laurel-svg').forEach((svg) => drawLaurelSvg(svg));
document.querySelector('.training__laurel').classList.add('is-static');
renderName();
renderTicker();
renderSections();
renderEvents();
fillIcons();
markPlaceholders();

// ── shared systems ──
const ribbon = mountRibbon(document.querySelector('.ticker'), document.querySelector('.ticker__track'), '.ticker__set');
const silk = initSilk(document.getElementById('silk'), { reduced });
const glass = initGlass();
const reveals = initReveals({ reduced });

let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.15 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

const nav = initNav({ lenis });
initOrbs({ reduced });
initTopics({ sound });
initStudioSwitch();
initGallery({ reduced });
initFilm({ reduced, lenis });
initHonours({ reduced });
initTerms();
initChampionships({
  reduced,
  lenis,
  onFail: (frame) => frame.classList.add('is-fallback'),
});
initDirections(LOCATIONS);
whenNear(document.getElementById('studio-map'), () => {
  import('./components/studio-map.js')
    .then((m) => m.mountStudioMap(document.getElementById('studio-map'), { locations: LOCATIONS, reduced }))
    .catch((err) => {
      console.warn('[studio map] unavailable', err);
      const frame = document.querySelector('.studio');
      frame.classList.add('is-fallback');
      frame.querySelector('.studio__note span:last-child').textContent = document.documentElement.lang === 'hu' ? 'A térkép nem töltődött be.' : 'The map couldn’t load.';
    });
}, '2200px'); // early, so its tiles are warm before anyone reaches it

// ── the language can change at any time ──
const RENDERED = '#stats [data-reveal], #treatment-steps [data-reveal], #treatment-prices [data-reveal], #event-cards [data-reveal]';
addEventListener('langchange', () => {
  renderName();
  renderTicker();
  ribbon.refresh();
  renderSections();
  renderEvents();
  fillIcons();
  markPlaceholders();
  reveals.observe(document.querySelectorAll(RENDERED));
  glass.track();
});
reveals.observe(document.querySelectorAll(RENDERED));
glass.track();

// ── touch the silk; sounds for taps and hovers ──
const INTERACTIVE = 'a, button, input, label, [role="radio"], .medal, .gallery__viewport, .globe, .studio';
addEventListener('pointerdown', (e) => {
  silk.ripple(e.clientX, e.clientY);
  if (!e.target.closest(INTERACTIVE)) sound.ripple(e.clientX / innerWidth - 0.5);
}, { passive: true });
document.addEventListener('click', (e) => {
  if (e.target.closest('a, .topic, .filter, .langswitch button, .event__go')) sound.tap();
  if (e.target.closest('a, button')) buzz(6);
});

// ── phones: tilt is the pointer (laurel, medal and silk read it directly) ──
initTilt();
if (!reduced) {
  const follow = () => {
    requestAnimationFrame(follow);
    if (tilt.active) glass.light(tilt.x, tilt.y);
  };
  requestAnimationFrame(follow);
}

// ── scroll-driven hero: the portrait and laurel drift apart as you leave ──
if (!reduced) {
  const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 };
  gsap.to('.hero__stage', { yPercent: -10, scale: 1.06, ease: 'none', scrollTrigger: st });
  gsap.to('.hero__laurel', { rotate: 28, scale: 1.18, opacity: 0.35, ease: 'none', scrollTrigger: st });
  gsap.to('.hero__copy', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: st });
}
document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'mouse' && e.target.closest('a, button') && !e.relatedTarget?.closest?.('a, button')) sound.hover();
});
// pull the silk back a little behind dense sections
const dim = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) silk.setLevel(e.target.dataset.silk ? +e.target.dataset.silk : 1);
}, { rootMargin: '-50% 0px -50% 0px' });
document.querySelectorAll('.hero, .section').forEach((s) => {
  if (!s.classList.contains('hero')) s.dataset.silk = '0.7';
  dim.observe(s);
});

// ── the hero laurel: three.js loads while the intro plays ──
const laurelBox = document.querySelector('.hero__laurel');
const laurel = (async () => {
  if (root.classList.contains('no-webgl')) throw new Error('no webgl');
  const m = await import('./components/laurel3d.js');
  return m.mountLaurel(laurelBox, { reduced });
})().catch((err) => {
  console.warn('[laurel] using the SVG version', err);
  laurelBox.classList.add('is-fallback');
  return null;
});

// ── live silk behind the portrait ──
if (!root.classList.contains('no-webgl')) {
  try {
    mountAura(document.querySelector('.hero__aura canvas'), { reduced });
  } catch (err) {
    console.warn('[aura] skipped', err);
  }
}

prepareHero({ reduced });
runIntro({ reduced }).then(async ({ skipped }) => {
  const cinematic = !skipped && !reduced;
  const heroIn = async () => {
    root.classList.remove('is-locked');
    lenis?.start();
    // after the opening the name has flown in from the intro card
    enterHero({ reduced, skipName: cinematic });
    setTimeout(() => nav.show(), cinematic ? 1100 : 0);
    const l = await laurel;
    if (l) setTimeout(() => l.grow(), reduced ? 0 : cinematic ? 1200 : 350);
    else laurelBox.querySelector('.hero__laurel-fallback').classList.add(reduced ? 'is-static' : 'is-drawn');
  };
  if (cinematic) await playOpening({ silk, onHero: heroIn });
  else heroIn();
  // let the browser restore a #hash target after the intro
  if (location.hash.length > 1) document.getElementById(location.hash.slice(1))?.scrollIntoView();
});

if (import.meta.env.DEV) window.__zoltan = { lenis, silk, sound, gsap };

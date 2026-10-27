// The intro: a laurel draws itself, the visitor picks a language (and sound).
// The browser's language is suggested and enters on its own after a short
// countdown; any movement over the card pauses it. Shown once per session.
import { setLang, getLang, t } from '../i18n/index.js';
import { sound } from '../lib/audio.js';

const SEEN = 'zoltan.entered';
const WAIT = 7; // seconds before the suggested language enters by itself

export function runIntro({ reduced }) {
  const el = document.getElementById('intro');
  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN) === '1';
  } catch {}
  if (seen) {
    el.hidden = true;
    // sound needs a gesture: honour a saved "on" at the first tap
    if (sound.saved) addEventListener('pointerdown', () => sound.enable(true), { once: true });
    return Promise.resolve({ skipped: true });
  }

  return new Promise((resolve) => {
    const laurel = el.querySelector('.intro__laurel');
    const count = el.querySelector('.intro__count');
    const toggle = el.querySelector('#intro-sound');
    const buttons = [...el.querySelectorAll('.lang-btn')];
    const suggested = getLang();
    const suggestedBtn = buttons.find((b) => b.dataset.lang === suggested);
    suggestedBtn.classList.add('is-suggested');
    laurel.classList.add(reduced ? 'is-static' : 'is-drawn');
    toggle.checked = sound.saved;
    setTimeout(() => suggestedBtn.focus({ preventScroll: true }), 50);

    let left = WAIT;
    let paused = false;
    let done = false;
    let raf = 0;
    const started = performance.now() + 1400; // after the card has landed
    const tick = (now) => {
      if (done || paused) return;
      const p = Math.max(0, (now - started) / 1000);
      left = Math.max(0, WAIT - p);
      suggestedBtn.style.setProperty('--p', (p / WAIT).toFixed(3));
      count.textContent = now < started ? '' : t('intro.entering', { n: Math.ceil(left) });
      if (left <= 0) return enter(suggested, false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const pause = () => {
      if (paused || done) return;
      paused = true;
      cancelAnimationFrame(raf);
      suggestedBtn.style.setProperty('--p', 0);
      count.textContent = t('intro.paused');
    };
    el.querySelector('.intro__card').addEventListener('pointermove', pause);
    el.addEventListener('keydown', (e) => e.key !== 'Enter' && e.key !== ' ' && pause());
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('wheel', pause, { passive: true });

    // preview the copy in a language while hovering its button
    buttons.forEach((b) => {
      b.addEventListener('pointerenter', () => !done && b.dataset.lang !== getLang() && setLang(b.dataset.lang, { persist: false }));
      b.addEventListener('click', () => enter(b.dataset.lang, true));
    });
    el.querySelector('.intro__langs').addEventListener('pointerleave', () => !done && paused && setLang(suggested, { persist: false }));

    toggle.addEventListener('change', () => {
      sound.enable(toggle.checked);
      sound.tap();
      pause();
    });

    function enter(lang, byHand) {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      setLang(lang);
      if (byHand) {
        // a click is a gesture, so sound can start now
        sound.enable(toggle.checked);
        sound.tap();
      }
      try {
        sessionStorage.setItem(SEEN, '1');
      } catch {}
      el.classList.add('is-leaving');
      setTimeout(() => resolve({ skipped: false }), reduced ? 0 : 520);
      setTimeout(() => (el.hidden = true), reduced ? 0 : 1050);
    }
  });
}

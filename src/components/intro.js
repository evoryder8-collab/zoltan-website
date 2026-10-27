// The intro, in two steps:
//   1 · Sound on? A big "Yes (recommended)" and a quieter "No". The tap is the
//       gesture that lets audio start and iOS ask for motion access.
//   2 · Language. The device's primary language is suggested and picked after a
//       5-second countdown (after the Luma Wellness portal): touching a choice
//       or tabbing pauses it, hidden-tab time doesn't count, and expiry takes
//       the same path as a real tap.
// Nothing changes on hover: iOS swallows a tap whose hover changes the page.
// Shown once per session.
import { setLang, getLang, t } from '../i18n/index.js';
import { sound } from '../lib/audio.js';
import { requestTilt, buzz } from '../lib/tilt.js';

const SEEN = 'zoltan.entered';
const WAIT = 5000;

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
    const soundStep = el.querySelector('[data-step="sound"]');
    const langStep = el.querySelector('[data-step="lang"]');
    const buttons = [...el.querySelectorAll('.lang-btn')];
    const bar = el.querySelector('.countdown');
    const digit = bar.querySelector('.countdown__n');
    const arc = bar.querySelector('circle + circle');
    const label = bar.querySelector('.countdown__label');
    const toggle = bar.querySelector('.countdown__toggle');
    const suggested = getLang();
    const suggestedBtn = buttons.find((b) => b.dataset.lang === suggested);

    laurel.classList.add(reduced ? 'is-static' : 'is-drawn');
    setTimeout(() => el.querySelector('.btn-yes').focus({ preventScroll: true }), 60);

    // ── step 1: sound ──
    soundStep.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sound]');
      if (!b) return;
      const on = b.dataset.sound === 'on';
      sound.enable(on);
      if (on) sound.chime();
      buzz(12);
      requestTilt(); // iOS: must be asked inside this tap
      soundStep.classList.add('is-leaving');
      setTimeout(showLanguages, reduced ? 0 : 380);
    });

    // ── step 2: language ──
    let active = false;
    let paused = false;
    let done = false;
    let remaining = WAIT;
    let previous = 0;
    let frame = 0;

    const paintClock = () => {
      digit.textContent = String(Math.ceil(remaining / 1000));
      arc.style.strokeDashoffset = String(1 - remaining / WAIT);
      suggestedBtn.style.setProperty('--p', (1 - remaining / WAIT).toFixed(3));
    };
    const paint = () => {
      paintClock();
      label.textContent = t(paused ? 'intro.paused' : 'intro.countdown');
      toggle.textContent = t(paused ? 'intro.resume' : 'intro.pause');
      toggle.setAttribute('aria-pressed', paused);
      el.classList.toggle('countdown-paused', paused);
    };
    const tick = (now) => {
      if (!active) return;
      if (!paused && !document.hidden && previous) remaining = Math.max(0, remaining - (now - previous));
      previous = now;
      paintClock();
      if (remaining === 0) return enter(suggested);
      frame = requestAnimationFrame(tick);
    };
    const pause = () => {
      if (!active || paused) return;
      paused = true;
      paint();
    };

    function showLanguages() {
      soundStep.hidden = true;
      langStep.hidden = false;
      suggestedBtn.classList.add('is-suggested');
      suggestedBtn.focus({ preventScroll: true });
      bar.hidden = false;
      active = true;
      paint();
      frame = requestAnimationFrame(tick);
    }

    toggle.addEventListener('click', () => {
      paused = !paused;
      previous = 0;
      paint();
      sound.tap();
    });
    // a touch that starts just before expiry still wins, even if it lifts later
    buttons.forEach((b) => {
      b.addEventListener('pointerdown', pause);
      b.addEventListener('click', () => enter(b.dataset.lang));
    });
    // keyboard users get all the time they need
    el.addEventListener('keydown', (e) => (e.key === 'Tab' || e.key.startsWith('Arrow')) && pause());
    document.addEventListener('visibilitychange', () => (previous = 0));

    function enter(lang) {
      if (done) return;
      done = true;
      active = false;
      cancelAnimationFrame(frame);
      setLang(lang);
      sound.tap();
      buzz(10);
      try {
        sessionStorage.setItem(SEEN, '1');
      } catch {}
      el.classList.add('is-leaving');
      setTimeout(() => resolve({ skipped: false }), reduced ? 0 : 520);
      setTimeout(() => (el.hidden = true), reduced ? 0 : 1050);
    }
  });
}

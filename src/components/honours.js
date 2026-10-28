// Recognition: the judge's verdict plays while it's on screen. With the
// page's sound on it speaks by itself, from the top, once through, and then
// loops on quietly (its words are subtitled in the video); the button turns
// it off, or on when the page is quiet, and the soundtrack steps back while
// it speaks. Browsers only let a video speak unprompted after a tap has
// played it, so the visitor's taps on the page unlock it on the way down.
// Below it, the Bulgarian ticket celebrates each time it comes into view.
import { t } from '../i18n/index.js';
import { whenNear } from '../lib/lazy.js';
import { sound } from '../lib/audio.js';
import { buzz } from '../lib/tilt.js';
import { confetti } from '../lib/confetti.js';

const BASE = import.meta.env.BASE_URL;

export function initHonours({ reduced }) {
  const film = document.querySelector('.verdict__film');
  const video = film.querySelector('.verdict__video');
  const btn = film.querySelector('.verdict__sound');
  const label = btn.querySelector('.verdict__sound-label');

  const sync = () => {
    label.textContent = t(video.muted ? 'honours.soundOff' : 'honours.soundOn');
    btn.setAttribute('aria-pressed', !video.muted);
    btn.classList.toggle('is-muted', video.muted);
    sound.duck(!video.muted && !video.paused, 'verdict');
  };
  addEventListener('langchange', sync);

  whenNear(video, () => {
    video.src = `${BASE}media/verdict-720.mp4`;
    video.preload = 'auto';
  }, '800px');

  if (reduced) {
    video.controls = true;
    sync();
    return;
  }
  celebrateTicket();

  let inView = false;
  let chosen = null; // the visitor's own call on this button; until then the page's sound decides
  let unlocked = false; // it has spoken once, so the browser lets it again
  // saved too: after a refresh the page's sound only comes back at the first tap
  const wants = () => chosen ?? (sound.enabled || sound.saved);

  const quiet = () => {
    video.muted = true;
    video.loop = true;
    if (inView) video.play().catch(() => {});
    sync();
  };
  // from the top, out loud, once; without permission yet it stays quiet
  const speak = () => {
    if (!video.muted) {
      if (inView) video.play().catch(() => {});
      return;
    }
    const at = video.currentTime;
    video.currentTime = 0;
    video.muted = false;
    video.loop = false;
    video.play().then(
      () => {
        unlocked = true;
        sync();
      },
      () => {
        video.currentTime = at; // refused: the quiet loop carries on where it was
        quiet();
      },
    );
    sync();
  };
  video.addEventListener('ended', () => {
    video.currentTime = 0;
    quiet();
  });

  new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting;
      if (!inView) video.pause();
      else if (wants()) speak();
      else quiet();
    },
    { threshold: 0.45 },
  ).observe(video);
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);

  // the page's sound switched: the verdict follows it, the switch's tap
  // letting it speak at once if it's on screen
  addEventListener('soundchange', (e) => {
    chosen = null;
    if (!inView) return;
    if (e.detail.on) speak();
    else quiet();
  });

  // any tap or key on the way down unlocks it: a muted play and pause inside
  // the gesture, which nobody sees or hears (iOS lifts the restriction there).
  // On screen and kept quiet for want of one, a tap brings the voice in; a
  // swipe isn't a tap, and would only restart it silently. Once it has
  // spoken, none of this is needed.
  let x0 = 0;
  let y0 = 0;
  const unlock = (e) => {
    if (unlocked) return off();
    if (e.type === 'touchstart') {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      return;
    }
    if (film.contains(e.target)) return; // the button has its own say
    if (inView) {
      const p = e.changedTouches?.[0];
      const tap = !p || Math.hypot(p.clientX - x0, p.clientY - y0) < 12;
      if (tap && wants() && video.muted) speak();
      return;
    }
    video.muted = true;
    video.play()?.catch(() => {});
    video.pause();
  };
  const gestures = ['touchstart', 'touchend', 'click', 'keydown'];
  const off = () => gestures.forEach((g) => removeEventListener(g, unlock, true));
  gestures.forEach((g) => addEventListener(g, unlock, { capture: true, passive: true }));

  const toggle = () => {
    chosen = video.muted;
    if (chosen) speak();
    else quiet();
    buzz(8);
  };
  btn.addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  sync();
}

// The ticket gives a small shake and throws confetti once it's fully in view,
// after its card has settled; it does it again whenever the visitor leaves
// and comes back (a refresh included).
function celebrateTicket() {
  const ticket = document.querySelector('.ticket');
  const card = ticket.closest('[data-reveal]');
  let armed = true;
  let timer = 0;
  let last = -Infinity;
  const go = () => {
    // the card fades in on its own; let it land first
    if (!card.classList.contains('is-revealed')) {
      timer = setTimeout(go, 200);
      return;
    }
    armed = false;
    last = performance.now();
    ticket.classList.remove('is-won');
    void ticket.offsetWidth; // restart the shake
    ticket.classList.add('is-won');
    confetti(ticket, { count: innerWidth < 760 ? 48 : 70 });
    if (!sound.speaking.size) sound.sparkle();
  };
  ticket.addEventListener('animationend', (e) => e.animationName === 'ticket-won' && ticket.classList.remove('is-won'));
  new IntersectionObserver(
    ([e]) => {
      clearTimeout(timer);
      if (!e.isIntersecting) armed = true;
      // not again while scrolling back and forth across its edge
      else if (armed && e.intersectionRatio >= 0.9 && performance.now() - last > 4000) timer = setTimeout(go, 350);
    },
    { threshold: [0, 0.9] },
  ).observe(ticket);
}

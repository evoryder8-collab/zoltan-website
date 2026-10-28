// Recognition: the judge's verdict plays silently on a loop while it's on
// screen (its words are subtitled in the video); a tap turns the sound on and
// starts it from the top, and the ambient pad steps back while it speaks.
import { t } from '../i18n/index.js';
import { whenNear } from '../lib/lazy.js';
import { sound } from '../lib/audio.js';
import { buzz } from '../lib/tilt.js';

const BASE = import.meta.env.BASE_URL;

export function initHonours({ reduced }) {
  const video = document.querySelector('.verdict__video');
  const btn = document.querySelector('.verdict__sound');
  const label = btn.querySelector('.verdict__sound-label');

  const sync = () => {
    label.textContent = t(video.muted ? 'honours.soundOff' : 'honours.soundOn');
    btn.setAttribute('aria-pressed', !video.muted);
    btn.classList.toggle('is-muted', video.muted);
    sound.duck(!video.muted && !video.paused);
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

  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) video.play().catch(() => {});
      else video.pause();
    },
    { threshold: 0.45 },
  ).observe(video);
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);

  const toggle = () => {
    if (video.muted) {
      video.muted = false;
      video.currentTime = 0;
      video.play().catch(() => {});
    } else video.muted = true;
    sync();
    buzz(8);
  };
  btn.addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  sync();
}

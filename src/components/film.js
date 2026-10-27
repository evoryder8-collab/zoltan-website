// The film. A vertical frame floats in 3D under the hero; as the visitor
// scrolls, the section pins and the frame straightens and grows until it
// fills the screen (phones: edge to edge; desktop: full height, theatre dark
// around it), and the film plays. Browsers only grant real fullscreen to a
// tap, so the scroll does a full-screen takeover and a button offers the real
// thing. Sound follows the intro's choice: after "Yes" the film plays out loud
// (the tap also unlocks the video for iOS) and the ambient pad ducks under it.
import { t } from '../i18n/index.js';
import { sound } from '../lib/audio.js';
import { tilt, buzz } from '../lib/tilt.js';
import { whenNear } from '../lib/lazy.js';

const BASE = import.meta.env.BASE_URL;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// scroll progress through the pinned section
const GROW = [0.16, 0.42]; // floating frame → full screen
const PLAY = [0.34, 0.97]; // the film plays inside this window

export function initFilm({ reduced }) {
  const section = document.getElementById('film');
  const frame = section.querySelector('.film__frame');
  const video = section.querySelector('.film__video');
  const soundBtn = section.querySelector('.film__sound');
  const soundLabel = section.querySelector('.film__sound-label');
  const fullBtn = section.querySelector('.film__full');
  const replay = section.querySelector('.film__replay');
  const bar = section.querySelector('.film__bar i');
  const root = document.documentElement;

  let wantSound = sound.saved;
  let playing = false;
  let inWindow = false;
  let ended = false;

  // ── source: picked for the screen, set only when it's close ──
  const pickSrc = () => {
    const sharp = innerWidth * (devicePixelRatio || 1) >= 900 && !navigator.connection?.saveData;
    return `${BASE}media/film-${sharp ? 1080 : 720}.mp4`;
  };
  const load = () => {
    if (video.src) return;
    video.src = pickSrc();
    video.preload = 'auto';
  };
  whenNear(section, load, '1400px');

  // ── iOS: the intro's sound tap unlocks this element for audible play later.
  // Safari lifts the restriction at the moment play() is called inside a tap,
  // so a muted play that is stopped at once is enough, and nothing is heard. ──
  addEventListener('soundgesture', (e) => {
    wantSound = e.detail.on;
    if (!e.detail.on) return;
    load();
    video.muted = true;
    video.play()?.catch(() => {});
    video.pause();
  });
  // nothing plays outside the full-screen window, whatever asked it to
  // (reduced motion has no window: there the visitor plays it with controls)
  if (!reduced) {
    video.addEventListener('play', () => {
      if (!inWindow) video.pause();
    });
  }
  addEventListener('soundchange', (e) => {
    wantSound = e.detail.on;
    if (playing) setMuted(!wantSound);
  });

  // ── sound + UI ──
  const syncSoundUi = () => {
    const audible = !video.muted;
    soundBtn.setAttribute('aria-pressed', audible);
    soundBtn.classList.toggle('is-muted', !audible);
    soundLabel.textContent = t(audible ? 'film.soundOn' : 'film.soundOff');
  };
  const setMuted = (m) => {
    video.muted = m;
    sound.duck(!m && playing);
    syncSoundUi();
  };
  addEventListener('langchange', syncSoundUi);
  syncSoundUi();

  const play = async () => {
    if (playing || ended) return;
    load();
    playing = true;
    video.muted = !wantSound;
    try {
      await video.play();
    } catch {
      // no permission for sound: carry on silently and offer the tap
      video.muted = true;
      try {
        await video.play();
      } catch {
        playing = false;
      }
    }
    sound.duck(!video.muted && playing);
    syncSoundUi();
  };
  const pause = () => {
    if (!playing) return;
    playing = false;
    video.pause();
    sound.duck(false);
  };

  soundBtn.addEventListener('click', () => {
    setMuted(!video.muted);
    if (!video.muted && video.paused && !ended) video.play().catch(() => {});
    buzz(8);
  });
  fullBtn.addEventListener('click', () => {
    if (video.webkitEnterFullscreen && !document.fullscreenEnabled) return video.webkitEnterFullscreen();
    const el = frame.querySelector('.film__bezel');
    (el.requestFullscreen?.() || el.webkitRequestFullscreen?.())?.catch?.(() => {});
  });
  replay.addEventListener('click', () => {
    ended = false;
    replay.hidden = true;
    video.currentTime = 0;
    video.muted = !wantSound;
    playing = false;
    play();
  });
  video.addEventListener('ended', () => {
    ended = true;
    playing = false;
    sound.duck(false);
    replay.hidden = false;
  });
  video.addEventListener('timeupdate', () => {
    if (video.duration) bar.style.transform = `scaleX(${(video.currentTime / video.duration).toFixed(4)})`;
  });
  // tapping the playing film toggles pause
  video.addEventListener('click', () => {
    if (!inWindow) return;
    if (video.paused) play();
    else pause();
  });

  // ── reduced motion: a still frame that plays on tap, no scroll takeover ──
  if (reduced) {
    section.classList.add('is-static');
    video.controls = true;
    return;
  }

  // ── the scroll choreography ──
  let vw = innerWidth;
  let vh = innerHeight;
  let rect = { w0: 0, h0: 0, x0: 0, y0: 0, W: 0, H: 0, portrait: false };
  const measure = () => {
    vw = innerWidth;
    vh = innerHeight;
    const phone = vw < 760;
    const h0 = phone ? Math.min(vh * 0.56, 560) : Math.min(vh * 0.74, 680);
    const portrait = vw / vh < 0.75;
    rect = {
      h0,
      w0: (h0 * 9) / 16,
      x0: phone ? 0 : Math.min(vw * 0.2, 300),
      y0: phone ? vh * 0.12 : 0,
      portrait,
      // phones in portrait: edge to edge; elsewhere: full height, 9:16
      H: vh,
      W: portrait ? vw : (vh * 9) / 16,
    };
    update(lastP);
  };

  let lastP = 0;
  let px = 0;
  let py = 0;
  addEventListener('pointermove', (e) => {
    px = e.clientX / innerWidth - 0.5;
    py = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  const update = (p) => {
    lastP = p;
    const k = ease(clamp((p - GROW[0]) / (GROW[1] - GROW[0])));
    const float = 1 - k;
    const lx = tilt.active ? tilt.x : px;
    const ly = tilt.active ? tilt.y : py;
    const s = frame.style;
    s.setProperty('--w', `${lerp(rect.w0, rect.W, k).toFixed(1)}px`);
    s.setProperty('--h', `${lerp(rect.h0, rect.H, k).toFixed(1)}px`);
    s.setProperty('--x', `${lerp(rect.x0, 0, k).toFixed(1)}px`);
    s.setProperty('--y', `${lerp(rect.y0, 0, k).toFixed(1)}px`);
    s.setProperty('--ry', `${(float * (-16 + lx * 14)).toFixed(2)}deg`);
    s.setProperty('--rx', `${(float * (6 - ly * 8)).toFixed(2)}deg`);
    s.setProperty('--r', `${lerp(30, rect.portrait ? 0 : 18, k).toFixed(1)}px`);
    s.setProperty('--pad', `${lerp(10, 0, k).toFixed(1)}px`);
    section.style.setProperty('--k', k.toFixed(3));
    // only while pinned: once the section scrolls away the nav comes back
    const full = k > 0.98 && p < 0.99;
    root.classList.toggle('film-full', full);
    section.classList.toggle('is-full', full);

    const nowIn = p >= PLAY[0] && p <= PLAY[1];
    if (nowIn !== inWindow) {
      inWindow = nowIn;
      if (nowIn) play();
      else pause();
    }
  };

  // a quiet float while the frame waits
  const idle = () => {
    requestAnimationFrame(idle);
    if (lastP < GROW[1] && section.getBoundingClientRect().top < vh && section.getBoundingClientRect().bottom > 0) update(lastP);
  };
  requestAnimationFrame(idle);

  const onScroll = () => {
    const r = section.getBoundingClientRect();
    const total = r.height - vh;
    update(total > 0 ? clamp(-r.top / total) : 0);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  measure();
  onScroll();
}

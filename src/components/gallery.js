// Gallery: category filters, a drag/swipe track with momentum, velocity skew
// and per-photo parallax, and a full-screen viewer (arrows, swipe, keys).
// On Chromium desktop a displacement ripple follows fast drags.
import { GALLERY } from '../data/gallery.js';
import { t } from '../i18n/index.js';
import { esc } from '../lib/dom.js';
import { sound } from '../lib/audio.js';

const BASE = import.meta.env.BASE_URL;
const src = (id, w) => `${BASE}img/g-${id}-${w}.webp`;
const CATS = ['all', 'treatment', 'stretch', 'awards', 'portrait'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// The photo is 16% wider than its card (room for the parallax), so an
// off-centre subject is shifted toward the middle and zoomed just enough that
// no edge shows, up to 1.25×; the zoom is anchored at his face height.
const PARALLAX = 0.05; // of the card's width
function frame({ fx = 0.5, fy = 0.32 }) {
  const off = Math.abs(fx - 0.5);
  const z = clamp((0.5 + PARALLAX) / (0.58 - 1.16 * off), 1.02, 1.25);
  const room = Math.max(0, (0.58 * z - 0.5 - PARALLAX) / (1.16 * z));
  const shift = Math.sign(0.5 - fx) * Math.min(off, room);
  return `--z:${z.toFixed(3)};--sx:${(shift * z * 100).toFixed(2)}%;--fy:${Math.round(fy * 100)}%`;
}

export function initGallery({ reduced }) {
  const viewport = document.getElementById('gallery-viewport');
  const track = document.getElementById('gallery-track');
  const filters = document.getElementById('gallery-filters');
  const progress = document.querySelector('.gallery__progress');
  let cat = 'all';

  track.innerHTML = GALLERY.map(
    (g, i) => `
    <li class="shot" data-i="${i}" data-cat="${g.cat}" style="--ar:${g.w}/${g.h};${frame(g)}">
      <button type="button" data-open="${i}">
        <img src="${src(g.id, 800)}" srcset="${src(g.id, 800)} 800w, ${src(g.id, 1200)} 1200w, ${src(g.id, 1600)} 1600w" sizes="(max-width: 720px) 70vw, 480px" width="${g.w}" height="${g.h}" alt="" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async" draggable="false" />
      </button>
      <p class="shot__cap"></p>
    </li>`,
  ).join('');
  const shots = [...track.children];

  const label = () => {
    filters.setAttribute('aria-label', t('gallery.kicker'));
    filters.innerHTML = CATS.map((c) => `<button type="button" class="filter" data-cat="${c}" aria-pressed="${c === cat}">${esc(t(`gallery.filters.${c}`))}</button>`).join('');
    shots.forEach((li) => {
      const g = GALLERY[+li.dataset.i];
      const cap = t(`gallery.captions.${g.id}`);
      li.querySelector('img').alt = cap;
      li.querySelector('button').setAttribute('aria-label', t('gallery.open', { caption: cap }));
      li.querySelector('.shot__cap').textContent = cap;
    });
  };
  label();
  addEventListener('langchange', label);

  // ── track physics ──
  const S = { x: 0, target: 0, v: 0, min: 0 };
  let dragging = false;
  let startX = 0;
  let startTarget = 0;
  let lastX = 0;
  let lastT = 0;
  let moved = 0;
  let onScreen = false;
  let raf = 0;

  const measure = () => {
    S.min = Math.min(0, viewport.clientWidth - track.scrollWidth);
    S.target = clamp(S.target, S.min, 0);
  };
  new ResizeObserver(measure).observe(track);
  addEventListener('resize', measure);

  // chromium desktop: a displacement ripple while dragging fast
  let rippleFilter = null;
  const chromium = navigator.userAgentData?.brands?.some((b) => /Chromium|Chrome/.test(b.brand)) && matchMedia('(pointer: fine)').matches;
  if (chromium && !reduced) {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="gallery-ripple"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="1" seed="4"/><feDisplacementMap in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></svg>',
    );
    rippleFilter = document.querySelector('#gallery-ripple feDisplacementMap');
  }

  const render = () => {
    raf = 0;
    const prev = S.x;
    if (!dragging) {
      S.target = clamp(S.target, S.min, 0);
    }
    S.x += (S.target - S.x) * (dragging ? 0.35 : 0.085);
    S.v = S.x - prev;
    const skew = reduced ? 0 : clamp(S.v * -0.12, -6, 6);
    track.style.transform = `translate3d(${S.x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    const mid = viewport.clientWidth / 2;
    if (!reduced) {
      for (const li of shots) {
        if (li.hidden) continue;
        const r = li.getBoundingClientRect();
        li.style.setProperty('--px', `${((r.left + r.width / 2 - mid) * -0.06).toFixed(1)}px`);
      }
    }
    if (rippleFilter) {
      const a = Math.abs(S.v);
      rippleFilter.setAttribute('scale', a > 2 ? Math.min(26, a * 1.4).toFixed(1) : '0');
      track.style.filter = a > 2 ? 'url(#gallery-ripple)' : '';
    }
    progress.style.setProperty('--p', S.min ? (0.12 + 0.88 * (S.x / S.min)).toFixed(3) : 1);
    if (dragging || Math.abs(S.target - S.x) > 0.3) raf = requestAnimationFrame(render);
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(render);
  };
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) kick();
  }).observe(viewport);

  // arriving at the strip, it leans left and springs back, once and again a
  // little later, to show it can be swiped; any touch of it ends the hints
  let touched = false;
  let nudges = 0;
  let nudgeTimer = 0;
  const nudge = () => {
    if (touched || reduced || S.target !== 0 || nudges >= 2) return;
    nudges++;
    S.target = -Math.min(150, viewport.clientWidth * 0.24);
    kick();
    setTimeout(() => {
      if (touched) return;
      S.target = 0;
      kick();
    }, 620);
  };
  const stopHints = () => {
    touched = true;
    clearTimeout(nudgeTimer);
  };
  new IntersectionObserver(
    ([e]) => {
      clearTimeout(nudgeTimer);
      if (!e.isIntersecting) return;
      nudgeTimer = setTimeout(() => {
        nudge();
        nudgeTimer = setTimeout(nudge, 5200);
      }, 450);
    },
    { threshold: 0.6 },
  ).observe(viewport);
  viewport.addEventListener('pointerdown', stopHints);
  viewport.addEventListener('wheel', stopHints, { passive: true });
  document.querySelectorAll('.gallery__arrows [data-dir]').forEach((b) => b.addEventListener('click', stopHints));

  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = 0;
    startX = lastX = e.clientX;
    lastT = performance.now();
    startTarget = S.target;
    S.flick = 0;
    viewport.classList.add('is-dragging');
    kick();
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (moved > 6) viewport.setPointerCapture?.(e.pointerId);
    let next = startTarget + dx;
    if (next > 0) next *= 0.35; // rubber band at the ends
    if (next < S.min) next = S.min + (next - S.min) * 0.35;
    const now = performance.now();
    S.flick = (e.clientX - lastX) / Math.max(1, now - lastT);
    lastX = e.clientX;
    lastT = now;
    S.target = next;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    S.target += (S.flick || 0) * 380; // momentum
    kick();
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  // trackpads: horizontal swipes move the strip; vertical scroll passes through
  viewport.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      S.target -= e.deltaX;
      kick();
    },
    { passive: false },
  );
  // a drag is not a click
  track.addEventListener('click', (e) => {
    if (moved > 6) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const b = e.target.closest('[data-open]');
    if (b) open(+b.dataset.open);
  }, true);
  // keep keyboard focus in view
  track.addEventListener('focusin', (e) => {
    const li = e.target.closest('.shot');
    if (!li) return;
    const vw = viewport.clientWidth;
    const left = li.offsetLeft;
    if (left + S.target < 0 || left + li.offsetWidth + S.target > vw) S.target = clamp(-(left - vw / 2 + li.offsetWidth / 2), S.min, 0);
    kick();
  });

  document.querySelectorAll('.gallery__arrows [data-dir]').forEach((b) =>
    b.addEventListener('click', () => {
      S.target = clamp(S.target - +b.dataset.dir * viewport.clientWidth * 0.7, S.min, 0);
      kick();
    }),
  );

  filters.addEventListener('click', (e) => {
    const b = e.target.closest('.filter');
    if (!b || b.dataset.cat === cat) return;
    cat = b.dataset.cat;
    filters.querySelectorAll('.filter').forEach((x) => x.setAttribute('aria-pressed', x === b));
    shots.forEach((li) => (li.hidden = cat !== 'all' && li.dataset.cat !== cat));
    S.target = 0;
    requestAnimationFrame(() => {
      measure();
      kick();
    });
  });

  // ── viewer ──
  const dlg = document.getElementById('viewer');
  const img = dlg.querySelector('.viewer__img');
  const count = dlg.querySelector('.viewer__count');
  const text = dlg.querySelector('.viewer__text');
  let list = [];
  let at = 0;
  const show = (dir = 0) => {
    const g = GALLERY[list[at]];
    img.classList.remove('is-swap');
    img.src = src(g.id, 1600);
    img.alt = t(`gallery.captions.${g.id}`);
    if (dir) {
      img.style.setProperty('--dir', dir);
      void img.offsetWidth;
      img.classList.add('is-swap');
    }
    text.textContent = img.alt;
    count.textContent = t('gallery.viewer.counter', { n: at + 1, total: list.length });
    // warm the neighbours
    [list[at + 1], list[at - 1]].filter((i) => i != null).forEach((i) => (new Image().src = src(GALLERY[i].id, 1600)));
  };
  const step = (d) => {
    at = (at + d + list.length) % list.length;
    show(d);
    sound.tap();
  };
  function open(i) {
    list = shots.filter((li) => !li.hidden).map((li) => +li.dataset.i);
    at = Math.max(0, list.indexOf(i));
    show();
    dlg.showModal();
    sound.tap();
  }
  dlg.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)));
  dlg.querySelector('.viewer__close').addEventListener('click', () => dlg.close());
  let sx = null;
  let swiped = false;
  dlg.addEventListener('click', (e) => {
    if (swiped) return (swiped = false);
    if (e.target === dlg || e.target.classList.contains('viewer__stage')) dlg.close();
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  const stage = dlg.querySelector('.viewer__stage');
  stage.addEventListener('pointerdown', (e) => (sx = e.clientX));
  stage.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50) {
      swiped = true;
      step(dx < 0 ? 1 : -1);
    }
  });
  addEventListener('langchange', () => dlg.open && show());

  measure();
  kick();
}

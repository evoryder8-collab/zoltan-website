// The results ticker as a physical ribbon, after the Luma Wellness award
// strip: it cruises at one pass per 52s, stops dead under a finger, follows the
// drag 1:1, keeps the release speed of a flick and then eases back to cruising
// (exponential damping, ~0.72s), even after being thrown backwards. The track
// holds two identical passes and the offset wraps by one pass, so it never ends.
import { buzz } from './tilt.js';

const CRUISE_SECONDS = 52;
const MAX_FLICK = 900; // px/s
const DAMPING = 0.72; // s

export function mountRibbon(viewport, track, passSelector) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pass = track.querySelector(passSelector);
  let period = pass?.getBoundingClientRect().width || 0;
  let offset = 0;
  let speed = period / CRUISE_SECONDS;
  let frame = 0;
  let last = 0;
  let visible = false;
  let pointer;
  let prevX = 0;
  let prevT = 0;
  let dragSpeed = 0;

  const normalize = () => {
    if (period) offset = ((offset % period) + period) % period;
  };
  const paint = () => {
    normalize();
    track.style.transform = `translate3d(${(-offset).toFixed(2)}px,0,0)`;
  };

  function tick(now) {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) return;
    const dt = Math.min((now - last) / 1000 || 0.016, 0.05);
    last = now;
    if (pointer === undefined && !document.querySelector('dialog[open]')) {
      // damping keeps the release speed and glides back to the cruise
      const cruise = period / CRUISE_SECONDS;
      speed = cruise + (speed - cruise) * Math.exp(-dt / DAMPING);
      offset += speed * dt;
      paint();
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = performance.now();
    viewport.toggleAttribute('data-ribbon-ready', !reduced.matches);
    if (reduced.matches) {
      track.style.transform = '';
      pointer = undefined;
    } else paint();
    if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
  }

  viewport.addEventListener('pointerdown', (e) => {
    if (reduced.matches || !e.isPrimary || e.button !== 0) return;
    pointer = e.pointerId;
    prevX = e.clientX;
    prevT = performance.now();
    dragSpeed = 0;
    speed = 0; // it stops under the finger
    viewport.setPointerCapture(pointer);
    buzz(6);
  });
  viewport.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointer) return;
    const now = performance.now();
    const delta = prevX - e.clientX;
    const dt = Math.max(8, now - prevT) / 1000;
    offset += delta;
    dragSpeed = dragSpeed * 0.3 + Math.max(-MAX_FLICK, Math.min(MAX_FLICK, delta / dt)) * 0.7;
    prevX = e.clientX;
    prevT = now;
    paint();
  });
  const release = (e) => {
    if (e.pointerId !== pointer) return;
    // a finger that rested before lifting doesn't fling
    speed = performance.now() - prevT > 90 ? 0 : dragSpeed;
    pointer = undefined;
    if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
  };
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('lostpointercapture', release);
  // a release outside, or losing focus mid-drag, must never latch the hold
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  addEventListener('blur', () => {
    const held = pointer;
    pointer = undefined;
    speed = 0;
    if (held !== undefined && viewport.hasPointerCapture(held)) viewport.releasePointerCapture(held);
  });
  viewport.addEventListener('dragstart', (e) => e.preventDefault());
  // trackpads: sideways swipes move it; vertical scrolling passes through
  viewport.addEventListener(
    'wheel',
    (e) => {
      if (reduced.matches || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      offset += e.deltaX;
      speed = 0;
      paint();
    },
    { passive: false },
  );
  viewport.addEventListener('keydown', (e) => {
    if (reduced.matches || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    speed = e.key === 'ArrowRight' ? 480 : -480;
  });

  const resize = new ResizeObserver(() => {
    const next = pass?.getBoundingClientRect().width || 0;
    if (period && next) offset *= next / period;
    period = next;
    if (!reduced.matches) paint();
  });
  if (pass) resize.observe(pass);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(viewport);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();

  return {
    /** Call after the passes are re-rendered (a language change). */
    refresh() {
      if (pass) resize.unobserve(pass);
      pass = track.querySelector(passSelector);
      if (!pass) return;
      resize.observe(pass);
      const next = pass.getBoundingClientRect().width;
      if (period && next) offset *= next / period;
      period = next;
      if (!reduced.matches) paint();
    },
  };
}

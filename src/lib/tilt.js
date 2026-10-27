// On phones the phone itself becomes the pointer: tilting it leans the laurel,
// moves the light across the glass and the silk, and sways the medal.
// iOS asks permission, so requestTilt() must run inside a tap.
const clamp = (v) => Math.max(-1, Math.min(1, v));
export const tilt = { x: 0, y: 0, active: false };

const STORE = 'zoltan.tilt';
let attached = false;
let base = null;

function attach() {
  if (attached) return;
  attached = true;
  addEventListener('deviceorientation', (e) => {
    if (e.beta == null || e.gamma == null) return;
    // the rest position drifts toward how the phone is being held
    base = base ? { b: base.b + (e.beta - base.b) * 0.008, g: base.g + (e.gamma - base.g) * 0.008 } : { b: e.beta, g: e.gamma };
    tilt.x = clamp((e.gamma - base.g) / 22);
    tilt.y = clamp((e.beta - base.b) / 22);
    tilt.active = true;
  });
}

export const isTouch = () => matchMedia('(pointer: coarse)').matches;

/** Android and others: starts straight away. iOS: waits for requestTilt(). */
export function initTilt() {
  if (!isTouch() || typeof DeviceOrientationEvent === 'undefined') return;
  if (typeof DeviceOrientationEvent.requestPermission !== 'function') return attach();
  // iOS forgets between visits: ask again at the first tap if it was allowed before
  try {
    if (localStorage.getItem(STORE) === 'granted') addEventListener('touchend', () => requestTilt(), { once: true });
  } catch {}
}

export async function requestTilt() {
  if (!isTouch() || typeof DeviceOrientationEvent === 'undefined') return false;
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const r = await DeviceOrientationEvent.requestPermission();
      try {
        localStorage.setItem(STORE, r);
      } catch {}
      if (r !== 'granted') return false;
    } catch {
      return false;
    }
  }
  attach();
  return true;
}

/** A short haptic tick on phones that support it (Android). */
export const buzz = (ms = 8) => {
  try {
    if (isTouch()) navigator.vibrate?.(ms);
  } catch {}
};

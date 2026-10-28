// Hero entrance and the results ticker. The 3D laurel is mounted by main.js.
import { gsap } from 'gsap';
import { t } from '../i18n/index.js';
import { esc } from '../lib/dom.js';

export function renderTicker() {
  const items = t('ticker');
  const set = items.map((s) => `<span class="ticker__item">${esc(s)}<span class="leaf" aria-hidden="true"></span></span>`).join('');
  // two identical halves, each long enough for wide screens, so -50% loops seamlessly
  const half = `<span class="ticker__set">${set}${set}</span>`;
  const track = document.querySelector('.ticker__track');
  track.innerHTML = half + half.replace('class="ticker__set"', 'class="ticker__set" aria-hidden="true"');
}

export function renderName() {
  const first = t('name.first');
  document.querySelector('.hero__name-inner').innerHTML = `${esc(first.slice(0, 4))}<em>${esc(first.slice(4, 5))}</em>${esc(first.slice(5))}`;
}

// A faint warm rim and crimson glow around the portrait, plus its floor shadow.
// Kept in one string so GSAP's filter tweens end exactly on the CSS value.
export const PORTRAIT_GLOW =
  'drop-shadow(0 0 1.5px rgba(255,196,204,0.38)) drop-shadow(0 0 26px rgba(227,37,63,0.24)) drop-shadow(0 30px 50px rgba(0,0,0,0.55))';

export function prepareHero({ reduced }) {
  if (reduced) return;
  const q = (s) => document.querySelectorAll(`.hero ${s}`);
  gsap.set([...q('.hero__copy .kicker'), ...q('.hero__surname'), ...q('.hero__brand'), ...q('.hero__lead'), ...q('.hero__ctas > *'), ...q('.hero__chips > *')], { opacity: 0, y: 24 });
  gsap.set(q('.hero__name-inner'), { opacity: 0, yPercent: 40, filter: 'blur(12px)' });
  gsap.set(q('.hero__portrait'), { opacity: 0, y: 30, scale: 1.12, filter: `blur(18px) brightness(1.7) ${PORTRAIT_GLOW}` });
  gsap.set(q('.hero__halo'), { opacity: 0, scale: 0.7 });
  gsap.set(q('.hero__aura'), { opacity: 0, scale: 0.6 });
  gsap.set(q('.hero__disc'), { opacity: 0, scale: 0.85 });
}

/** skipName: the opening flies the name in from the intro card instead. */
export function enterHero({ reduced, skipName = false }) {
  if (reduced) return gsap.timeline();
  const q = (s) => document.querySelectorAll(`.hero ${s}`);
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to(q('.hero__halo'), { opacity: 1, scale: 1, duration: 2.2 }, 0)
    .to(q('.hero__aura'), { opacity: 1, scale: 1, duration: 2.6 }, 0)
    .to(q('.hero__disc'), { opacity: 1, scale: 1, duration: 2.2 }, 0.2)
    .to(q('.hero__portrait'), { opacity: 1, y: 0, scale: 1, filter: `blur(0px) brightness(1) ${PORTRAIT_GLOW}`, duration: 2.2 }, 0.1)
    .to(q('.hero__copy .kicker'), { opacity: 1, y: 0, duration: 1.1 }, 0.3);
  if (!skipName) tl.to(q('.hero__name-inner'), { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 1.6 }, 0.38);
  tl.to(q('.hero__surname'), { opacity: 1, y: 0, duration: 1.2 }, 0.5)
    .to(q('.hero__brand'), { opacity: 1, y: 0, duration: 1.2 }, 0.6)
    .to(q('.hero__lead'), { opacity: 1, y: 0, duration: 1.2 }, 0.62)
    .to(q('.hero__ctas > *'), { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.78)
    .to(q('.hero__chips > *'), { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.92);
  return tl;
}

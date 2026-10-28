// The opening: from the intro card to the homepage, like a title sequence.
//   1 · the card's contents dissolve upward and the glass collapses into a
//       single line of crimson light across the screen
//   2 · the laurel swells, turns and burns out
//   3 · the name lifts out of the card and flies into its place in the hero
//   4 · his honours breathe in, one by one, at varied spots around the screen
//   5 · the light opens like a lens into a soft portal that widens until the
//       hero fills the screen; the honours drift outward and dissolve into its
//       edge, with a low swell and a shockwave through the silk, and the
//       portrait pushes in out of light
import { gsap } from 'gsap';
import { sound } from '../lib/audio.js';
import { t } from '../i18n/index.js';
import { esc } from '../lib/dom.js';

// where honours may appear (% of the screen), clear of the centre band where
// the line of light and the flying name are
const ZONES = [
  { x: [12, 30], y: [13, 24] },
  { x: [62, 86], y: [12, 22] },
  { x: [40, 58], y: [6, 10] },
  { x: [12, 32], y: [72, 84] },
  { x: [60, 86], y: [74, 86] },
  { x: [40, 60], y: [88, 92] },
];
const rand = ([a, b]) => a + Math.random() * (b - a);

function honours() {
  const ausmc = t('champs.events.ausmc26.titles').map((title) => ({ title, event: t('champs.events.ausmc26.short') }));
  const slovakia = { title: t('champs.events.slovakia.titles')[0], event: t('champs.events.slovakia.short') };
  const invitation = { title: t('honours.accolade'), event: t('honours.accoladeEvent') };
  return [...ausmc, slovakia, invitation];
}

export function playOpening({ silk, onHero }) {
  const intro = document.getElementById('intro');
  const card = intro.querySelector('.intro__card');
  const title = intro.querySelector('.intro__title');
  const laurel = intro.querySelector('.intro__laurel');
  const nameInner = document.querySelector('.hero__name-inner');

  intro.insertAdjacentHTML('beforeend', '<div class="intro__veil"></div><div class="intro__rim"></div><div class="intro__seam"></div>');
  const veil = intro.querySelector('.intro__veil');
  const rim = intro.querySelector('.intro__rim');
  const seam = intro.querySelector('.intro__seam');

  // honours sit on the veil, so the opening portal takes them with it
  const zones = [...ZONES].sort(() => Math.random() - 0.5);
  const placed = [];
  const accolades = honours().map((h, i) => {
    const z = zones[i % zones.length];
    // re-roll within the zone until it keeps a clear distance from the others
    let x;
    let y;
    for (let tries = 0; tries < 12; tries++) {
      x = rand(z.x);
      y = rand(z.y);
      if (placed.every((p) => Math.abs(p.x - x) > 26 || Math.abs(p.y - y) > 14)) break;
    }
    placed.push({ x, y });
    const el = document.createElement('div');
    el.className = 'accolade';
    el.setAttribute('aria-hidden', 'true');
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.innerHTML = `<span class="leaf"></span><span class="accolade__title">${esc(h.title)}</span><span class="accolade__event">${esc(h.event)}</span>`;
    veil.append(el);
    return { el, x, y };
  });
  intro.classList.add('is-opening');

  // the card's own entrance animation would override GSAP's transforms
  card.style.animation = 'none';
  gsap.set(card, { opacity: 1, y: 0, scale: 1 });

  // ── the name's flight: measure where it lands, start it on the card ──
  gsap.set(nameInner, { clearProps: 'transform,filter' });
  const to = nameInner.getBoundingClientRect();
  const from = title.getBoundingClientRect();
  const clone = document.createElement('div');
  clone.className = 'hero__name opening-name';
  clone.setAttribute('aria-hidden', 'true');
  clone.innerHTML = `<span class="hero__name-inner">${nameInner.innerHTML}</span>`;
  Object.assign(clone.style, { left: `${to.left}px`, top: `${to.top}px` });
  document.body.append(clone);
  // line-height can offset the inner box from the wrapper: correct so the
  // clone's name sits exactly on the real one, then scale around its centre
  const got = clone.firstElementChild.getBoundingClientRect();
  const left = to.left + (to.left - got.left);
  const topPx = to.top + (to.top - got.top);
  Object.assign(clone.style, { left: `${left}px`, top: `${topPx}px` });
  const toCx = to.left + to.width / 2;
  const toCy = to.top + to.height / 2;
  gsap.set(clone, {
    transformOrigin: `${toCx - left}px ${toCy - topPx}px`,
    x: from.left + from.width / 2 - toCx,
    y: from.top + from.height / 2 - toCy,
    scale: from.width / to.width,
    opacity: 0,
  });

  return new Promise((resolve) => {
    const bits = card.querySelectorAll('.intro__kicker, .intro__surname, .intro__line, .intro__step:not([hidden])');
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(nameInner, { opacity: 1, yPercent: 0, filter: 'none' });
        clone.remove();
        intro.hidden = true;
        intro.classList.remove('is-opening');
        resolve();
      },
    });
    tl.to(bits, { opacity: 0, y: -16, filter: 'blur(8px)', duration: 0.5, stagger: 0.05, ease: 'power2.in' }, 0)
      // the title becomes the hero's name
      .set(clone, { opacity: 1 }, 0.42)
      .set(title, { opacity: 0 }, 0.42)
      .to(clone, { x: 0, y: 0, scale: 1, duration: 2.1, ease: 'expo.inOut' }, 0.42)
      // the glass collapses into a line of light
      .to(card, { scaleY: 0.012, scaleX: 1.2, duration: 0.75, ease: 'power4.inOut' }, 0.38)
      .to(card, { opacity: 0, duration: 0.25 }, 0.95)
      .fromTo(seam, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.85, ease: 'power3.inOut' }, 0.5)
      // no blur: filtering a large SVG every frame stalls phone GPUs
      .to(laurel, { scale: 1.9, rotate: -16, opacity: 0, duration: 1.9, ease: 'power3.inOut' }, 0.3);
    // honours breathe in, one after another
    accolades.forEach(({ el }, i) => {
      const at = 0.55 + i * 0.25;
      tl.fromTo(el, { opacity: 0, scale: 0.94, filter: 'blur(12px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.1, ease: 'power2.out' }, at)
        .add(() => {
          el.classList.add('is-breathing');
          sound.accolade(i);
        }, at + 0.15);
    });
    const open = 2.55;
    // the portal: the line of light opens into a narrow lens (rx, ry: the
    // ellipse's radii, % of the screen), which then widens past every corner
    const portal = { rx: 55, ry: 0.4 };
    const draw = () => {
      for (const el of [veil, rim]) {
        el.style.setProperty('--rx', `${portal.rx.toFixed(2)}%`);
        el.style.setProperty('--ry', `${portal.ry.toFixed(2)}%`);
      }
    };
    draw();
    tl.add(() => {
      sound.reveal();
      silk.ripple(innerWidth / 2, innerHeight / 2);
      silk.flare();
    }, open)
      .to(portal, { rx: 78, ry: 16, duration: 0.75, ease: 'power2.out', onUpdate: draw }, open)
      .to(portal, { rx: 210, ry: 210, duration: 1.9, ease: 'power3.inOut', onUpdate: draw }, open + 0.45)
      .fromTo(rim, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, open + 0.1)
      .to(rim, { opacity: 0, duration: 1.1, ease: 'power2.in' }, open + 1.1)
      // the light itself softens into the opening rather than stretching
      .to(seam, { scaleX: 1.15, opacity: 0, duration: 0.9, ease: 'power2.out' }, open + 0.05)
      .add(onHero, open - 0.1);
    // the honours drift outward, away from the opening, and dissolve before
    // the hero's own words arrive under them
    accolades.forEach(({ el, x, y }) => {
      tl.to(el, { x: (x - 50) * innerWidth * 0.004, y: (y - 50) * innerHeight * 0.005, scale: 1.08, filter: 'blur(6px)', duration: 1.3, ease: 'power2.in' }, open + 0.1)
        .to(el, { opacity: 0, duration: 0.8, ease: 'power1.in' }, open + 0.1);
    });
  });
}

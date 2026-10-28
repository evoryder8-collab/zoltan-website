// The opening: from the intro card to the homepage, like a title sequence.
//   1 · the card's contents dissolve upward and the glass collapses into a
//       single line of crimson light across the screen
//   2 · the laurel swells, turns and burns out
//   3 · the name lifts out of the card and flies into its place in the hero
//   4 · his honours breathe in, one by one, at varied spots around the screen
//       that never meet the light, the name's flight or the hero's words
//   5 · the light opens like a lens into a soft portal that widens until the
//       hero fills the screen; the honours drift outward and dissolve into its
//       edge, with a low swell and a shockwave through the silk, and the
//       portrait pushes in out of light
import { gsap } from 'gsap';
import { sound } from '../lib/audio.js';
import { t } from '../i18n/index.js';
import { esc } from '../lib/dom.js';

function honours() {
  const ausmc = t('champs.events.ausmc26.titles').map((title) => ({ title, event: t('champs.events.ausmc26.short') }));
  const slovakia = { title: t('champs.events.slovakia.titles')[0], event: t('champs.events.slovakia.short') };
  const invitation = { title: t('honours.accolade'), event: t('honours.accoladeEvent') };
  // the headline titles first: when a small screen has room for only a few
  return [ausmc[0], slovakia, ...ausmc.slice(1), invitation];
}

// Honours go where they'll never meet anything: clear of each keep-out box
// (the line of light, the name's whole flight, the hero's words), the
// screen's edges and each other. Many random layouts are tried and the one
// that fits the most, spread the widest, wins; on a small screen the ones
// that don't fit stay out (the headline titles come first) rather than overlap.
function placeHonours(veil, list, keepOut) {
  const W = innerWidth;
  const H = innerHeight;
  const EDGE = 12;
  const GAP = 12;
  const hits = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  const els = list.map((h) => {
    const el = document.createElement('div');
    el.className = 'accolade';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<span class="leaf"></span><span class="accolade__title">${esc(h.title)}</span><span class="accolade__event">${esc(h.event)}</span>`;
    veil.append(el);
    return el;
  });
  const sizes = els.map((el) => el.getBoundingClientRect());
  let best = [];
  let bestSpread = -1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const layout = [];
    sizes.forEach(({ width: w, height: h }, i) => {
      let pick = null;
      let far = -1;
      for (let k = 0; k < 60; k++) {
        const x = EDGE + w / 2 + Math.random() * (W - 2 * EDGE - w);
        const y = EDGE + h / 2 + Math.random() * (H - 2 * EDGE - h);
        const box = { l: x - w / 2 - GAP, r: x + w / 2 + GAP, t: y - h / 2 - GAP, b: y + h / 2 + GAP };
        if (keepOut.some((o) => hits(box, o)) || layout.some((p) => hits(box, p.box))) continue;
        const d = Math.min(Infinity, ...layout.map((p) => Math.hypot(p.x - x, (p.y - y) * 1.6)));
        if (d > far) {
          far = d;
          pick = { i, x, y, box };
        }
      }
      if (pick) layout.push(pick);
    });
    let spread = Infinity;
    layout.forEach((p, j) => layout.slice(j + 1).forEach((q) => (spread = Math.min(spread, Math.hypot(p.x - q.x, (p.y - q.y) * 1.6)))));
    // most honours first, then the more important ones, then the widest spread
    const rank = (l) => l.reduce((sum, p) => sum + 2 ** (els.length - p.i), 0);
    const better = layout.length !== best.length ? layout.length > best.length : rank(layout) !== rank(best) ? rank(layout) > rank(best) : spread > bestSpread;
    if (better) {
      best = layout;
      bestSpread = spread;
    }
    if (best.length === els.length && attempt > 12) break;
  }
  const kept = new Set(best.map((p) => p.i));
  els.forEach((el, i) => !kept.has(i) && el.remove());
  return best.map(({ i, x, y }) => {
    const el = els[i];
    const px = (x / W) * 100;
    const py = (y / H) * 100;
    el.style.left = `${px}%`;
    el.style.top = `${py}%`;
    return { el, x: px, y: py };
  });
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

  intro.classList.add('is-opening');
  intro.scrollTo(0, 0); // where overflow: clip isn't supported yet

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

  // ── the honours: on the veil, so the opening portal takes them with it ──
  const box = (r, p) => ({ l: r.left - p, r: r.right + p, t: r.top - p, b: r.bottom + p });
  const accolades = placeHonours(veil, honours(), [
    { l: 0, r: innerWidth, t: innerHeight / 2 - 40, b: innerHeight / 2 + 40 }, // the line of light
    // the name's whole flight, from the card to its place in the hero
    box({ left: Math.min(from.left, to.left), right: Math.max(from.right, to.right), top: Math.min(from.top, to.top), bottom: Math.max(from.bottom, to.bottom) }, 18),
    box(document.querySelector('.hero__copy').getBoundingClientRect(), 10),
  ]);

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
    // honours breathe in, one after another, once the card has folded into
    // the light (so they may sit where it was)
    accolades.forEach(({ el }, i) => {
      const at = 0.9 + i * 0.14;
      tl.fromTo(el, { opacity: 0, scale: 0.94, filter: 'blur(12px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out' }, at)
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
      // the light itself softens into the opening at once, never across him
      .to(seam, { scaleX: 1.15, opacity: 0, duration: 0.45, ease: 'power2.out' }, open + 0.02)
      .add(onHero, open - 0.1);
    // the honours drift outward and are gone as the portal opens, before he
    // shows through it
    accolades.forEach(({ el, x, y }) => {
      tl.to(el, { x: (x - 50) * innerWidth * 0.003, y: (y - 50) * innerHeight * 0.004, scale: 1.06, filter: 'blur(6px)', duration: 0.6, ease: 'power2.in' }, open - 0.3)
        .to(el, { opacity: 0, duration: 0.55, ease: 'power1.in' }, open - 0.3);
    });
  });
}

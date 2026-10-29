// The opening: from the intro card to the homepage, like a title sequence.
//   1 · the card's contents dissolve upward and the glass collapses into a
//       single line of crimson light across the screen
//   2 · the laurel swells, turns and burns out
//   3 · the name lifts out of the card and flies into its place in the hero,
//       on a deep whoosh
//   4 · once it has landed, his honours breathe in one by one, a centred
//       column in the middle of the free screen, while the light dims behind
//   5 · they rise and dissolve out of the way on a breath of air as the light
//       brightens and opens like a lens into a soft portal that widens until
//       the hero fills the screen, with a low swell, a whoosh and a shockwave
//       through the silk, and the portrait pushes in out of light
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

// The honours stand in a centred column in the middle of the free screen:
// above the name's place on a phone (it lands across the bottom), beside it
// on wider screens. As many as fit, the headline titles first.
function stackHonours(veil, list, name) {
  const W = innerWidth;
  const H = innerHeight;
  const beside = name.right < W * 0.62;
  const band = beside ? { l: name.right + 40, r: W - 40, t: H * 0.08, b: H * 0.92 } : { l: 16, r: W - 16, t: H * 0.07, b: name.top - 32 };
  const GAP = H < 700 ? 10 : 16;
  const stack = [];
  let used = 0;
  for (const h of list) {
    const el = document.createElement('div');
    el.className = 'accolade';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<span class="leaf"></span><span class="accolade__title">${esc(h.title)}</span><span class="accolade__event">${esc(h.event)}</span>`;
    el.style.maxWidth = `${Math.min(beside ? 500 : 360, band.r - band.l)}px`;
    veil.append(el);
    const { height } = el.getBoundingClientRect();
    const need = used + (stack.length ? GAP : 0) + height;
    if (need > band.b - band.t) {
      el.remove();
      break;
    }
    used = need;
    stack.push({ el, height });
  }
  const cx = (band.l + band.r) / 2;
  let y = (band.t + band.b) / 2 - used / 2;
  return stack.map(({ el, height }) => {
    el.style.left = `${cx}px`;
    el.style.top = `${y + height / 2}px`;
    y += height + GAP;
    return el;
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
  const accolades = stackHonours(veil, honours(), to);

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
      .to(clone, { x: 0, y: 0, scale: 1, duration: 1.5, ease: 'expo.inOut' }, 0.42)
      .add(() => sound.flight(1.5), 0.42)
      // the glass collapses into a line of light
      .to(card, { scaleY: 0.012, scaleX: 1.2, duration: 0.75, ease: 'power4.inOut' }, 0.38)
      .to(card, { opacity: 0, duration: 0.25 }, 0.95)
      .fromTo(seam, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.85, ease: 'power3.inOut' }, 0.5)
      // and dims behind the honours while they hold
      .to(seam, { opacity: 0.18, duration: 0.6, ease: 'power2.out' }, 1.35)
      // no blur: filtering a large SVG every frame stalls phone GPUs
      .to(laurel, { scale: 1.9, rotate: -16, opacity: 0, duration: 1.9, ease: 'power3.inOut' }, 0.3);
    // honours breathe in, one after another, once the name has all but landed
    accolades.forEach((el, i) => {
      const at = 1.45 + i * 0.14;
      tl.fromTo(el, { opacity: 0, y: 12, scale: 0.96, filter: 'blur(10px)' }, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out' }, at)
        .add(() => el.classList.add('is-breathing'), at + 0.15);
    });
    const open = 3.3;
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
      // the light gathers as the honours leave, then softens into the opening
      // at once, never across him
      .to(seam, { opacity: 1, duration: 0.35, ease: 'power2.in' }, open - 0.35)
      .to(seam, { scaleX: 1.15, opacity: 0, duration: 0.45, ease: 'power2.out' }, open + 0.02)
      .add(onHero, open - 0.1);
    // the honours rise and dissolve out of the way, top first, gone before
    // he shows through the portal
    tl.add(() => sound.lift(), open - 0.45);
    accolades.forEach((el, i) => {
      tl.to(el, { y: -40, opacity: 0, filter: 'blur(6px)', duration: 0.7, ease: 'power2.in' }, open - 0.45 + i * 0.05);
    });
  });
}

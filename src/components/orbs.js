// Contact jewels: Instagram, Facebook, WhatsApp, call and TikTok as gold-set
// beads in each platform's colour (styles/orbs.css). On the homepage they
// float on the right edge (a row along the bottom on phones) and wait for the
// first real scroll, so the opening stays uncluttered; /linkinbio shows a row
// of them under the name. Once in, they bob, lean toward the pointer (or the
// phone's tilt) and trail a little behind fast scrolling, like beads in water.
import { CONTACT } from '../config.js';
import { t } from '../i18n/index.js';
import { icon } from '../lib/icons.js';
import { waLink, telLink } from '../lib/links.js';
import { tilt, buzz } from '../lib/tilt.js';
import { sound } from '../lib/audio.js';

const HREFS = {
  instagram: () => CONTACT.socials.instagram,
  facebook: () => CONTACT.socials.facebook,
  tiktok: () => CONTACT.socials.tiktok,
  youtube: () => CONTACT.socials.youtube,
  whatsapp: () => waLink(CONTACT.whatsapp, t('contact.topics.booking.wa')),
  phone: () => telLink(CONTACT.phone),
};
const SUMMON_AT = 60; // px: a deliberate swipe, not a nudge
const clamp = (v, a) => Math.max(-a, Math.min(a, v));

/**
 * Fills a container with jewels. `ids` in display order; the arrival order
 * runs from the middle out. Labels and links follow the language.
 */
export function renderOrbs(container, ids) {
  const mid = (ids.length - 1) / 2;
  container.innerHTML = ids
    .filter((id) => HREFS[id]())
    .map(
      (id, i) => `
      <a class="orb orb--${id}" style="--d:${Math.round(Math.abs(i - mid))}" data-orb="${id}"${id === 'phone' ? '' : ' target="_blank" rel="noopener"'}>
        <span class="orb__shadow"></span>
        <span class="orb__float"><span class="orb__gem">${icon(id)}</span></span>
        <span class="orb__tip" aria-hidden="true"></span>
      </a>`,
    )
    .join('');
  const label = () => {
    container.querySelectorAll('[data-orb]').forEach((a) => {
      const id = a.dataset.orb;
      a.href = HREFS[id]();
      a.setAttribute('aria-label', t(`orbs.${id}`));
      a.querySelector('.orb__tip').textContent = t(`orbs.${id}`);
    });
  };
  label();
  addEventListener('langchange', label);
  container.addEventListener('click', (e) => {
    const a = e.target.closest('[data-orb]');
    if (!a) return;
    e.preventDefault();
    ask(a);
  });
}

// ── "You're about to visit me on…": Continue or Cancel, so a stray tap never opens an app ──
let dialog = null;
function ask(orb) {
  const id = orb.dataset.orb;
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'orb-ask';
    dialog.setAttribute('aria-labelledby', 'orb-ask-title');
    dialog.innerHTML = `
      <div class="orb-ask__card" tabindex="-1">
        <span class="orb-ask__mark"><span class="orb__gem"></span></span>
        <p class="orb-ask__kicker"></p>
        <h3 class="orb-ask__title" id="orb-ask-title"></h3>
        <p class="orb-ask__handle"></p>
        <div class="orb-ask__actions">
          <button type="button" class="orb-ask__cancel" data-close></button>
          <a class="orb-ask__go"><span></span>${icon('go')}</a>
        </div>
      </div>`;
    document.body.append(dialog);
    const close = () => {
      dialog.classList.add('is-leaving');
      setTimeout(() => {
        dialog.close();
        dialog.classList.remove('is-leaving');
      }, 180);
    };
    // the backdrop and Cancel close it; Continue follows its link, then closes
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-close]')) close();
      else if (e.target.closest('.orb-ask__go')) setTimeout(close, 120);
    });
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      close();
    });
  }
  const [title, handle] = t(`orbs.ask.${id}`);
  const card = dialog.querySelector('.orb-ask__card');
  card.className = `orb-ask__card orb--${id}`;
  dialog.querySelector('.orb__gem').innerHTML = icon(id);
  dialog.querySelector('.orb-ask__kicker').textContent = t(`orbs.${id}`);
  dialog.querySelector('.orb-ask__title').textContent = title;
  dialog.querySelector('.orb-ask__handle').textContent = handle;
  dialog.querySelector('.orb-ask__cancel').textContent = t('orbs.ask.cancel');
  const go = dialog.querySelector('.orb-ask__go');
  go.href = orb.href;
  go.querySelector('span').textContent = t('orbs.ask.continue');
  if (orb.target) {
    go.target = orb.target;
    go.rel = 'noopener';
  } else go.removeAttribute('target');

  dialog.showModal();
  card.focus(); // not Continue: a stray Enter or tap shouldn't send anyone away
  // phones: a card above the row; desktop: beside the jewel (or under it when there's no room)
  if (matchMedia('(max-width: 720px)').matches) {
    dialog.style.left = dialog.style.top = '';
  } else {
    const r = orb.getBoundingClientRect();
    const w = dialog.offsetWidth;
    const h = dialog.offsetHeight;
    let x = r.left - w - 20;
    let y = r.top + r.height / 2 - h / 2;
    if (x < 16) {
      x = r.left + r.width / 2 - w / 2;
      y = r.bottom + 18;
    }
    dialog.style.left = `${Math.max(16, Math.min(innerWidth - w - 16, x))}px`;
    dialog.style.top = `${Math.max(16, Math.min(innerHeight - h - 16, y))}px`;
  }
  const o = orb.getBoundingClientRect();
  const d = dialog.getBoundingClientRect();
  card.style.transformOrigin = `${o.left + o.width / 2 - d.left}px ${o.top + o.height / 2 - d.top}px`;
}

/** Brings a set in (once), on a soft swoosh. */
export function summonOrbs(container, { reduced }) {
  if (container.classList.contains('is-in')) return;
  container.classList.add('is-in');
  sound.summon();
  buzz(5);
  if (!reduced) floatOrbs(container);
}

// lean toward the pointer or tilt, trail behind the scroll
const aim = { x: 0, y: 0 };
addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType !== 'mouse') return;
    aim.x = (e.clientX / innerWidth) * 2 - 1;
    aim.y = (e.clientY / innerHeight) * 2 - 1;
  },
  { passive: true },
);

function floatOrbs(container) {
  let lx = 0, ly = 0, sv = 0, sVel = 0, lastY = scrollY, last = performance.now();
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden || !dt) return;
    const k = 1 - Math.exp(-dt / 0.2);
    lx += ((tilt.active ? tilt.x : aim.x) - lx) * k;
    ly += ((tilt.active ? tilt.y : aim.y) - ly) * k;
    // a springy offset pulled along with the page, then wobbling home
    const v = (scrollY - lastY) / dt;
    lastY = scrollY;
    const target = clamp(-v * 0.01, 14);
    sVel += ((target - sv) * 160 - sVel * 13) * dt;
    sv += sVel * dt;
    container.style.setProperty('--px', lx.toFixed(3));
    container.style.setProperty('--py', ly.toFixed(3));
    container.style.setProperty('--sv', `${sv.toFixed(2)}px`);
  };
  requestAnimationFrame(frame);
}

/** The homepage rail: summoned once, at the first real scroll. */
export function initOrbs({ reduced }) {
  const rail = document.getElementById('orbs');
  const root = document.documentElement;
  renderOrbs(rail, ['instagram', 'facebook', 'whatsapp', 'phone', 'tiktok']);
  const setLabel = () => rail.setAttribute('aria-label', t('orbs.label'));
  setLabel();
  addEventListener('langchange', setLabel);

  const onScroll = () => {
    if (scrollY < SUMMON_AT || root.classList.contains('is-locked')) return;
    removeEventListener('scroll', onScroll);
    summonOrbs(rail, { reduced });
  };
  addEventListener('scroll', onScroll, { passive: true });
}

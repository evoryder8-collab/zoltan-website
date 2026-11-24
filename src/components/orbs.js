// Social icons: Instagram, Facebook, WhatsApp, YouTube and TikTok, small and
// quiet in the nav pill (in the menu below 1200px), each lighting up in its
// platform's colour when pointed at (styles/orbs.css). A tap first asks
// "You're about to visit me on…", so a stray tap never opens an app.
import { CONTACT } from '../config.js';
import { t } from '../i18n/index.js';
import { icon } from '../lib/icons.js';
import { waLink } from '../lib/links.js';

const HREFS = {
  instagram: () => CONTACT.socials.instagram,
  facebook: () => CONTACT.socials.facebook,
  whatsapp: () => waLink(CONTACT.whatsapp, t('contact.topics.booking.wa')),
  youtube: () => CONTACT.socials.youtube,
  tiktok: () => CONTACT.socials.tiktok,
};

/** Fills a container with icons, in `HREFS` order. Labels and links follow the language. */
function renderOrbs(container) {
  container.innerHTML = Object.keys(HREFS)
    .filter((id) => HREFS[id]())
    .map((id) => `<a class="orb orb--${id}" data-orb="${id}" target="_blank" rel="noopener">${icon(id)}<span class="orb__tip" aria-hidden="true"></span></a>`)
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
  go.target = '_blank';
  go.rel = 'noopener';
  go.querySelector('span').textContent = t('orbs.ask.continue');

  dialog.showModal();
  card.focus(); // not Continue: a stray Enter or tap shouldn't send anyone away
  // phones: a card along the bottom; wider: under the icon (over it when there's no room)
  if (matchMedia('(max-width: 720px)').matches) {
    dialog.style.left = dialog.style.top = '';
  } else {
    const r = orb.getBoundingClientRect();
    const w = dialog.offsetWidth;
    const h = dialog.offsetHeight;
    const x = r.left + r.width / 2 - w / 2;
    let y = r.bottom + 36; // room for the badge that sits on the card's top edge
    if (y + h > innerHeight - 16) y = r.top - h - 18;
    dialog.style.left = `${Math.max(16, Math.min(innerWidth - w - 16, x))}px`;
    dialog.style.top = `${Math.max(16, Math.min(innerHeight - h - 16, y))}px`;
  }
  const o = orb.getBoundingClientRect();
  const d = dialog.getBoundingClientRect();
  card.style.transformOrigin = `${o.left + o.width / 2 - d.left}px ${o.top + o.height / 2 - d.top}px`;
}

/** The icons in the nav pill and the phone menu. */
export function initOrbs() {
  document.querySelectorAll('.follow').forEach(renderOrbs);
}

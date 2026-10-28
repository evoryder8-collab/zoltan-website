// /linkinbio: the page Zoltan's social profiles link to. One screen of who he
// is (live liquid, laurel, his gold light), every way to reach him in platform-
// tinted glass, a booking sheet that asks where and then opens WhatsApp or the
// dialler, the film in its own frame, and the studios on the homepage's 3D map.
// It shares the homepage's systems (silk, sound, ribbon, jewels, map).
import '@fontsource-variable/bodoni-moda';
import '@fontsource-variable/manrope';
import './styles/base.css';
import './styles/glass.css';
import './styles/shell.css';
import './styles/orbs.css';
import './styles/maps.css';
import './styles/bio.css';

import hu from './i18n/hu.js';
import en from './i18n/en.js';
import { registerDictionaries, setLang, storedLang, getLang, t } from './i18n/index.js';
import { detectLang } from './lib/lang.js';
import { CONTACT, LOCATIONS, TREATMENT } from './config.js';
import { fillIcons, icon } from './lib/icons.js';
import { drawLaurelSvg } from './lib/laurel.js';
import { esc, initReveals } from './lib/dom.js';
import { initGlass } from './lib/glass.js';
import { initSilk } from './lib/silk.js';
import { mountAura } from './lib/aura.js';
import { sound } from './lib/audio.js';
import { whenNear } from './lib/lazy.js';
import { tilt, initTilt, buzz } from './lib/tilt.js';
import { mountRibbon } from './lib/ribbon.js';
import { waLink, telLink, mailLink } from './lib/links.js';
import { renderOrbs, summonOrbs } from './components/orbs.js';
import { initStudioSwitch } from './components/sections.js';
import { initDirections } from './components/directions.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const $ = (s) => document.querySelector(s);
const IMG = '../img/';

registerDictionaries({ hu, en });
setLang(detectLang({ search: location.search, stored: storedLang(), languages: navigator.languages }), { persist: false });
const money = (n) => `${new Intl.NumberFormat(getLang() === 'hu' ? 'hu-HU' : 'en-GB').format(n)}\u00a0${t('treatments.currency')}`;
const fromPrice = () => money(Math.min(...LOCATIONS.map((l) => l.price)));

// ── the cards: [id, tone, icon, href | action, extras] ──
const CARDS = {
  'links-contact': [
    { id: 'whatsapp', href: () => waLink(CONTACT.whatsapp, t('contact.topics.booking.wa')), away: true },
    { id: 'phone', href: () => telLink(CONTACT.phone) },
    { id: 'mail', href: () => mailLink(CONTACT.email, t('contact.topics.booking.subject')) },
    { id: 'vcard', icon: 'contact', href: () => '../zoltan-kodor.vcf', download: 'Zoltan-Kodor.vcf' },
    { id: 'share', icon: 'share', action: 'share' },
  ],
  'links-follow': [
    { id: 'instagram', href: () => CONTACT.socials.instagram, away: true, art: 'g-overall-lifted-800.webp', fx: 62 },
    { id: 'tiktok', href: () => CONTACT.socials.tiktok, away: true, art: 'g-freestyle-award-800.webp', fx: 50 },
    { id: 'youtube', href: () => CONTACT.socials.youtube, away: true, art: '../media/film-cover.jpg', fx: 50 },
    { id: 'facebook', href: () => CONTACT.socials.facebook, away: true, art: 'g-medal-flag-800.webp', fx: 57 },
  ],
  'links-site': [
    { id: 'treatment', tone: 'site', icon: 'spark', href: () => '../#treatments', art: 'g-at-the-table-800.webp', fx: 46 },
    { id: 'champs', tone: 'site', icon: 'trophy', href: () => '../#championships', art: 'g-trophy-800.webp', fx: 42 },
    { id: 'recognition', tone: 'site', icon: 'star', href: () => '../#recognition', art: 'award-judges-640.webp', fx: 50 },
    { id: 'gallery', tone: 'site', icon: 'image', href: () => '../#gallery', art: 'g-stones-800.webp', fx: 50 },
    { id: 'training', tone: 'site', icon: 'cap', href: () => '../#training', art: 'g-explaining-800.webp', fx: 40 },
  ],
};

function renderCards() {
  for (const [list, cards] of Object.entries(CARDS)) {
    document.getElementById(list).innerHTML = cards
      .filter((c) => c.action || c.href())
      .map((c) => {
        const tone = c.tone || c.id;
        const ic = c.icon || c.id;
        const [eyebrow, title, detail] = t(`bio.cards.${c.id}`);
        const art = c.art
          ? `<span class="link__art"><img src="${c.art.startsWith('..') ? c.art : IMG + c.art}" alt="" loading="lazy" decoding="async" style="object-position:${c.fx}% 30%" /></span>`
          : `<span class="link__art link__art--icon">${icon(ic)}</span>`;
        const inner = `
          <span class="link__wash" aria-hidden="true"></span>${art}
          <span class="link__mark orb--${tone}" aria-hidden="true"><span class="orb__gem">${icon(ic)}</span></span>
          <span class="link__copy"><span class="link__eyebrow">${esc(eyebrow)}</span><strong class="link__title">${esc(title)}</strong>${detail ? `<small class="link__detail">${esc(detail)}</small>` : ''}</span>
          <span class="link__go" aria-hidden="true">${icon(c.action === 'share' ? 'share' : 'go')}</span>`;
        const attrs = `class="link glass" data-tone="${tone}" data-card="${c.id}" data-reveal`;
        if (c.action) return `<button type="button" ${attrs} data-action="${c.action}">${inner}</button>`;
        const away = c.away ? ' target="_blank" rel="noopener"' : '';
        const dl = c.download ? ` download="${c.download}"` : '';
        return `<a ${attrs} href="${esc(c.href())}"${away}${dl}>${inner}</a>`;
      })
      .join('');
  }
}

function renderName() {
  const first = t('name.first');
  $('.me__name').innerHTML = `<span class="me__first">${esc(first.slice(0, 4))}<em>${esc(first.slice(4, 5))}</em>${esc(first.slice(5))}</span><span class="me__last">${esc(t('name.last'))}</span>`;
}

function renderTicker() {
  const set = t('ticker').map((s) => `<span class="ticker__item">${esc(s)}<span class="leaf" aria-hidden="true"></span></span>`).join('');
  const half = `<span class="ticker__set">${set}${set}</span>`;
  $('.ticker__track').innerHTML = half + half.replace('class="ticker__set"', 'class="ticker__set" aria-hidden="true"');
}

function renderBook() {
  $('.book__detail').textContent = t('bio.bookDetail', { price: fromPrice() });
  // the invitation, word by word, so each can rise and gleam in turn
  $('#book-invite').innerHTML = t('bio.bookInvite')
    .split(' ')
    .map((w, i) => `<span style="--i:${i}">${esc(w)}</span>`)
    .join(' ');
}

function renderPlaces() {
  $('#places').innerHTML = LOCATIONS.map(
    (loc) => `
    <article class="place glass" data-reveal>
      <p class="place__name">${icon('pin')}<span>${esc(t(`locations.${loc.id}.name`))}</span></p>
      <p class="place__price">${esc(money(loc.price))}<small>${esc(t('treatments.duration', { n: TREATMENT.minutes }))}</small></p>
      <p class="place__addr">${esc(t(`locations.${loc.id}.address`))}</p>
      <div class="place__actions">
        <button type="button" class="place__btn" data-copy="${esc(t(`locations.${loc.id}.address`))}">${icon('copy')}<span>${esc(t('bio.copy'))}</span></button>
        <button type="button" class="place__btn" data-show="${loc.id}">${icon('nav')}<span>${esc(t('bio.showMap'))}</span></button>
      </div>
    </article>`,
  ).join('');
}

function renderSwitch() {
  const current = document.querySelector('#studio-switch [aria-selected="true"]')?.dataset.studio || LOCATIONS[0].id;
  $('#studio-switch').innerHTML = LOCATIONS.map(
    (loc) => `<button type="button" role="tab" data-studio="${loc.id}" aria-selected="${loc.id === current}">${esc(t(`locations.${loc.id}.name`))}</button>`,
  ).join('');
}

const syncTitle = () => {
  document.title = t('bio.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('bio.description'));
};

// ── static markup ──
document.querySelectorAll('svg.laurel-svg').forEach((svg) => drawLaurelSvg(svg));
const mark = $('.bar__mark');
drawLaurelSvg(mark, { radius: 34, pairs: 6, stroke: 2.2 });
mark.classList.add('laurel-svg', 'is-static');
mark.insertAdjacentHTML('beforeend', '<text x="-1" y="11" text-anchor="middle" fill="var(--pearl)" font-family="Bodoni Moda Variable, Georgia, serif" font-size="31" font-style="italic" letter-spacing="-1">ZK</text>');
renderName();
renderTicker();
renderBook();
renderCards();
renderPlaces();
renderSwitch();
renderOrbs($('#jewels'), ['instagram', 'tiktok', 'whatsapp', 'youtube', 'facebook']);
const labelJewels = () => $('#jewels').setAttribute('aria-label', t('bio.jewels'));
labelJewels();
addEventListener('langchange', labelJewels);
fillIcons();
syncTitle();

// ── shared systems ──
const silk = initSilk($('#silk'), { reduced });
const glass = initGlass();
const reveals = initReveals({ reduced });
const ribbon = mountRibbon($('.ticker'), $('.ticker__track'), '.ticker__set');
initTilt();
if (!root.classList.contains('no-webgl')) {
  try {
    mountAura($('.me__aura canvas'), { reduced });
  } catch (err) {
    console.warn('[aura] skipped', err);
  }
}

addEventListener('langchange', () => {
  syncTitle();
  renderName();
  renderTicker();
  ribbon.refresh();
  renderBook();
  renderCards();
  renderPlaces();
  renderSwitch();
  fillIcons();
  reveals.observe(document.querySelectorAll('.links [data-reveal], #places [data-reveal]'));
  glass.track();
  if (!root.classList.contains('is-arriving')) $('#book-invite').classList.add('is-on');
});
reveals.observe(document.querySelectorAll('.links [data-reveal], #places [data-reveal]'));
glass.track();

// ── language and sound ──
const langBtns = document.querySelectorAll('.langswitch button');
const syncLang = () => langBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === getLang()));
langBtns.forEach((b) => b.addEventListener('click', () => b.dataset.lang !== getLang() && setLang(b.dataset.lang)));
addEventListener('langchange', syncLang);
syncLang();

const st = $('.sound-toggle');
st.hidden = !sound.supported;
const syncSound = () => {
  st.setAttribute('aria-pressed', sound.enabled);
  st.setAttribute('aria-label', t(sound.enabled ? 'a11y.soundOff' : 'a11y.soundOn'));
};
st.addEventListener('click', () => {
  sound.enable(!sound.enabled);
  sound.tap();
});
addEventListener('soundchange', syncSound);
addEventListener('langchange', syncSound);
syncSound();
// sound was on last time: it comes back with the first tap (browsers need one)
sound.restore();

// ── touch: the silk ripples, taps click, hovers tick ──
addEventListener('pointerdown', (e) => {
  silk.ripple(e.clientX, e.clientY);
  if (!e.target.closest('a, button, .studio, .ticker')) sound.ripple(e.clientX / innerWidth - 0.5);
}, { passive: true });
document.addEventListener('click', (e) => {
  if (e.target.closest('a, button')) {
    sound.tap();
    buzz(6);
  }
});
document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'mouse' && e.target.closest('a, button') && !e.relatedTarget?.closest?.('a, button')) sound.hover();
});

// ── cards lean toward the pointer (or the phone's tilt) ──
const LEANS = '.link, .book__card, .place';
document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const card = e.target.closest(LEANS);
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--lx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
  card.style.setProperty('--ly', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
}, { passive: true });
document.addEventListener('pointerout', (e) => {
  const card = e.target.closest?.(LEANS);
  if (card && !card.contains(e.relatedTarget)) {
    card.style.removeProperty('--lx');
    card.style.removeProperty('--ly');
  }
});
if (!reduced) {
  const follow = () => {
    requestAnimationFrame(follow);
    if (!tilt.active) return;
    root.style.setProperty('--tilt-x', tilt.x.toFixed(3));
    root.style.setProperty('--tilt-y', tilt.y.toFixed(3));
    glass.light(tilt.x, tilt.y);
  };
  requestAnimationFrame(follow);
}

// ── copy, share and the toast ──
const toastEl = $('#toast');
let toastTimer = 0;
const toast = (msg) => {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 1900);
};
async function copy(text, msg = t('bio.copied')) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(msg);
}
const pageUrl = () => location.href.split(/[?#]/)[0];
document.addEventListener('click', (e) => {
  const share = e.target.closest('[data-action="share"]');
  if (share) {
    if (navigator.share) navigator.share({ title: t('bio.title'), text: t('bio.shareText'), url: pageUrl() }).catch(() => {});
    else copy(pageUrl(), t('bio.linkCopied'));
    return;
  }
  const c = e.target.closest('[data-copy]');
  if (c) return copy(c.dataset.copy);
  const show = e.target.closest('[data-show]');
  if (show) {
    document.querySelector(`#studio-switch [data-studio="${show.dataset.show}"]`)?.click();
    $('.studio').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }
});

// ── the booking sheet: where, then WhatsApp or a call ──
const sheet = $('#book-sheet');
const sheetCard = sheet.querySelector('.sheet__card');
let place = LOCATIONS[0].id;
function renderSheet() {
  $('#sheet-places').innerHTML = LOCATIONS.map(
    (loc) => `
    <button type="button" class="sheet__place" role="radio" aria-checked="${loc.id === place}" data-place="${loc.id}">
      <span class="sheet__place-name">${esc(t(`locations.${loc.id}.name`))}</span>
      <span class="sheet__place-addr">${esc(t(`locations.${loc.id}.address`))}</span>
      <span class="sheet__place-price">${esc(money(loc.price))}</span>
    </button>`,
  ).join('');
  $('#sheet-wa').href = waLink(CONTACT.whatsapp, t('treatments.waText', { where: t(`locations.${place}.in`) }));
  $('#sheet-call').href = telLink(CONTACT.phone);
}
renderSheet();
addEventListener('langchange', renderSheet);
$('#sheet-places').addEventListener('click', (e) => {
  const b = e.target.closest('[data-place]');
  if (!b) return;
  place = b.dataset.place;
  renderSheet();
  buzz(5);
});
const closeSheet = () => {
  if (!sheet.open || sheet.classList.contains('is-leaving')) return;
  sheet.classList.add('is-leaving');
  setTimeout(() => {
    sheet.close();
    sheet.classList.remove('is-leaving');
    sheetCard.style.transform = '';
  }, 260);
};
$('#book-open').addEventListener('click', () => {
  sheet.showModal();
  sheetCard.focus();
  sound.whoosh(0.8);
});
sheet.addEventListener('click', (e) => {
  if (e.target === sheet || e.target.closest('[data-close]')) closeSheet();
  else if (e.target.closest('.sheet__wa, .sheet__call')) setTimeout(closeSheet, 350);
});
sheet.addEventListener('cancel', (e) => {
  e.preventDefault();
  closeSheet();
});
// pull it down to let it go
{
  let y0 = null;
  let dy = 0;
  let t0 = 0;
  sheetCard.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a') || !matchMedia('(max-width: 720px)').matches) return;
    y0 = e.clientY;
    dy = 0;
    t0 = performance.now();
    sheetCard.setPointerCapture(e.pointerId);
    sheetCard.style.transition = 'none';
  });
  sheetCard.addEventListener('pointermove', (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    sheetCard.style.transform = `translateY(${dy}px)`;
  });
  const end = () => {
    if (y0 === null) return;
    y0 = null;
    sheetCard.style.transition = '';
    const fast = dy / Math.max(1, performance.now() - t0) > 0.6;
    if (dy > 110 || (fast && dy > 30)) closeSheet();
    else sheetCard.style.transform = '';
  };
  sheetCard.addEventListener('pointerup', end);
  sheetCard.addEventListener('pointercancel', end);
}

// ── the film: a tap plays it with sound; it stops when scrolled away ──
{
  const reel = $('.reel');
  const v = reel.querySelector('video');
  const bar = reel.querySelector('.reel__track i');
  const time = reel.querySelector('.reel__time');
  const soundBtn = reel.querySelector('.reel__sound');
  whenNear(reel, () => {
    v.src = '../media/film-720.mp4';
    v.preload = 'metadata';
  }, '700px');
  const toggleBtn = reel.querySelector('.reel__toggle');
  const sync = () => {
    toggleBtn.innerHTML = icon(v.paused ? 'play' : 'pause');
    toggleBtn.setAttribute('aria-label', t(v.paused ? 'bio.film.play' : 'bio.film.pause'));
    reel.classList.toggle('is-playing', !v.paused);
    reel.classList.toggle('is-started', !v.paused || v.currentTime > 0);
    soundBtn.setAttribute('aria-pressed', !v.muted);
    soundBtn.classList.toggle('is-muted', v.muted);
    soundBtn.setAttribute('aria-label', t(v.muted ? 'film.soundOff' : 'film.soundOn'));
    sound.duck(!v.paused && !v.muted, 'reel');
  };
  const toggle = () => {
    if (v.paused) {
      if (!v.src) v.src = '../media/film-720.mp4';
      v.muted = false;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    } else v.pause();
  };
  reel.querySelector('.reel__play').addEventListener('click', toggle);
  reel.querySelector('.reel__toggle').addEventListener('click', toggle);
  v.addEventListener('click', toggle);
  soundBtn.addEventListener('click', () => {
    v.muted = !v.muted;
    sync();
  });
  reel.querySelector('.reel__full').addEventListener('click', () => {
    if (v.webkitEnterFullscreen && !document.fullscreenEnabled) return v.webkitEnterFullscreen();
    const el = reel.querySelector('.reel__screen');
    (el.requestFullscreen?.() || el.webkitRequestFullscreen?.())?.catch?.(() => {});
  });
  ['play', 'pause', 'volumechange'].forEach((ev) => v.addEventListener(ev, sync));
  v.addEventListener('ended', () => {
    v.currentTime = 0;
    sync();
  });
  v.addEventListener('timeupdate', () => {
    if (!v.duration) return;
    bar.style.transform = `scaleX(${(v.currentTime / v.duration).toFixed(4)})`;
    const left = Math.max(0, Math.round(v.duration - v.currentTime));
    time.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  });
  new IntersectionObserver(([e]) => !e.isIntersecting && !v.paused && v.pause(), { threshold: 0.25 }).observe(reel);
  addEventListener('langchange', sync);
  sync();
}

// ── the studios: the homepage's map, loaded as it comes near ──
initStudioSwitch();
initDirections(LOCATIONS);
whenNear($('#studio-map'), () => {
  import('./components/studio-map.js')
    .then((m) => m.mountStudioMap($('#studio-map'), { locations: LOCATIONS, reduced }))
    .catch((err) => {
      console.warn('[studio map] unavailable', err);
      $('.studio').classList.add('is-fallback');
    });
}, '1400px');

// ── arrival: the laurel draws, the seam opens, everything rises in ──
function arrive() {
  const el = $('.arrival');
  let seen = false;
  try {
    seen = sessionStorage.getItem('zoltan.bio') === '1';
    sessionStorage.setItem('zoltan.bio', '1');
  } catch {}
  return new Promise((done) => {
    const finish = () => {
      root.classList.remove('is-arriving');
      el.classList.add('is-open');
      setTimeout(() => {
        el.remove();
        done();
      }, reduced || seen ? 0 : 1100);
    };
    if (reduced || seen) return finish();
    el.querySelector('.arrival__laurel').classList.add('is-drawn');
    const timers = [
      setTimeout(() => el.classList.add('is-line'), 450),
      setTimeout(() => {
        silk.ripple(innerWidth / 2, innerHeight / 2);
        silk.flare?.();
        sound.reveal();
        finish();
      }, 1650),
    ];
    // a tap skips it
    el.addEventListener('pointerdown', () => {
      timers.forEach(clearTimeout);
      finish();
    }, { once: true });
  });
}

arrive().then(() => {
  $('.me__laurel').classList.add(reduced ? 'is-static' : 'is-drawn');
  $('#book-invite').classList.add('is-on');
  setTimeout(() => summonOrbs($('#jewels'), { reduced }), reduced ? 0 : 450);
  // arriving with #studios (or another anchor) in the link
  if (location.hash.length > 1) document.getElementById(location.hash.slice(1))?.scrollIntoView();
});

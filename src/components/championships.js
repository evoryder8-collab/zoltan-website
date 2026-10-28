// Championship cards, the medal toy and the globe. The cards drive the globe.
import { EVENTS, HOME } from '../config.js';
import { t } from '../i18n/index.js';
import { icon } from '../lib/icons.js';
import { esc } from '../lib/dom.js';
import { whenNear } from '../lib/lazy.js';
import { drawLaurelSvg } from '../lib/laurel.js';
import { sound } from '../lib/audio.js';

const isPlaceholder = (s) => /^\[.*\]$/.test(s.trim());
let globe = null;
let active = null;

export function renderEvents() {
  document.getElementById('event-cards').innerHTML = EVENTS.map((e) => {
    const k = `champs.events.${e.id}`;
    const titles = t(`${k}.titles`)
      .map((ti) => `<li class="event__title${e.featured && !isPlaceholder(ti) ? ' is-win' : ''}">${esc(ti)}</li>`)
      .join('');
    const go = e.lngLat
      ? `<button type="button" class="event__go" data-event="${e.id}">${icon('globe')}<span>${esc(t('champs.viewOnGlobe'))}</span></button>`
      : `<button type="button" class="event__go" disabled>${icon('pin')}<span>${esc(t('champs.noLocation'))}</span></button>`;
    return `
      <li class="event glass${e.featured ? ' is-featured' : ''}${active === e.id ? ' is-active' : ''}" data-reveal>
        <p class="event__meta"><span>${icon('clock')}<span>${esc(t(`${k}.date`))}</span></span><span>${icon('pin')}<span>${esc(t(`${k}.place`))}</span></span></p>
        <h3 class="event__name">${esc(t(`${k}.name`))}</h3>
        <ul class="event__titles">${titles}</ul>
        ${go}
      </li>`;
  }).join('');
}

export function initChampionships({ reduced, lenis, onFail }) {
  // phones turn the globe with a sideways swipe; say so
  const hint = document.querySelector('.globe__hint [data-i18n]');
  if (hint && matchMedia('(pointer: coarse)').matches) {
    hint.setAttribute('data-i18n', 'globe.hintTouch');
    hint.textContent = t('globe.hintTouch');
  }

  // cards → globe
  document.getElementById('event-cards').addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-event]');
    if (!btn) return;
    active = btn.dataset.event;
    document.querySelectorAll('.event').forEach((li) => li.classList.toggle('is-active', li.contains(btn)));
    const frame = document.querySelector('.globe');
    if (lenis) lenis.scrollTo(frame, { offset: -110, duration: 1.2 });
    else frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
    sound.tap();
    (await globe)?.flyTo(active);
  });

  // medal
  const medal = document.querySelector('.medal__canvas');
  const medalFallback = () => {
    medal.innerHTML = '<svg class="laurel-svg is-static" viewBox="-120 -120 240 240" aria-hidden="true" style="color:#e0b56d;width:70%;margin:15% auto 0;display:block"></svg>';
    drawLaurelSvg(medal.querySelector('svg'));
    document.querySelector('.medal__hint').hidden = true;
  };
  whenNear(medal, () => {
    if (document.documentElement.classList.contains('no-webgl')) return medalFallback();
    import('./medal3d.js')
      .then((m) => m.mountMedal(medal, { reduced }))
      .catch((err) => {
        console.warn('[medal] fallback', err);
        medalFallback();
      });
  });

  // globe
  const map = document.getElementById('globe');
  whenNear(map, () => {
    globe = import('./globe.js')
      .then((m) => m.mountGlobe(map, { events: EVENTS, home: HOME, reduced }))
      .catch((err) => {
        console.warn('[globe] unavailable', err);
        onFail?.(map.closest('.globe'));
        return null;
      });
  }, '1600px');
}

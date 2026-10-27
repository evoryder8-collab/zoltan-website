// "Bring me here": directions to the selected studio. On phones it offers
// Google Maps or Apple Maps in a small glass sheet.
import { t } from '../i18n/index.js';
import { icon } from '../lib/icons.js';
import { sound } from '../lib/audio.js';

const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
const PHONE = matchMedia('(max-width: 900px), (pointer: coarse)');

export const directions = (loc, provider) =>
  provider === 'apple'
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(loc.query)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.query)}`;

export function initDirections(locations) {
  const go = document.getElementById('studio-go');
  let current = locations[0];
  const note = document.querySelector('.studio__note span:last-child');
  const set = () => {
    go.href = directions(current, isApple ? 'apple' : 'google');
    note.textContent = t(`locations.${current.id}.address`);
  };
  set();
  addEventListener('langchange', set);
  addEventListener('studiochange', (e) => {
    current = locations.find((l) => l.id === e.detail.id) || current;
    set();
  });

  let sheet = null;
  go.addEventListener('click', (e) => {
    if (!PHONE.matches) return;
    e.preventDefault();
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'maps-sheet';
      sheet.hidden = true;
      sheet.innerHTML = `
        <div class="maps-sheet__scrim" data-close></div>
        <div class="maps-sheet__card glass" role="dialog" aria-modal="true" aria-labelledby="maps-sheet-title" tabindex="-1">
          <h3 class="maps-sheet__title" id="maps-sheet-title"></h3>
          <a class="btn btn--crimson" data-app="google" target="_blank" rel="noopener"></a>
          <a class="btn btn--glass glass" data-app="apple" target="_blank" rel="noopener"></a>
          <button type="button" class="btn btn--glass glass" data-close></button>
        </div>`;
      document.body.append(sheet);
      sheet.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-close]') || ev.target.closest('[data-app]')) {
          sound.tap();
          setTimeout(() => (sheet.hidden = true), 150);
        }
      });
      addEventListener('keydown', (ev) => ev.key === 'Escape' && (sheet.hidden = true));
    }
    sheet.querySelector('.maps-sheet__title').textContent = `${t('contact.map.directions')} · ${t(`locations.${current.id}.name`)}`;
    const g = sheet.querySelector('[data-app="google"]');
    const a = sheet.querySelector('[data-app="apple"]');
    g.href = directions(current, 'google');
    a.href = directions(current, 'apple');
    g.innerHTML = `${icon('external')}<span>${t('contact.map.google')}</span>`;
    a.innerHTML = `${icon('external')}<span>${t('contact.map.apple')}</span>`;
    sheet.querySelector('button[data-close]').textContent = t('contact.map.cancel');
    sheet.hidden = false;
    sheet.querySelector('.maps-sheet__card').focus();
  });
}

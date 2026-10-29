// The next championship, as an update under the hero on both pages, with
// where things stand worked out from today's date: starting in a few days,
// under way, then results to follow. Its words are in i18n under next.
import { NEXT } from '../config.js';
import { t } from '../i18n/index.js';

// midnight, local time, so a day is a day wherever the visitor is
const day = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function phase() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((day(NEXT.start) - today) / 864e5);
  if (days > 1) return ['soon', t('next.soon', { n: days })];
  if (days === 1) return ['soon', t('next.tomorrow')];
  if (days === 0) return ['live', t('next.today')];
  if (today <= day(NEXT.end)) return ['live', t('next.live')];
  return ['after', t('next.after')];
}

export function initNext() {
  const el = document.querySelector('.next__status');
  if (!el) return;
  const render = () => {
    const [p, text] = phase();
    el.dataset.phase = p;
    el.textContent = text;
  };
  render();
  addEventListener('langchange', render);
}

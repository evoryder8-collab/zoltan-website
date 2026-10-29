// The booking terms: cancellations, missed appointments and the rest, in a
// dialog that any [data-terms] button opens, on both pages.
import { t } from '../i18n/index.js';
import { icon } from '../lib/icons.js';
import { esc } from '../lib/dom.js';

export function initTerms() {
  // data-lenis-prevent: the terms scroll by themselves, not the page
  document.body.insertAdjacentHTML('beforeend', '<dialog class="terms" id="terms" aria-labelledby="terms-title"><div class="terms__card" tabindex="-1" data-lenis-prevent></div></dialog>');
  const dialog = document.getElementById('terms');
  const card = dialog.firstElementChild;
  const render = () => {
    card.innerHTML = `
      <button type="button" class="terms__close" aria-label="${esc(t('terms.close'))}">${icon('close')}</button>
      <p class="terms__kicker">Z-Wellness · Kódor Zoltán e.v.</p>
      <h2 class="terms__title" id="terms-title">${esc(t('terms.title'))}</h2>
      <p class="terms__intro">${esc(t('terms.intro'))}</p>
      ${t('terms.sections')
        .map(([h, p, key]) => `<section class="terms__item${key ? ' terms__item--key' : ''}"><h3>${esc(h)}</h3><p>${esc(p)}</p></section>`)
        .join('')}
      <p class="terms__updated">${esc(t('terms.updated'))}</p>`;
  };
  render();
  addEventListener('langchange', render);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-terms]')) {
      dialog.showModal();
      card.scrollTop = 0;
      card.focus();
    } else if (e.target === dialog || e.target.closest('.terms__close')) dialog.close();
  });
}

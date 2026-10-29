// The content sections that are plain markup: about stats, the treatment,
// training, contact and every booking link on the page. Everything re-renders
// when the language changes.
import { CONTACT, TREATMENT, LOCATIONS, SIGNATURE } from '../config.js';
import { t } from '../i18n/index.js';
import { waLink, telLink, mailLink } from '../lib/links.js';
import { icon } from '../lib/icons.js';
import { esc } from '../lib/dom.js';
import { eur, huf } from '../lib/price.js';

let topic = 'booking';
let studio = LOCATIONS[0].id;

export function renderSections() {
  // about
  document.getElementById('stats').innerHTML = t('about.stats')
    .map(([v, l]) => `<li class="stat glass" data-reveal><span class="stat__value">${esc(v)}</span><span class="stat__label">${esc(l)}</span></li>`)
    .join('');

  // the treatment: steps, prices per location, the signature experience, the toolkit
  document.getElementById('treatment-steps').innerHTML = t('treatments.steps')
    .map(([h, p], i) => `<li class="step glass" data-reveal><span class="step__n">0${i + 1}</span><h3 class="step__title">${esc(h)}</h3><p class="step__text">${esc(p)}</p></li>`)
    .join('');
  document.getElementById('treatment-duration').textContent = t('treatments.duration', { n: TREATMENT.minutes });
  document.getElementById('treatment-prices').innerHTML = LOCATIONS.map((loc) => {
    const where = t(`locations.${loc.id}.in`);
    const href = waLink(CONTACT.whatsapp, t('treatments.waText', { where }));
    return `
      <article class="price glass" data-reveal>
        <p class="price__place">${icon('pin')}${esc(t(`locations.${loc.id}.name`))}</p>
        <p class="price__label">${esc(t('treatments.priceLabel'))}</p>
        <p class="price__value">${esc(eur(loc.price))}${hufLine(loc.price)}</p>
        <a class="btn btn--crimson btn--sm" href="${esc(href)}" target="_blank" rel="noopener">${icon('whatsapp')}${esc(t('treatments.book', { where }))}</a>
      </article>`;
  }).join('') + `
      <article class="price price--signature glass" data-reveal>
        <p class="price__new">${esc(t('signature.new'))}</p>
        <h3 class="price__name">${esc(t('signature.name'))}</h3>
        <p class="price__kind">${esc(t('signature.kind'))}</p>
        <p class="price__pitch">${esc(t('signature.pitch'))}</p>
        <ul class="price__points">${t('signature.points').map((p) => `<li>${icon('check')}<span>${esc(p)}</span></li>`).join('')}</ul>
        <div class="price__deal">
          <div>
            <p class="price__label">${esc(t('signature.duration'))}</p>
            <p class="price__value">${esc(eur(SIGNATURE.price))}${hufLine(SIGNATURE.price)}</p>
          </div>
          <a class="btn btn--crimson btn--sm" href="${esc(waLink(CONTACT.whatsapp, t('signature.waText')))}" target="_blank" rel="noopener">${icon('whatsapp')}${esc(t('signature.book'))}</a>
        </div>
      </article>`;
  document.getElementById('toolkit').innerHTML = t('treatments.methods')
    .map(([name, detail], i) => `<li class="tool"><span class="tool__n">${String(i + 1).padStart(2, '0')}</span><span class="tool__name">${esc(name)}</span>${detail ? `<span class="tool__detail">${esc(detail)}</span>` : ''}</li>`)
    .join('');

  // training
  document.getElementById('training-points').innerHTML = t('training.points').map((p) => `<li>${icon('check')}<span>${esc(p)}</span></li>`).join('');
  document.querySelector('[data-wa-training]').href = waLink(CONTACT.whatsapp, t('training.waText'));

  // contact topics
  const topics = Object.keys(t('contact.topics'));
  document.getElementById('topics').innerHTML = topics
    .map((k) => `<button type="button" role="radio" class="topic" data-topic="${k}" aria-checked="${k === topic}" tabindex="${k === topic ? 0 : -1}">${esc(t(`contact.topics.${k}.label`))}</button>`)
    .join('');
  updateTopic();

  // contact: one row per location
  const list = document.getElementById('contact-list');
  list.querySelectorAll('.loc-row').forEach((r) => r.remove());
  list.insertAdjacentHTML(
    'beforeend',
    LOCATIONS.map((loc) => `<div class="loc-row"><dt>${esc(t(`locations.${loc.id}.name`))}</dt><dd>${esc(t(`locations.${loc.id}.address`))}</dd></div>`).join(''),
  );

  // studio map switch
  document.getElementById('studio-switch').innerHTML = LOCATIONS.map(
    (loc) => `<button type="button" role="tab" data-studio="${loc.id}" aria-selected="${loc.id === studio}">${esc(t(`locations.${loc.id}.name`))}</button>`,
  ).join('');

  // socials
  document.getElementById('socials').innerHTML = Object.entries(CONTACT.socials)
    .filter(([, url]) => url)
    .map(([k, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${k}">${icon(k)}</a></li>`)
    .join('');

  wireLinks();
}

// the forint price beneath the euros, in Hungarian only
const hufLine = (price) => (huf(price) ? `<span class="price__huf">${esc(t('treatments.inForints', { price: huf(price) }))}</span>` : '');

function updateTopic() {
  document.getElementById('topic-wa').href = waLink(CONTACT.whatsapp, t(`contact.topics.${topic}.wa`));
  document.getElementById('topic-mail').href = mailLink(CONTACT.email, t(`contact.topics.${topic}.subject`));
}

export function wireLinks() {
  const wa = waLink(CONTACT.whatsapp, t('contact.topics.booking.wa'));
  document.querySelectorAll('[data-wa]').forEach((a) => (a.href = wa));
  document.querySelectorAll('[data-wa-text]').forEach((a) => (a.textContent = CONTACT.whatsapp));
  document.querySelectorAll('[data-tel]').forEach((a) => (a.href = telLink(CONTACT.phone)));
  document.querySelectorAll('[data-tel-text]').forEach((a) => (a.textContent = CONTACT.phone));
  document.querySelectorAll('[data-mail]').forEach((a) => (a.href = mailLink(CONTACT.email, t('contact.topics.booking.subject'))));
  document.querySelectorAll('[data-mail-text]').forEach((a) => (a.textContent = CONTACT.email));
}

export function initStudioSwitch() {
  document.getElementById('studio-switch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-studio]');
    if (!b || b.dataset.studio === studio) return;
    studio = b.dataset.studio;
    b.parentElement.querySelectorAll('[data-studio]').forEach((x) => x.setAttribute('aria-selected', x === b));
    dispatchEvent(new CustomEvent('studiochange', { detail: { id: studio } }));
  });
}

export function initTopics({ sound }) {
  const group = document.getElementById('topics');
  const select = (btn) => {
    topic = btn.dataset.topic;
    group.querySelectorAll('.topic').forEach((b) => {
      const on = b === btn;
      b.setAttribute('aria-checked', on);
      b.tabIndex = on ? 0 : -1;
    });
    updateTopic();
  };
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.topic');
    if (btn) select(btn);
  });
  group.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const all = [...group.querySelectorAll('.topic')];
    const i = all.findIndex((b) => b.dataset.topic === topic);
    const next = all[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length];
    select(next);
    next.focus();
    sound.tap();
  });
}

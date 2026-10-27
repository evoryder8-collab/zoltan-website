// Nav pill (sections, HU/EN, sound, book), the booking dock and anchor scrolling.
import { setLang, getLang, t } from '../i18n/index.js';
import { sound } from '../lib/audio.js';
import { drawLaurelSvg } from '../lib/laurel.js';

export function initNav({ lenis }) {
  const nav = document.getElementById('nav');
  const mark = nav.querySelector('.nav__mark');
  drawLaurelSvg(mark, { radius: 34, pairs: 6, stroke: 2.2 });
  mark.classList.add('laurel-svg', 'is-static');
  mark.insertAdjacentHTML('beforeend', '<text x="0" y="13" text-anchor="middle" fill="var(--pearl)" font-family="Bodoni Moda Variable, Georgia, serif" font-size="40" font-style="italic">Z</text>');

  // language
  const langBtns = nav.querySelectorAll('.langswitch button');
  const syncLang = () => langBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === getLang()));
  langBtns.forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.lang !== getLang()) setLang(b.dataset.lang);
    }),
  );
  addEventListener('langchange', syncLang);
  syncLang();

  // sound
  const st = nav.querySelector('.sound-toggle');
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

  // anchors: smooth via Lenis when it's running
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(id === 'top' ? 0 : target, { offset: -84, duration: 1.4 });
    else target.scrollIntoView({ behavior: 'smooth' });
    history.replaceState(history.state, '', `${location.search}#${id}`);
  });

  // highlight the section in view
  const links = new Map([...nav.querySelectorAll('.nav__links a')].map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a, id) => a.classList.toggle('is-active', id === e.target.id));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  ['about', 'treatments', 'championships', 'gallery', 'training', 'contact'].forEach((id) => io.observe(document.getElementById(id)));

  return {
    show() {
      nav.classList.add('is-in');
      document.getElementById('dock').classList.add('is-in');
    },
  };
}

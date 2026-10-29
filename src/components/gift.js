// The gift voucher, on both pages: its points, its value in the visitor's own
// currency (forints on the Hungarian site, euros on the English one), the
// request on WhatsApp, and the engraved 3D card, loaded as it comes near.
import { CONTACT, GIFT } from '../config.js';
import { t } from '../i18n/index.js';
import { waLink } from '../lib/links.js';
import { icon } from '../lib/icons.js';
import { esc } from '../lib/dom.js';
import { drawLaurelSvg } from '../lib/laurel.js';
import { local } from '../lib/price.js';
import { whenNear } from '../lib/lazy.js';

function render() {
  document.getElementById('gift-points').innerHTML = t('gift.points').map((p) => `<li>${icon('check')}<span>${esc(p)}</span></li>`).join('');
  document.getElementById('gift-value').textContent = local(GIFT.price);
  document.getElementById('gift-wa').href = waLink(CONTACT.whatsapp, t('gift.waText', { value: local(GIFT.price) }));
}

export function initGift({ reduced }) {
  render();
  addEventListener('langchange', render);
  const stage = document.querySelector('.voucher__canvas');
  // without WebGL: the card's front, flat
  const fallback = () => {
    stage.innerHTML = '<div class="voucher__flat"><svg class="laurel-svg is-static" viewBox="-120 -120 240 240" aria-hidden="true"></svg><span>ZK</span></div>';
    drawLaurelSvg(stage.querySelector('svg'));
    document.querySelector('.voucher__hint').hidden = true;
  };
  whenNear(stage, () => {
    if (document.documentElement.classList.contains('no-webgl')) return fallback();
    import('./voucher3d.js')
      .then((m) => m.mountVoucher(stage, { reduced }))
      .catch((err) => {
        console.warn('[voucher] fallback', err);
        fallback();
      });
  });
}

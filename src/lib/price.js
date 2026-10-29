// Prices: in euros, Zoltan's choice for visitors from abroad; in Hungarian
// his forint price follows beneath (a little lower: no conversion fees).
import { getLang } from '../i18n/index.js';

const format = (n, currency, locale) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(n);

/** The euro price as the page's language writes it: €70, or 70 € */
export const eur = (price) => format(price.eur, 'EUR', getLang() === 'hu' ? 'hu-HU' : 'en-GB');

/** The forint price, 24 000 Ft: only in Hungarian, otherwise '' */
export const huf = (price) => (getLang() === 'hu' ? format(price.huf, 'HUF', 'hu-HU') : '');

/** In the visitor's own currency: forints in Hungarian, euros otherwise */
export const local = (price) => (getLang() === 'hu' ? format(price.huf, 'HUF', 'hu-HU') : format(price.eur, 'EUR', 'en-GB'));

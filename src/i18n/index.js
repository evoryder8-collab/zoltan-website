// Tiny i18n: every visible string lives in hu.js / en.js. Elements opt in with
//   data-i18n="key"                    → textContent
//   data-i18n-html="key"               → innerHTML (trusted dictionary markup only)
//   data-i18n-attr="aria-label:key;alt:key2"
import { LANGS } from '../lib/lang.js';

const STORE = 'zoltan.lang';
let dicts = { en: {}, hu: {} };
let current = 'en';

export function registerDictionaries(d) {
  dicts = d;
}

const lookup = (dict, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), dict);

export function t(key, vars) {
  let v = lookup(dicts[current], key);
  if (v == null) v = lookup(dicts.en, key);
  if (v == null) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing "${key}"`);
    return key;
  }
  if (typeof v === 'string' && vars) v = v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return v;
}

export const getLang = () => current;

export function storedLang() {
  try {
    return localStorage.getItem(STORE);
  } catch {
    return null;
  }
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}

export function setLang(lang, { persist = true } = {}) {
  current = LANGS.includes(lang) ? lang : 'en';
  if (persist) {
    try {
      localStorage.setItem(STORE, current);
    } catch {}
  }
  if (typeof document === 'undefined') return;
  document.documentElement.lang = current;
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', current === 'hu' ? 'hu_HU' : 'en_GB');
  const url = new URL(location.href);
  url.searchParams.set('lang', current);
  history.replaceState(history.state, '', url);
  applyI18n();
  dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } }));
}

// Which language a visitor sees first: an explicit ?lang= link, then the
// choice they made last time, then their browser. Hungarian browsers get
// Hungarian; everyone else gets English.
export const LANGS = ['hu', 'en'];

const valid = (v) => (LANGS.includes(v) ? v : null);

export function detectLang({ search = '', stored = null, languages = [] } = {}) {
  const fromUrl = valid(new URLSearchParams(search).get('lang'));
  if (fromUrl) return fromUrl;
  if (valid(stored)) return stored;
  return languages.some((l) => /^hu\b/i.test(l)) ? 'hu' : 'en';
}

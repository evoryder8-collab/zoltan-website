import { describe, it, expect, beforeEach } from 'vitest';
import { registerDictionaries, setLang, t } from '../src/i18n/index.js';

describe('t()', () => {
  beforeEach(() => {
    registerDictionaries({
      en: { a: { b: 'Hello', only: 'English only' }, greet: 'Hi {name}!' },
      hu: { a: { b: 'Szia' }, greet: 'Szia {name}!' },
    });
  });
  it('reads the current language', () => {
    setLang('hu', { persist: false });
    expect(t('a.b')).toBe('Szia');
    setLang('en', { persist: false });
    expect(t('a.b')).toBe('Hello');
  });
  it('falls back to English', () => {
    setLang('hu', { persist: false });
    expect(t('a.only')).toBe('English only');
  });
  it('returns the key when missing everywhere', () => {
    expect(t('nope.nothing')).toBe('nope.nothing');
  });
  it('interpolates variables', () => {
    setLang('hu', { persist: false });
    expect(t('greet', { name: 'Zoltan' })).toBe('Szia Zoltan!');
  });
});

import { describe, it, expect } from 'vitest';
import { detectLang } from '../src/lib/lang.js';

describe('detectLang', () => {
  it('prefers ?lang= over a saved choice', () => {
    expect(detectLang({ search: '?lang=en', stored: 'hu', languages: ['hu-HU'] })).toBe('en');
  });
  it('prefers a saved choice over the browser', () => {
    expect(detectLang({ search: '', stored: 'en', languages: ['hu-HU'] })).toBe('en');
  });
  it('picks Hungarian for a Hungarian browser', () => {
    expect(detectLang({ search: '', stored: null, languages: ['hu-HU'] })).toBe('hu');
  });
  it('goes by the primary language only', () => {
    expect(detectLang({ search: '', stored: null, languages: ['de-DE', 'hu'] })).toBe('en');
    expect(detectLang({ search: '', stored: null, languages: ['hu', 'en-GB'] })).toBe('hu');
  });
  it('falls back to English', () => {
    expect(detectLang({ search: '', stored: null, languages: ['fr'] })).toBe('en');
    expect(detectLang({})).toBe('en');
  });
  it('ignores unknown values', () => {
    expect(detectLang({ search: '?lang=xx', stored: 'de', languages: ['hu'] })).toBe('hu');
  });
});

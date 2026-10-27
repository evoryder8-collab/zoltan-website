import { describe, it, expect } from 'vitest';
import { waLink, telLink, mailLink } from '../src/lib/links.js';

describe('links', () => {
  it('builds a WhatsApp link with digits only and encoded text', () => {
    expect(waLink('+36 30 123 4567', 'Szia! Időpont?')).toBe('https://wa.me/36301234567?text=Szia!%20Id%C5%91pont%3F');
  });
  it('omits text when empty', () => {
    expect(waLink('+36 30 123 4567')).toBe('https://wa.me/36301234567');
  });
  it('builds a tel link', () => {
    expect(telLink('+36 30 123 4567')).toBe('tel:+36301234567');
  });
  it('builds a mailto link', () => {
    expect(mailLink('a@b.hu', 'Hi there')).toBe('mailto:a@b.hu?subject=Hi%20there');
    expect(mailLink('a@b.hu', 'Hi', 'Line')).toBe('mailto:a@b.hu?subject=Hi&body=Line');
  });
});

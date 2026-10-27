import { describe, it, expect } from 'vitest';
import { greatCircle } from '../src/lib/geo.js';

const BUDAPEST = [19.0402, 47.4979];
const SYDNEY = [151.1717, -33.8477];

describe('greatCircle', () => {
  it('starts and ends at the inputs', () => {
    const pts = greatCircle(BUDAPEST, SYDNEY, 64);
    expect(pts).toHaveLength(65);
    expect(pts[0][0]).toBeCloseTo(BUDAPEST[0], 6);
    expect(pts[0][1]).toBeCloseTo(BUDAPEST[1], 6);
    expect(pts[64][0]).toBeCloseTo(SYDNEY[0], 6);
    expect(pts[64][1]).toBeCloseTo(SYDNEY[1], 6);
  });
  it('keeps longitudes continuous', () => {
    const pts = greatCircle([170, 0], [-170, 10], 32);
    for (let i = 1; i < pts.length; i++) expect(Math.abs(pts[i][0] - pts[i - 1][0])).toBeLessThan(180);
  });
});

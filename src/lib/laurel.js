// The laurel: one set of leaf placements shared by the SVG wreaths (intro,
// fallbacks, training card, nav mark) and the three.js wreath in the hero.
// Coordinates are maths-style (y up), centred on the wreath.

export function laurelLeaves({ pairs = 12, radius = 100, start = -97, end = 64, spread = 38 } = {}) {
  const leaves = [];
  const rad = Math.PI / 180;
  for (let i = 0; i < pairs; i++) {
    const f = i / (pairs - 1);
    const a = (start + (end - start) * f) * rad;
    const size = 1 - 0.42 * f;
    for (const side of [1, -1]) {
      const px = Math.cos(a) * radius;
      const py = Math.sin(a) * radius;
      const tangent = a + Math.PI / 2; // growing counter-clockwise, toward the top
      for (const outer of [true, false]) {
        const dir = tangent + (outer ? 1 : -1) * spread * rad;
        // mirror the right branch into the left one
        leaves.push({
          x: px * side,
          y: py,
          angle: side === 1 ? dir : Math.PI - dir,
          size: size * (outer ? 1 : 0.86),
          f,
          side,
          outer,
          i,
        });
      }
    }
  }
  // a single crowning leaf at the tip of each branch
  for (const side of [1, -1]) {
    const a = (end + 6) * rad;
    const dir = a + Math.PI / 2;
    leaves.push({ x: Math.cos(a) * radius * side, y: Math.sin(a) * radius, angle: side === 1 ? dir : Math.PI - dir, size: 0.62, f: 1.04, side, outer: true, i: pairs });
  }
  return leaves.sort((p, q) => p.f - q.f);
}

/** Arc for each branch's stem, as SVG path data (y flipped for SVG). */
export function stemPath({ radius = 100, start = -97, end = 64, side = 1 } = {}) {
  const rad = Math.PI / 180;
  const p = (deg) => [Math.cos(deg * rad) * radius * side, -Math.sin(deg * rad) * radius];
  const [x0, y0] = p(start);
  const [x1, y1] = p(end + 4);
  const large = end + 4 - start > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${radius} ${radius} 0 ${large} ${side === 1 ? 0 : 1} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Fills an <svg viewBox="-120 -120 240 240"> with a line-drawn laurel. */
export function drawLaurelSvg(svg, { radius = 92, pairs = 12, stroke = 1.1 } = {}) {
  const leaves = laurelLeaves({ radius, pairs });
  const L = 25;
  const W = 7.2;
  let html = `<g class="laurel-svg__stems" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round">`;
  for (const side of [1, -1]) html += `<path pathLength="1" d="${stemPath({ radius, side })}"/>`;
  html += '</g><g class="laurel-svg__leaves">';
  leaves.forEach((lf, n) => {
    const len = L * lf.size;
    const w = W * lf.size;
    const deg = (-lf.angle * 180) / Math.PI;
    // placement on the group, so the CSS grow animation can own the path's transform
    html += `<g transform="translate(${lf.x.toFixed(2)} ${(-lf.y).toFixed(2)}) rotate(${deg.toFixed(2)})"><path style="--n:${n}" d="M0 0Q${(len * 0.42).toFixed(2)} ${(-w).toFixed(2)} ${len.toFixed(2)} 0Q${(len * 0.42).toFixed(2)} ${w.toFixed(2)} 0 0Z"/></g>`;
  });
  svg.innerHTML = `${html}</g>`;
  svg.style.setProperty('--leaves', leaves.length);
}

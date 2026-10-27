// Points along the great circle between two [lng, lat] positions. Longitudes
// are unwrapped so a route across the antimeridian stays one continuous line.
const rad = Math.PI / 180;

export function greatCircle(a, b, steps = 64) {
  const [l1, p1] = [a[0] * rad, a[1] * rad];
  const [l2, p2] = [b[0] * rad, b[1] * rad];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    if (d === 0) { pts.push([a[0], a[1]]); continue; }
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    pts.push([Math.atan2(y, x) / rad, Math.atan2(z, Math.hypot(x, y)) / rad]);
  }
  pts[0] = [a[0], a[1]];
  pts[steps] = [b[0], b[1]];
  for (let i = 1; i < pts.length; i++) {
    while (pts[i][0] - pts[i - 1][0] > 180) pts[i][0] -= 360;
    while (pts[i][0] - pts[i - 1][0] < -180) pts[i][0] += 360;
  }
  return pts;
}

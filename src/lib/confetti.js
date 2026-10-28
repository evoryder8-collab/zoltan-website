// A short burst of confetti and twinkling stars from an element: two small
// poppers at its top corners, in the site's gold with crimson and pearl
// accents. Drawn on a canvas laid over the page only while it lasts, and
// anchored to the element, so it travels with it while the page scrolls.

const COLOURS = ['#e0b56d', '#f3d9a4', '#c9973f', '#e0b56d', '#c3122f', '#f6f1ec'];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function confetti(el, { count = 64 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const size = () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  };
  size();

  const r0 = el.getBoundingClientRect();
  const s = Math.min(1.2, Math.max(0.7, r0.width / 420));
  const pieces = [];
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0;
    // up and inwards, from just inside each top corner
    const a = ((left ? rand(-88, -38) : rand(-142, -92)) * Math.PI) / 180;
    const v = rand(700, 1250) * s;
    pieces.push({
      x: left ? r0.width * 0.08 : r0.width * 0.92,
      y: r0.height * 0.2,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      w: rand(4, 7) * s,
      h: rand(8, 13) * s,
      rot: rand(0, Math.PI * 2),
      spin: rand(-9, 9),
      flip: rand(0, Math.PI * 2),
      flipRate: rand(6, 14),
      sway: rand(0, Math.PI * 2),
      colour: pick(COLOURS),
      life: rand(2.2, 3.2),
      delay: rand(0, 0.12),
    });
  }
  // stars that wink on around the edge as the confetti flies
  const stars = [];
  for (let i = 0; i < 12; i++) {
    const side = Math.random();
    const along = Math.random();
    const out = rand(6, 22) * s;
    stars.push({
      x: side < 0.6 ? along * r0.width : side < 0.8 ? -out : r0.width + out,
      y: side < 0.3 ? -out : side < 0.6 ? r0.height + out : along * r0.height,
      r: rand(4, 8) * s,
      delay: rand(0.05, 1),
      life: rand(0.8, 1.3),
    });
  }

  const star = (x, y, r) => {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  };

  let raf = 0;
  let prev = performance.now();
  let t = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', size);
    canvas.remove();
  };
  const frame = (now) => {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    t += dt;
    const r = el.getBoundingClientRect();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    for (const p of pieces) {
      const age = t - p.delay;
      if (age < 0) {
        alive++;
        continue;
      }
      if (age > p.life) continue;
      alive++;
      // a quick pop, then paper fluttering down slowly
      const drag = Math.exp(-3.2 * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + 560 * s * dt;
      p.x += (p.vx + Math.sin(age * 5 + p.sway) * 30 * s) * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      const fade = Math.min(1, (p.life - age) / 0.6);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(r.left + p.x, r.top + p.y);
      ctx.rotate(p.rot);
      // tumbling: the strip turns edge-on and back
      ctx.scale(1, Math.cos(p.flip + age * p.flipRate));
      ctx.fillStyle = p.colour;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    for (const st of stars) {
      const age = t - st.delay;
      if (age > st.life) continue;
      alive++;
      if (age < 0) continue;
      const k = Math.sin((age / st.life) * Math.PI);
      ctx.globalAlpha = k * 0.95;
      ctx.fillStyle = '#fff4dc';
      star(r.left + st.x, r.top + st.y, st.r * (0.4 + 0.6 * k));
      ctx.globalAlpha = k * 0.25;
      ctx.beginPath();
      ctx.arc(r.left + st.x, r.top + st.y, st.r * 0.9 * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (alive && !document.hidden) raf = requestAnimationFrame(frame);
    else stop();
  };
  addEventListener('resize', size);
  raf = requestAnimationFrame(frame);
  return stop;
}

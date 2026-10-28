// The universe around the championship globe: deep space with a crimson,
// violet and gold nebula band, three depths of twinkling stars that drift
// against the globe as it turns (the brightest with soft diffraction spikes),
// a shooting star now and then, and the warm glow of the sun that lights the
// globe's face from the viewer's side. Canvas 2D at ~30fps, only on screen.
import { tilt } from './tilt.js';

const rand = (a, b) => a + Math.random() * (b - a);
const LAYERS = [
  { speed: 0.12, share: 0.6, size: [0.35, 0.9], alpha: [0.25, 0.7] },
  { speed: 0.3, share: 0.3, size: [0.6, 1.3], alpha: [0.45, 0.9] },
  { speed: 0.6, share: 0.1, size: [1, 2.1], alpha: [0.7, 1] },
];
const TINTS = ['255,255,255', '255,236,214', '255,214,200', '214,226,255', '255,244,226'];

export function mountSpace(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  let w = 0;
  let h = 0;
  let sky = null; // the static part: space, nebula, dust, the sun
  let glowSprite = null;
  let stars = [];
  let turn = 0; // degrees the globe has turned
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  let shot = null;
  let nextShot = 3 + Math.random() * 4;

  const sprite = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.12, 'rgba(255,240,230,0.85)');
    r.addColorStop(0.35, 'rgba(255,170,170,0.18)');
    r.addColorStop(1, 'rgba(255,120,140,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return c;
  };

  // nebula: soft clouds strung along a diagonal band, dark dust lanes, fine dust
  const paintSky = () => {
    const c = document.createElement('canvas');
    // a little larger than the frame, so leaning never shows an edge
    c.width = Math.round(w * 1.1);
    c.height = Math.round(h * 1.1);
    const g = c.getContext('2d');
    const W = c.width;
    const H = c.height;
    const base = g.createRadialGradient(W * 0.52, H * 0.5, 0, W * 0.52, H * 0.5, Math.max(W, H) * 0.75);
    base.addColorStop(0, '#16060d');
    base.addColorStop(0.55, '#0b0308');
    base.addColorStop(1, '#040104');
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);

    const band = (t) => [W * (-0.05 + t * 1.1), H * (0.92 - t * 0.85) + Math.sin(t * 7) * H * 0.05];
    const cloud = (x, y, r, rgb, a) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${rgb},${a})`);
      gr.addColorStop(0.45, `rgba(${rgb},${a * 0.4})`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const S = Math.max(W, H);
    g.globalCompositeOperation = 'lighter';
    const palette = [
      ['195,18,47', 0.16],
      ['227,37,63', 0.1],
      ['110,36,140', 0.12],
      ['70,40,120', 0.1],
      ['224,181,109', 0.06],
      ['255,120,90', 0.05],
    ];
    for (let i = 0; i < 46; i++) {
      const [x, y] = band(Math.random());
      const [rgb, a] = palette[i % palette.length];
      cloud(x + rand(-0.12, 0.12) * W, y + rand(-0.14, 0.14) * H, rand(0.06, 0.26) * S, rgb, a);
    }
    // a few lone wisps away from the band
    for (let i = 0; i < 6; i++) cloud(rand(0, W), rand(0, H), rand(0.08, 0.18) * S, i % 2 ? '120,30,70' : '60,30,110', 0.06);
    // dust lanes cut through the glow
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 14; i++) {
      const [x, y] = band(Math.random());
      cloud(x + rand(-0.05, 0.05) * W, y + rand(-0.05, 0.05) * H, rand(0.03, 0.09) * S, '0,0,0', 0.35);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    // repaint the base under the cut lanes so they read as dark dust, not holes
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    // fine dust, thickest along the band
    const dust = Math.round((W * H) / 260);
    for (let i = 0; i < dust; i++) {
      const [bx, by] = band(Math.random());
      const spread = Math.random() < 0.7 ? 0.08 : 0.3;
      const x = bx + rand(-spread, spread) * W;
      const y = by + rand(-spread, spread) * H;
      g.fillStyle = `rgba(255,${200 + ((Math.random() * 55) | 0)},${190 + ((Math.random() * 60) | 0)},${rand(0.04, 0.22).toFixed(2)})`;
      g.fillRect(x, y, Math.random() < 0.85 ? 1 : 1.6, Math.random() < 0.85 ? 1 : 1.6);
    }
    // the sun, off the top-left corner behind the viewer: a warm bloom and a faint flare
    const sx = -W * 0.06;
    const sy = -H * 0.12;
    cloud(sx, sy, S * 0.55, '255,214,170', 0.22);
    cloud(sx, sy, S * 0.18, '255,240,220', 0.3);
    for (const [k, r, a] of [[0.34, 0.03, 0.08], [0.48, 0.06, 0.05], [0.7, 0.02, 0.09], [0.86, 0.1, 0.03]]) {
      cloud(sx + (W * 0.52 - sx) * k, sy + (H * 0.5 - sy) * k, r * S, '255,220,190', a);
    }
    g.globalCompositeOperation = 'source-over';
    return c;
  };

  const seed = () => {
    const n = Math.round((w * h) / 1500);
    stars = [];
    LAYERS.forEach((L, li) => {
      for (let i = 0; i < n * L.share; i++) {
        stars.push({
          l: li,
          x: Math.random(),
          y: Math.random(),
          r: rand(...L.size),
          a: rand(...L.alpha),
          tw: rand(0.6, 2.4),
          ph: rand(0, Math.PI * 2),
          c: TINTS[(Math.random() * TINTS.length) | 0],
          spike: li === 2 && Math.random() < 0.35,
        });
      }
    });
  };

  const resize = () => {
    const nw = canvas.clientWidth;
    const nh = canvas.clientHeight;
    if (!nw || !nh || (nw === w && nh === h)) return;
    w = nw;
    h = nh;
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    sky = paintSky();
    glowSprite ??= sprite();
    seed();
    draw(performance.now() / 1000);
  };

  const draw = (time) => {
    if (!sky) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    lean.x += (lean.tx - lean.x) * 0.06;
    lean.y += (lean.ty - lean.y) * 0.06;
    ctx.drawImage(sky, -w * 0.05 - lean.x * w * 0.02, -h * 0.05 - lean.y * h * 0.02, w * 1.1, h * 1.1);

    const unit = w / 90; // px per degree of turn, for the nearest layer
    for (const s of stars) {
      const L = LAYERS[s.l];
      const x = ((((s.x * w - turn * unit * L.speed - lean.x * 14 * L.speed) % w) + w) % w);
      const y = s.y * h - lean.y * 10 * L.speed;
      const a = reduced ? s.a : s.a * (0.6 + 0.4 * Math.sin(time * s.tw + s.ph));
      if (s.r > 1.2) {
        const g = s.r * 7;
        ctx.globalAlpha = a * 0.7;
        ctx.drawImage(glowSprite, x - g / 2, y - g / 2, g, g);
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${s.c})`;
      ctx.beginPath();
      ctx.arc(x, y, s.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      if (s.spike) {
        const len = s.r * 9 * (0.75 + 0.25 * Math.sin(time * s.tw * 0.7 + s.ph));
        ctx.globalAlpha = a * 0.45;
        ctx.strokeStyle = `rgb(${s.c})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x - len, y);
        ctx.lineTo(x + len, y);
        ctx.moveTo(x, y - len);
        ctx.lineTo(x, y + len);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // a shooting star now and then, high and fast, fading as it goes
    if (!reduced) {
      if (!shot && time > nextShot) {
        const fromLeft = Math.random() < 0.5;
        shot = { t0: time, x: rand(0.1, 0.9) * w, y: rand(0.05, 0.35) * h, ang: fromLeft ? rand(0.25, 0.55) : Math.PI - rand(0.25, 0.55), len: rand(0.12, 0.22) * w, dur: rand(0.7, 1.1) };
      }
      if (shot) {
        const k = (time - shot.t0) / shot.dur;
        if (k >= 1) {
          shot = null;
          nextShot = time + rand(5, 11);
        } else {
          const travel = k * shot.len * 1.6;
          const hx = shot.x + Math.cos(shot.ang) * travel;
          const hy = shot.y + Math.sin(shot.ang) * travel;
          const tx = hx - Math.cos(shot.ang) * shot.len * Math.min(1, k * 2);
          const ty = hy - Math.sin(shot.ang) * shot.len * Math.min(1, k * 2);
          const fade = Math.sin(Math.PI * k);
          const gr = ctx.createLinearGradient(tx, ty, hx, hy);
          gr.addColorStop(0, 'rgba(255,200,190,0)');
          gr.addColorStop(1, `rgba(255,248,240,${0.9 * fade})`);
          ctx.strokeStyle = gr;
          ctx.lineWidth = 1.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          ctx.globalAlpha = fade;
          ctx.drawImage(glowSprite, hx - 8, hy - 8, 16, 16);
          ctx.globalAlpha = 1;
        }
      }
    }
  };

  new ResizeObserver(resize).observe(canvas);
  resize();
  addEventListener('pointermove', (e) => {
    lean.tx = e.clientX / innerWidth - 0.5;
    lean.ty = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  let last = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (!visible || document.hidden || now - last < 33) return;
    last = now;
    if (tilt.active) {
      lean.tx = tilt.x * 0.5;
      lean.ty = tilt.y * 0.5;
    }
    draw(now / 1000);
  };
  if (!reduced) requestAnimationFrame(loop);

  return {
    /** The globe turned by `deg` (east positive): the stars drift the other way. */
    turn(deg) {
      if (Math.abs(deg) > 90) return; // a jump across the date line, not a turn
      turn += deg;
      if (reduced) draw(0);
    },
  };
}

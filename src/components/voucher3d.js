// The gift voucher: a lacquered card edged in gold, engraved with Zoltan's
// initials in the laurel, a ribbon and bow wrapped round it, and the
// dedication lines on the back. It floats and turns slowly on its own; drag
// to spin it, tap to flip it. Renders only while on screen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { laurelLeaves, stemPath } from '../lib/laurel.js';
import { t } from '../i18n/index.js';
import { local } from '../lib/price.js';
import { GIFT } from '../config.js';
import { sound } from '../lib/audio.js';
import { tilt, buzz } from '../lib/tilt.js';

const SERIF = '"Bodoni Moda Variable", Didot, Georgia, serif';
const SANS = '"Manrope Variable", "Helvetica Neue", Arial, sans-serif';
// the card, 1.6 : 1, and its faces drawn on a 2048 × 1280 plan
const W = 3.2;
const H = 2;
const DW = 2048;
const DH = 1280;
const BAND = 1080; // the ribbon's centre on the front; behind, it's at DW − BAND
const IDLE = 0.36; // how fast it turns when left alone (radians a second)

// What each part is made of. The colour map has the lacquer and the gold;
// the other map packs height (red: engraving is cut in), roughness (green)
// and metalness (blue).
function palette(g, mode) {
  if (mode === 'orm') return { base: 'rgb(150,82,40)', line: 'rgb(138,82,40)', gold: 'rgb(62,58,255)', deep: 'rgb(34,70,255)', satin: 'rgb(120,70,190)' };
  const base = g.createRadialGradient(540, 420, 60, 760, 640, 1500);
  base.addColorStop(0, '#4a111d');
  base.addColorStop(0.5, '#230a10');
  base.addColorStop(1, '#0f0507');
  const gold = g.createLinearGradient(0, 0, DW, DH);
  gold.addColorStop(0, '#f8e4ae');
  gold.addColorStop(0.35, '#dcae62');
  gold.addColorStop(0.6, '#f3d391');
  gold.addColorStop(1, '#a9772f');
  return { base, line: 'rgba(240, 212, 154, 0.09)', gold, deep: '#5a3a14', satin: 'rgba(240, 212, 154, 0.38)' };
}

/** Letter-spaced text (canvas letterSpacing isn't everywhere yet). */
function spaced(g, text, x, y, gap, align = 'center') {
  const chars = [...text];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let at = align === 'center' ? x - total / 2 : x;
  g.textAlign = 'left';
  chars.forEach((ch, i) => {
    g.fillText(ch, at, y);
    at += widths[i] + gap;
  });
}

// fine engine-turned waves under everything, as on a banknote
function guilloche(g, ink) {
  g.strokeStyle = ink.line;
  g.lineWidth = 1.6;
  for (let i = 0; i < 52; i++) {
    const y0 = -40 + i * 26;
    g.beginPath();
    for (let x = -24; x <= DW + 24; x += 12) {
      const y = y0 + 24 * Math.sin(x / 140 + i * 0.32) + 10 * Math.sin(x / 53 - i * 0.21);
      if (x < 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
}

function border(g, ink) {
  g.strokeStyle = ink.gold;
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(60, 60, DW - 120, DH - 120, 64);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(82, 82, DW - 164, DH - 164, 44);
  g.stroke();
}

// the ribbon, top to bottom, its satin in fine lines
function band(g, ink, cx) {
  const w = 104;
  g.fillStyle = ink.base;
  g.fillRect(cx - w / 2, 0, w, DH);
  g.strokeStyle = ink.satin;
  g.lineWidth = 1.5;
  for (let x = cx - w / 2 + 12; x < cx + w / 2 - 6; x += 10) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, DH);
    g.stroke();
  }
  g.strokeStyle = ink.gold;
  g.lineWidth = 5;
  for (const x of [cx - w / 2, cx + w / 2]) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, DH);
    g.stroke();
  }
}

function outline(g, ink) {
  g.fillStyle = ink.base;
  g.fill();
  g.strokeStyle = ink.gold;
  g.lineWidth = 5;
  g.lineJoin = 'round';
  g.stroke();
}

// the bow where the ribbon is tied: two tails, two loops and the knot
function bow(g, ink, cx, cy) {
  for (const [angle, len] of [[1.78, 300], [1.3, 290]]) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const nx = -dy * 34;
    const ny = dx * 34;
    const ex = cx + dx * len;
    const ey = cy + dy * len;
    g.beginPath();
    g.moveTo(cx + nx, cy + ny);
    g.lineTo(ex + nx, ey + ny);
    g.lineTo(ex - dx * 40, ey - dy * 40); // the notch
    g.lineTo(ex - nx, ey - ny);
    g.lineTo(cx - nx, cy - ny);
    g.closePath();
    outline(g, ink);
    g.strokeStyle = ink.satin;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx + dx * 50, cy + dy * 50);
    g.lineTo(ex - dx * 70, ey - dy * 70);
    g.stroke();
  }
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx, cy);
    g.bezierCurveTo(cx + s * 120, cy - 190, cx + s * 300, cy - 150, cx + s * 250, cy - 20);
    g.bezierCurveTo(cx + s * 215, cy + 70, cx + s * 90, cy + 40, cx, cy);
    outline(g, ink);
    g.strokeStyle = ink.satin;
    g.lineWidth = 2.2;
    for (const k of [0.5, 0.75]) {
      g.beginPath();
      g.moveTo(cx + s * 34, cy - 6);
      g.bezierCurveTo(cx + s * (120 * k + 40), cy - 175 * k, cx + s * 290 * k, cy - 135 * k, cx + s * (245 * k + 10), cy - 18 * k);
      g.stroke();
    }
  }
  g.beginPath();
  g.roundRect(cx - 38, cy - 44, 76, 88, 22);
  outline(g, ink);
}

function laurel(g, ink, cx, cy, r, pairs) {
  const k = r / 300;
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = ink.gold;
  g.lineWidth = 5 * k;
  g.lineCap = 'round';
  for (const side of [1, -1]) g.stroke(new Path2D(stemPath({ radius: r, side })));
  for (const lf of laurelLeaves({ radius: r, pairs })) {
    g.save();
    g.translate(lf.x, -lf.y);
    g.rotate(-lf.angle);
    const L = 100 * k * lf.size;
    const w = 29 * k * lf.size;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(L * 0.42, -w, L, 0);
    g.quadraticCurveTo(L * 0.42, w, 0, 0);
    g.fillStyle = ink.gold;
    g.fill();
    g.strokeStyle = ink.deep; // the vein
    g.lineWidth = 2.2 * k;
    g.beginPath();
    g.moveTo(L * 0.12, 0);
    g.lineTo(L * 0.8, 0);
    g.stroke();
    g.restore();
  }
  g.restore();
}

// ZK, cut in gold with a finer line round its edge
function monogram(g, ink, x, y, size) {
  g.font = `italic 400 ${size}px ${SERIF}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = ink.gold;
  g.fillText('ZK', x, y);
  g.strokeStyle = ink.deep;
  g.lineWidth = size / 100;
  g.strokeText('ZK', x, y);
}

function front(g, ink, w) {
  laurel(g, ink, 560, 640, 330, 11);
  monogram(g, ink, 552, 660, 300);
  g.fillStyle = ink.gold;
  g.textBaseline = 'middle';
  g.font = `600 22px ${SANS}`;
  spaced(g, 'CLINICAL PRECISION · AESTHETIC FLOW', 560, 1104, 5);
  band(g, ink, BAND);
  bow(g, ink, BAND, 330);
  const cx = 1590;
  g.fillStyle = ink.gold;
  g.font = `700 34px ${SANS}`;
  spaced(g, 'ZOLTAN KODOR', 1640, 250, 12);
  g.font = `italic 400 ${w.word.length > 5 ? 172 : 250}px ${SERIF}`;
  g.textAlign = 'center';
  g.fillText(w.word, cx, 610);
  g.fillRect(cx - 120, 770, 240, 3);
  g.font = `700 56px ${SANS}`;
  spaced(g, w.kind, cx, 860, 22);
}

function back(g, ink, w, value) {
  band(g, ink, DW - BAND);
  laurel(g, ink, 470, 600, 230, 10);
  monogram(g, ink, 464, 614, 210);
  g.fillStyle = ink.gold;
  g.textBaseline = 'middle';
  g.font = `700 24px ${SANS}`;
  spaced(g, 'BUDAPEST · MEZŐKERESZTES', 470, 1060, 7);
  const x0 = 1090;
  g.font = `italic 400 ${w.care.length > 16 ? 84 : 100}px ${SERIF}`;
  g.textAlign = 'left';
  g.fillText(w.care, x0, 270);
  g.strokeStyle = ink.gold;
  g.lineWidth = 3;
  for (const [label, y] of [[w.for, 480], [w.from, 640]]) {
    g.font = `700 30px ${SANS}`;
    spaced(g, label, x0, y, 10, 'left');
    g.beginPath();
    g.moveTo(x0 + 170, y + 16);
    g.lineTo(1950, y + 16);
    g.stroke();
  }
  g.font = `700 30px ${SANS}`;
  spaced(g, w.value, x0, 820, 10, 'left');
  g.font = `italic 400 120px ${SERIF}`;
  g.textAlign = 'left';
  g.fillText(value, x0 + 170, 828);
  g.font = `600 22px ${SANS}`;
  spaced(g, w.redeem, x0, 1080, 6, 'left');
}

/** Draws one face into its two canvases: the colours, and the height /
 *  roughness / metalness map, softened so the engraving has sloped walls. */
function paint(side, maps) {
  const w = t('gift.card');
  const value = local(GIFT.price);
  for (const mode of ['color', 'orm']) {
    const c = maps[mode].image;
    const g = c.getContext('2d');
    g.setTransform(c.width / DW, 0, 0, c.height / DH, 0, 0);
    const ink = palette(g, mode);
    g.fillStyle = ink.base;
    g.fillRect(0, 0, DW, DH);
    guilloche(g, ink);
    border(g, ink);
    if (side === 'front') front(g, ink, w);
    else back(g, ink, w, value);
    if (mode === 'orm') {
      const half = document.createElement('canvas');
      half.width = c.width / 2;
      half.height = c.height / 2;
      half.getContext('2d').drawImage(c, 0, 0, half.width, half.height);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.imageSmoothingQuality = 'high';
      g.drawImage(half, 0, 0, c.width, c.height);
    }
    maps[mode].needsUpdate = true;
  }
}

function rounded(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

export async function mountVoucher(container, { reduced = false } = {}) {
  await Promise.all([document.fonts?.load(`italic 400 100px ${SERIF}`), document.fonts?.load(`700 40px ${SANS}`), document.fonts?.load(`600 40px ${SANS}`)]).catch(() => {});
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.85;
  // a long lens, so the near edge doesn't loom as it turns
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 60);

  const key = new THREE.DirectionalLight(0xfff1e2, 2.2);
  key.position.set(-2, 3, 5);
  const rim = new THREE.DirectionalLight(0xff2a48, 3.5);
  rim.position.set(3.5, 1, -3);
  const rim2 = new THREE.DirectionalLight(0xff5060, 1.8);
  rim2.position.set(-3.5, -1.5, -2);
  scene.add(new THREE.HemisphereLight(0xfff4ee, 0x2a0510, 0.5), key, rim, rim2);

  // the faces' maps: sharp enough for a phone's screen, sharper on a desktop's
  const size = innerWidth < 760 ? 1280 : 1792;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const map = (color) => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = Math.round(size / 1.6);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
  };
  const faces = { front: { color: map(true), orm: map(false) }, back: { color: map(true), orm: map(false) } };
  const repaint = () => {
    paint('front', faces.front);
    paint('back', faces.back);
  };
  repaint();

  const shape = rounded(W, H, 0.14);
  const DEPTH = 0.05;
  const BEVEL = 0.022;
  const body = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: 0.028, bevelSegments: 5, curveSegments: 24 });
  body.translate(0, 0, -DEPTH / 2);
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0b56d, metalness: 1, roughness: 0.24, clearcoat: 0.4, clearcoatRoughness: 0.2 });
  const faceGeo = new THREE.ShapeGeometry(shape, 24);
  const uv = faceGeo.attributes.uv;
  const pos = faceGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + H / 2) / H);
  const lacquer = (m) => new THREE.MeshPhysicalMaterial({ map: m.color, bumpMap: m.orm, bumpScale: 2.2, roughnessMap: m.orm, metalnessMap: m.orm, roughness: 1, metalness: 1, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  const frontFace = new THREE.Mesh(faceGeo, lacquer(faces.front));
  frontFace.position.z = DEPTH / 2 + BEVEL + 0.0008;
  const backFace = new THREE.Mesh(faceGeo, lacquer(faces.back));
  backFace.position.z = -frontFace.position.z;
  backFace.rotation.y = Math.PI;
  const card = new THREE.Group();
  card.add(new THREE.Mesh(body, gold), frontFace, backFace);
  scene.add(card);

  // turning: drag to spin, a tap flips it; left alone it eases back to
  // turning slowly, the way it was last sent
  const S = { spin: reduced ? -0.5 : -0.9, spinV: reduced ? 0 : IDLE * 4, dir: 1, lean: 0, leanT: 0 };
  let dragging = false;
  let lastX = 0;
  let lastT = 0;
  let moved = 0;
  const el = renderer.domElement;
  el.style.touchAction = 'pan-y';
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastT = performance.now();
    el.setPointerCapture(e.pointerId);
    start();
  });
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    S.leanT = ((e.clientY - r.top) / r.height - 0.5) * 0.5;
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(1, now - lastT) / 1000;
    moved += Math.abs(dx);
    S.spin += dx * 0.011;
    S.spinV = S.spinV * 0.4 + ((dx * 0.011) / dt) * 0.6;
    lastX = e.clientX;
    lastT = now;
    if (reduced) renderer.render(scene, camera);
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) {
      // a tap: it flips over
      if (reduced) S.spin += Math.PI;
      else S.spinV += S.dir * 3.6;
      sound.whoosh(0.7);
      buzz(10);
    } else {
      if (Math.abs(S.spinV) > 0.5) S.dir = Math.sign(S.spinV);
      if (Math.abs(S.spinV) > 6) sound.whoosh(0.8);
    }
    if (reduced) renderer.render(scene, camera);
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', () => (S.leanT = 0));

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // the whole card in view, with room to float and turn
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    camera.position.set(0, 0, Math.max((H * 1.55) / 2 / tan, (W * 1.16) / 2 / (tan * camera.aspect)));
    camera.updateProjectionMatrix();
    if (reduced) renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let onScreen = false;
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) start();
  });
  io.observe(container);

  const relabel = () => {
    repaint();
    if (reduced) renderer.render(scene, camera);
  };
  addEventListener('langchange', relabel);

  const t0 = performance.now();
  let prev = t0;
  let raf = 0;
  const frame = () => {
    raf = 0;
    if (!onScreen || document.hidden) return;
    const now = performance.now();
    const dt = Math.min((now - prev) / 1000, 1 / 30);
    prev = now;
    const t = (now - t0) / 1000;
    if (!dragging) {
      S.spinV += (IDLE * S.dir - S.spinV) * (1 - Math.exp(-1.1 * dt));
      S.spin += S.spinV * dt;
    }
    if (tilt.active && !dragging) S.leanT = tilt.y * 0.4;
    S.lean += (S.leanT - S.lean) * 0.06;
    card.rotation.y = S.spin;
    card.rotation.x = 0.1 + S.lean * 0.3 + Math.sin(t * 0.6) * 0.05;
    card.rotation.z = Math.sin(t * 0.45) * 0.025;
    card.position.y = Math.sin(t * 0.9) * 0.06;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (reduced) {
      card.rotation.set(0.1, S.spin, 0);
      return renderer.render(scene, camera);
    }
    if (!raf) {
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', start);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener('langchange', relabel);
      renderer.dispose();
      el.remove();
    },
  };
}

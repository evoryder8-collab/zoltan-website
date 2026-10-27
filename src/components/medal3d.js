// The medal: a toy to play with. A procedural champion's medal on a
// red-white-green ribbon. Drag to spin it; it swings back on spring physics
// and clinks when it's spun hard or tapped. Renders only while on screen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { laurelLeaves } from '../lib/laurel.js';
import { sound } from '../lib/audio.js';

const TAU = Math.PI * 2;
const SERIF = '"Bodoni Moda Variable", Didot, Georgia, serif';
const SANS = '"Manrope Variable", "Helvetica Neue", Arial, sans-serif';

/** Draws one face of the medal; `relief` = greyscale height map for bumps. */
function face(kind, relief) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  const ink = relief ? '#fff' : 'rgba(255,240,215,0.9)';
  if (relief) {
    g.fillStyle = '#6a6a6a';
    g.fillRect(-S / 2, -S / 2, S, S);
  } else {
    const grad = g.createRadialGradient(-160, -220, 40, 0, 0, 560);
    grad.addColorStop(0, '#fff3d6');
    grad.addColorStop(0.45, '#e2bb74');
    grad.addColorStop(1, '#9c6a2a');
    g.fillStyle = grad;
    g.fillRect(-S / 2, -S / 2, S, S);
  }
  // inner ring
  g.strokeStyle = relief ? '#9a9a9a' : 'rgba(110,70,20,0.55)';
  g.lineWidth = 10;
  g.beginPath();
  g.arc(0, 0, 452, 0, TAU);
  g.stroke();

  if (kind === 'front') {
    // laurel
    g.fillStyle = ink;
    for (const lf of laurelLeaves({ radius: 300, pairs: 11 })) {
      g.save();
      g.translate(lf.x, -lf.y);
      g.rotate(-lf.angle);
      const L = 92 * lf.size;
      const W = 27 * lf.size;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(L * 0.42, -W, L, 0);
      g.quadraticCurveTo(L * 0.42, W, 0, 0);
      g.fill();
      g.restore();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `italic 400 380px ${SERIF}`;
    g.fillText('Z', 0, 18);
    g.font = `700 46px ${SANS}`;
    arcText(g, 'AUSMC · 2026', 400, -Math.PI / 2, 0.075);
  } else {
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `700 50px ${SANS}`;
    g.fillText('OVERALL', 0, -150);
    g.fillText('WINNER', 0, -88);
    g.font = `400 132px ${SERIF}`;
    g.fillText('Zoltan', 0, 40);
    g.font = `700 40px ${SANS}`;
    g.fillText('HUNGARY', 0, 170);
    arcText(g, 'AUSTRALIAN MASSAGE CHAMPIONSHIP', 400, -Math.PI / 2, 0.052);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = relief ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function arcText(g, text, r, mid, step) {
  const chars = [...text];
  let a = mid - (step * (chars.length - 1)) / 2;
  for (const ch of chars) {
    g.save();
    g.rotate(a + Math.PI / 2);
    g.fillText(ch, 0, -r);
    g.restore();
    a += step;
  }
}

function ribbonTexture() {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 8;
  const g = c.getContext('2d');
  ['#a80f28', '#e9e2da', '#16602f'].forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(i * 32, 0, 32, 8);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export async function mountMedal(container, { reduced = false } = {}) {
  await document.fonts?.ready;
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
  scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, -0.1, 7.2);

  const key = new THREE.DirectionalLight(0xfff1e2, 2.4);
  key.position.set(-2, 3, 5);
  const rim = new THREE.DirectionalLight(0xff2a48, 4);
  rim.position.set(3.5, 1, -3);
  const rim2 = new THREE.DirectionalLight(0xff5060, 2);
  rim2.position.set(-3.5, -1.5, -2);
  scene.add(new THREE.HemisphereLight(0xfff4ee, 0x2a0510, 0.5), key, rim, rim2);

  // hierarchy: pivot (top of ribbon) → swing → [ribbons, medal → spin]
  const pivot = new THREE.Group();
  pivot.position.y = 3.2;
  scene.add(pivot);
  const swing = new THREE.Group();
  pivot.add(swing);
  const HANG = 3.85; // pivot to medal centre

  const ribbonMat = new THREE.MeshPhysicalMaterial({ map: ribbonTexture(), roughness: 0.62, sheen: 0.45, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffe8e8), side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const len = 3.15;
    const geo = new THREE.PlaneGeometry(0.46, len, 1, 20);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(((p.getY(i) + len / 2) / len) * Math.PI) * 0.06);
    geo.computeVertexNormals();
    const strip = new THREE.Mesh(geo, ribbonMat);
    strip.position.set(side * 0.36, -len / 2 + 0.2, -0.04);
    strip.rotation.z = -side * 0.17; // a V: wide at the top, meeting at the loop
    swing.add(strip);
  }

  const medal = new THREE.Group();
  medal.position.y = -HANG;
  swing.add(medal);
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0b56d, metalness: 1, roughness: 0.26, clearcoat: 0.35, clearcoatRoughness: 0.2 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 128, 1, true), gold);
  disc.rotation.x = Math.PI / 2;
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 24, 160), gold);
  const faceGeo = new THREE.CircleGeometry(0.985, 128);
  const front = new THREE.Mesh(faceGeo, new THREE.MeshPhysicalMaterial({ map: face('front'), bumpMap: face('front', true), bumpScale: 3, metalness: 1, roughness: 0.3, clearcoat: 0.3 }));
  front.position.z = 0.06;
  const back = new THREE.Mesh(faceGeo, new THREE.MeshPhysicalMaterial({ map: face('back'), bumpMap: face('back', true), bumpScale: 3, metalness: 1, roughness: 0.3, clearcoat: 0.3 }));
  back.position.z = -0.06;
  back.rotation.y = Math.PI;
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 16, 48), gold);
  loop.position.y = 1.12;
  loop.rotation.y = Math.PI / 2;
  medal.add(disc, rimRing, front, back, loop);

  // physics
  const S = { spin: 0, spinV: 0, theta: 0, thetaV: 0, lean: 0, leanT: 0 };
  if (!reduced) {
    S.spinV = 14; // the entrance: it drops in spinning and settles
    S.theta = 0.35;
  }
  let dragging = false;
  let lastX = 0;
  let lastT = 0;
  let moved = 0;
  let lastFace = 0;
  let lastClink = 0;
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
    S.leanT = ((e.clientX - r.left) / r.width - 0.5) * 0.4;
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(1, now - lastT) / 1000;
    moved += Math.abs(dx);
    S.spin += dx * 0.012;
    S.spinV = S.spinV * 0.4 + ((dx * 0.012) / dt) * 0.6;
    S.thetaV += dx * 0.0016;
    lastX = e.clientX;
    lastT = now;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) {
      // a tap: a flick and a clink
      S.spinV += TAU * 1.6;
      S.thetaV += 0.9;
      sound.clink(0.8);
    } else if (Math.abs(S.spinV) > 9) sound.clink(Math.min(1, Math.abs(S.spinV) / 30));
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
      S.spin += S.spinV * dt;
      S.spinV *= Math.exp(-0.85 * dt);
      if (Math.abs(S.spinV) < 2.2) {
        // settle on the nearest face
        const target = Math.round(S.spin / Math.PI) * Math.PI;
        S.spinV += ((target - S.spin) * 7 - S.spinV * 2.6) * dt;
      }
    }
    S.thetaV += (-16 * S.theta - 1.4 * S.thetaV) * dt;
    S.theta += S.thetaV * dt;
    S.lean += (S.leanT - S.lean) * 0.06;
    // a quiet tick each time a face swings past at speed
    const f = Math.round(S.spin / Math.PI);
    if (f !== lastFace) {
      lastFace = f;
      const now = performance.now();
      if (Math.abs(S.spinV) > 4 && now - lastClink > 110) {
        lastClink = now;
        sound.clink(Math.min(0.5, Math.abs(S.spinV) / 40));
      }
    }
    swing.rotation.z = S.theta + Math.sin(t * 0.9) * 0.015;
    medal.rotation.y = S.spin;
    medal.rotation.x = S.lean * 0.3 + Math.sin(t * 0.7) * 0.03;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (reduced) return renderer.render(scene, camera);
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
      renderer.dispose();
      el.remove();
    },
  };
}

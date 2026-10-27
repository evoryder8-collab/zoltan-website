// The hero laurel: a procedural three.js wreath of pearl leaves with crimson
// berries, lit by a warm key and two crimson rims. Leaves grow in from the
// bottom of each branch, then the wreath leans toward the pointer.
// Renders only while on screen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { laurelLeaves } from '../lib/laurel.js';
import { tilt } from '../lib/tilt.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const backOut = (x) => {
  const c1 = 1.55;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.4, 0.3, 1, 0);
  s.quadraticCurveTo(0.4, -0.3, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.022, bevelSegments: 3, curveSegments: 22 });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    // fold along the midrib, arch along the length, and a slight twist at the tip
    p.setZ(i, p.getZ(i) - Math.abs(y) * 0.42 + Math.sin(clamp(x, 0, 1) * Math.PI) * 0.07);
    p.setY(i, y + x * x * 0.06);
  }
  g.computeVertexNormals();
  return g;
}

function stemCurve(radius, side, start = -97, end = 68) {
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const a = THREE.MathUtils.degToRad(start + ((end - start) * i) / 48);
    pts.push(new THREE.Vector3(Math.cos(a) * radius * side, Math.sin(a) * radius, Math.sin(i * 0.4) * 0.01));
  }
  return new THREE.CatmullRomCurve3(pts);
}

export function mountLaurel(container, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 5.4);

  scene.add(new THREE.HemisphereLight(0xfff2ec, 0x3a0612, 0.55));
  const key = new THREE.DirectionalLight(0xfff0e8, 2.1);
  key.position.set(-1.8, 2.6, 4);
  const rimL = new THREE.DirectionalLight(0xff2443, 3.4);
  rimL.position.set(-4, 1.2, -2.2);
  const rimR = new THREE.DirectionalLight(0xff4a5e, 2.6);
  rimR.position.set(4, -1.2, -2.6);
  const under = new THREE.PointLight(0xff3050, 7, 9);
  under.position.set(0, -2.6, 1.8);
  scene.add(key, rimL, rimR, under);

  const wreath = new THREE.Group();
  scene.add(wreath);

  // leaves
  const R = 1;
  const leaves = laurelLeaves({ pairs: 13, radius: R });
  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xf4ede7,
    roughness: 0.34,
    clearcoat: 1,
    clearcoatRoughness: 0.2,
    sheen: 0.7,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(0xffc4cc),
  });
  const leafMesh = new THREE.InstancedMesh(leafGeometry(), pearl, leaves.length);
  leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const tint = new THREE.Color();
  const base = leaves.map((lf, i) => {
    const roll = (lf.outer ? 0.55 : -0.5) * lf.side;
    const pitch = lf.outer ? -0.22 : 0.18;
    const z = (lf.outer ? 0.04 : -0.05) + Math.sin(i * 1.7) * 0.015;
    tint.setHSL(0.03, 0.25 + Math.random() * 0.12, 0.9 + Math.random() * 0.05);
    leafMesh.setColorAt(i, tint);
    return { pos: new THREE.Vector3(lf.x, lf.y, z), rot: new THREE.Euler(roll, pitch, lf.angle, 'ZYX'), scale: 0.29 * lf.size, f: lf.f };
  });
  wreath.add(leafMesh);

  // stems
  const stemMat = new THREE.MeshPhysicalMaterial({ color: 0xe6d8ce, roughness: 0.45, clearcoat: 0.6 });
  const stems = [1, -1].map((side) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(stemCurve(R, side), 120, 0.013, 8, false), stemMat);
    wreath.add(m);
    return m;
  });

  // crimson berries tucked inside every few nodes
  const berryMat = new THREE.MeshPhysicalMaterial({ color: 0xc3122f, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
  const berries = [];
  for (const side of [1, -1]) {
    for (let i = 1; i < 12; i += 3) {
      const a = THREE.MathUtils.degToRad(-97 + (165 * i) / 12 + 5);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.034, 20, 14), berryMat);
      b.position.set(Math.cos(a) * (R - 0.085) * side, Math.sin(a) * (R - 0.085), 0.03);
      b.userData.f = i / 12;
      wreath.add(b);
      berries.push(b);
    }
  }

  // growth state
  let progress = reduced ? 1 : 0;
  let growing = false;
  let growStart = 0;
  const GROW = 2.6;
  const dummy = new THREE.Object3D();
  const applyGrowth = () => {
    base.forEach((b, i) => {
      const g = clamp((progress * 1.18 - b.f * 0.95) / 0.22, 0, 1);
      const s = g <= 0 ? 0.0001 : b.scale * backOut(g);
      dummy.position.copy(b.pos);
      dummy.rotation.copy(b.rot);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      leafMesh.setMatrixAt(i, dummy.matrix);
    });
    leafMesh.instanceMatrix.needsUpdate = true;
    stems.forEach((m) => m.geometry.setDrawRange(0, Math.floor(m.geometry.index.count * clamp(progress * 1.12, 0, 1) / 6) * 6));
    berries.forEach((b) => b.scale.setScalar(Math.max(0.0001, backOut(clamp((progress - b.userData.f - 0.1) / 0.2, 0, 1)))));
  };
  applyGrowth();

  // pointer lean
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    lean.tx = (e.clientX / innerWidth - 0.5) * 0.55;
    lean.ty = (e.clientY / innerHeight - 0.5) * 0.4;
  };
  addEventListener('pointermove', onMove, { passive: true });

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

  let onScreen = true;
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) start();
  });
  io.observe(container);

  const t0 = performance.now();
  let raf = 0;
  let onDone = null;
  const frame = () => {
    raf = 0;
    if (!onScreen || document.hidden) return;
    const t = (performance.now() - t0) / 1000;
    if (growing) {
      progress = clamp((performance.now() - growStart) / 1000 / GROW, 0, 1);
      applyGrowth();
      if (progress >= 1) {
        growing = false;
        onDone?.();
      }
    }
    if (tilt.active) {
      lean.tx = tilt.x * 0.6;
      lean.ty = tilt.y * 0.45;
    }
    lean.x += (lean.tx - lean.x) * 0.05;
    lean.y += (lean.ty - lean.y) * 0.05;
    wreath.rotation.y = lean.x + Math.sin(t * 0.45) * 0.07;
    wreath.rotation.x = lean.y * 0.8 + Math.cos(t * 0.38) * 0.04;
    wreath.rotation.z = Math.sin(t * 0.25) * 0.02 - scrollY * 0.0006;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (reduced) return renderer.render(scene, camera);
    if (!raf) raf = requestAnimationFrame(frame);
  };
  document.addEventListener('visibilitychange', start);
  start();

  return {
    grow(done) {
      onDone = done;
      if (reduced) return done?.();
      growStart = performance.now();
      growing = true;
      start();
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener('pointermove', onMove);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

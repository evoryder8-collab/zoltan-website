// The championship globe: MapLibre's globe projection in wine and crimson,
// lit from the viewer's side (the sun sits behind the visitor, so the face is
// day, not an eclipse), floating in its own universe (lib/space.js), with
// glowing great-circle arcs from Hungary to each event and comets travelling
// along them. It turns slowly until the visitor takes over.
import { loadMapLibre, darkStyle, restyle } from '../lib/maps.js';
import { greatCircle } from '../lib/geo.js';
import { mountSpace } from '../lib/space.js';
import { t } from '../i18n/index.js';
import { esc } from '../lib/dom.js';
import { sound } from '../lib/audio.js';

export async function mountGlobe(container, { events, home, reduced = false }) {
  const [{ Map, Marker, AttributionControl }, style] = await Promise.all([loadMapLibre(), darkStyle()]);
  // a lit face: rose land, deep plum seas, borders as fine light lines
  restyle(style, { labels: false, colors: { bg: '#6a2131', park: '#702333', water: '#2d101e', boundary: '#f08a9c' } });
  for (const l of style.layers) if (l.id.startsWith('boundary')) l.paint['line-opacity'] = 0.32;
  style.projection = { type: 'globe' };
  // the sun behind the visitor's shoulder, up and to the left
  style.light = { anchor: 'viewport', position: [1.5, 300, 6] };
  style.sky = {
    'sky-color': '#2a0710',
    'horizon-color': '#ff6b7a',
    'fog-color': '#0b0607',
    'sky-horizon-blend': 0.6,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': 0.8,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.85, 4, 0.5, 7, 0],
  };
  const space = mountSpace(container.parentElement.querySelector('.globe__space'), { reduced });

  const placed = events.filter((e) => e.lngLat);
  const small = innerWidth < 720;
  // size the globe to the frame: radius ≈ 42% of its height
  const fit = () => Math.log2(((Math.min(container.clientHeight, container.clientWidth * 0.9) * 0.42) * 2 * Math.PI) / 512);
  // Phones: the map takes no gestures of its own, so a vertical swipe always
  // scrolls the page; a sideways swipe turns the globe (swipeToTurn below).
  // Desktop: drag with the mouse; the wheel always scrolls the page.
  const touch = matchMedia('(pointer: coarse)').matches;
  const map = new Map({
    container,
    style,
    center: [76, 12],
    zoom: fit(),
    attributionControl: false,
    interactive: !touch,
    scrollZoom: false,
    renderWorldCopies: false,
    fadeDuration: 250,
  });
  map.addControl(new AttributionControl({ compact: true }), 'bottom-right');

  const arcs = placed.map((e) => greatCircle(home.lngLat, e.lngLat, 160));
  map.on('load', () => {
    map.addSource('arcs', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: arcs.map((c) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: c }, properties: {} })) },
    });
    map.addLayer({ id: 'arcs-glow', type: 'line', source: 'arcs', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ff3b4e', 'line-width': 7, 'line-blur': 6, 'line-opacity': 0.45 } });
    map.addLayer({ id: 'arcs-core', type: 'line', source: 'arcs', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#f6f1ec', 'line-width': 1.3, 'line-opacity': 0.85 } });
    map.addSource('comets', { type: 'geojson', data: comets(0) });
    map.addLayer({ id: 'comets-glow', type: 'circle', source: 'comets', paint: { 'circle-radius': 9, 'circle-color': '#ff3b4e', 'circle-blur': 1, 'circle-opacity': 0.8 } });
    map.addLayer({ id: 'comets-core', type: 'circle', source: 'comets', paint: { 'circle-radius': 2.6, 'circle-color': '#fff' } });
    container.closest('.globe')?.classList.add('is-ready');
    shade();
    // keep the attribution folded into its (i) button, as on AusMC
    container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  });

  // sunlight on the face and shadow toward the rim, sized to the globe as it
  // zooms; above the map, below the markers
  const limb = document.createElement('div');
  limb.className = 'globe__limb';
  const sheen = document.createElement('div');
  sheen.className = 'globe__sheen';
  map.getCanvas().after(limb, sheen);
  // the globe's outline on screen: a sphere of radius r seen from the camera,
  // which sits D pixels above the map centre (MapLibre's own camera model)
  const outline = () => {
    const lat = Math.min(Math.abs(map.getCenter().lat), 85) * (Math.PI / 180);
    const r = (512 * 2 ** map.getZoom()) / (2 * Math.PI) / Math.cos(lat);
    const fov = (map.getVerticalFieldOfView?.() ?? 36.87) * (Math.PI / 180);
    const D = container.clientHeight / 2 / Math.tan(fov / 2);
    return (D * r) / Math.sqrt(D * D + 2 * D * r);
  };
  let lastLng = null;
  function shade() {
    const c = map.getCenter();
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const r = outline();
    for (const el of [limb, sheen]) {
      el.style.setProperty('--gx', `${cx.toFixed(1)}px`);
      el.style.setProperty('--gy', `${cy.toFixed(1)}px`);
      el.style.setProperty('--gr', `${r.toFixed(1)}px`);
    }
    if (lastLng !== null) space?.turn(c.lng - lastLng);
    lastLng = c.lng;
  }
  map.on('move', shade);
  map.on('resize', shade);

  function comets(time) {
    return {
      type: 'FeatureCollection',
      features: arcs.map((c, i) => {
        const f = (time * 0.09 + i * 0.37) % 1;
        const k = Math.min(c.length - 1, Math.floor(f * (c.length - 1)));
        return { type: 'Feature', geometry: { type: 'Point', coordinates: c[k] }, properties: {} };
      }),
    };
  }

  // markers
  const markers = {};
  const addMarker = (id, lngLat, cls = '') => {
    const el = document.createElement('div');
    el.className = `gmark ${cls}`;
    el.innerHTML = '<span class="gmark__pulse"></span><span class="gmark__core"></span><span class="gmark__label glass"></span>';
    markers[id] = { el, marker: new Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map) };
    return el;
  };
  addMarker('home', home.lngLat, 'gmark--home gmark--below');
  placed.forEach((e) => addMarker(e.id, e.lngLat).addEventListener('click', () => api.flyTo(e.id)));
  const label = () => {
    markers.home.el.querySelector('.gmark__label').innerHTML = esc(t('globe.home'));
    placed.forEach((e) => (markers[e.id].el.querySelector('.gmark__label').innerHTML = esc(t(`champs.events.${e.id}.short`))));
  };
  label();
  addEventListener('langchange', label);

  // slow turn while idle and on screen; comets travel
  let onScreen = false;
  let idleUntil = 0;
  const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting));
  io.observe(container);
  const takeOver = () => (idleUntil = performance.now() + 9000);
  ['mousedown', 'touchstart', 'wheel', 'dragstart'].forEach((ev) => map.on(ev, takeOver));
  if (touch) swipeToTurn(container, map, takeOver);
  let last = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (!onScreen || document.hidden || reduced || now - last < 33) return;
    last = now;
    map.getSource('comets')?.setData(comets(now / 1000));
    if (now > idleUntil && !map.isMoving()) {
      const c = map.getCenter();
      map.jumpTo({ center: [c.lng + 0.045, c.lat] });
    }
  };
  requestAnimationFrame(loop);

  const api = {
    flyTo(id) {
      const e = placed.find((x) => x.id === id);
      if (!e) return;
      idleUntil = performance.now() + 14000;
      Object.entries(markers).forEach(([k, m]) => m.el.classList.toggle('is-active', k === id));
      map.flyTo({ center: e.lngLat, zoom: small ? 2.6 : 3.4, duration: reduced ? 0 : 3200, curve: 1.5, essential: true });
      sound.whoosh(2.2);
    },
  };
  return api;
}

/** Sideways swipes turn the globe, with momentum; vertical swipes scroll the page. */
function swipeToTurn(container, map, takeOver) {
  container.style.touchAction = 'pan-y';
  let start = null;
  let turning = false;
  let lastX = 0;
  let lastT = 0;
  let vel = 0; // degrees per ms
  let glide = 0;
  const degPerPx = () => 360 / (512 * 2 ** map.getZoom());
  const turn = (deg) => {
    const c = map.getCenter();
    map.jumpTo({ center: [c.lng - deg, c.lat] });
  };
  container.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || !e.isPrimary) return;
    cancelAnimationFrame(glide);
    start = { x: e.clientX, y: e.clientY };
    lastX = e.clientX;
    lastT = performance.now();
    turning = false;
    vel = 0;
    takeOver();
  });
  container.addEventListener('pointermove', (e) => {
    if (!start || e.pointerType !== 'touch') return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!turning) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        turning = true;
        try {
          container.setPointerCapture(e.pointerId);
        } catch {}
      } else if (Math.abs(dy) > 10) {
        start = null; // the page is scrolling
        return;
      } else return;
    }
    const now = performance.now();
    const step = (e.clientX - lastX) * degPerPx();
    turn(step);
    vel = step / Math.max(8, now - lastT);
    lastX = e.clientX;
    lastT = now;
    takeOver();
  });
  const release = () => {
    if (!start) return;
    start = null;
    if (!turning || performance.now() - lastT > 90) return;
    let prev = performance.now();
    const coast = (now) => {
      const dt = now - prev;
      prev = now;
      turn(vel * dt);
      vel *= Math.exp(-dt / 420);
      if (Math.abs(vel) > 0.0004) glide = requestAnimationFrame(coast);
    };
    glide = requestAnimationFrame(coast);
  };
  container.addEventListener('pointerup', release);
  container.addEventListener('pointercancel', () => (start = null));
}

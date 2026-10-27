// The championship globe: MapLibre's globe projection in wine and crimson,
// with glowing great-circle arcs from Hungary to each event and comets
// travelling along them. It turns slowly until the visitor takes over.
import { loadMapLibre, darkStyle, restyle } from '../lib/maps.js';
import { greatCircle } from '../lib/geo.js';
import { t } from '../i18n/index.js';
import { esc } from '../lib/dom.js';
import { sound } from '../lib/audio.js';

export async function mountGlobe(container, { events, home, reduced = false }) {
  const [{ Map, Marker, AttributionControl }, style] = await Promise.all([loadMapLibre(), darkStyle()]);
  restyle(style, { labels: false });
  style.projection = { type: 'globe' };
  style.sky = {
    'sky-color': '#2a0710',
    'horizon-color': '#ff3b4e',
    'fog-color': '#0b0607',
    'sky-horizon-blend': 0.6,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': 0.8,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.6, 7, 0],
  };

  const placed = events.filter((e) => e.lngLat);
  const small = innerWidth < 720;
  // size the globe to the frame: radius ≈ 42% of its height
  const fit = () => Math.log2(((Math.min(container.clientHeight, container.clientWidth * 0.9) * 0.42) * 2 * Math.PI) / 512);
  const map = new Map({
    container,
    style,
    center: [76, 12],
    zoom: fit(),
    attributionControl: false,
    cooperativeGestures: true,
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
  });

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
  addMarker('home', home.lngLat, 'gmark--home');
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

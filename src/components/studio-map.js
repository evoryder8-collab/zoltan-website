// The studio map: opens over Hungary with both studios pinned, then flies in
// to the selected one with crimson 3D buildings and a slow orbit while it's on
// screen. The switch above the map (sections.js) picks the studio;
// "Bring me here" is in directions.js.
import { loadMapLibre, darkStyle, restyle } from '../lib/maps.js';
import { drawLaurelSvg } from '../lib/laurel.js';
import { sound } from '../lib/audio.js';

export async function mountStudioMap(container, { locations, reduced = false }) {
  const [{ Map, Marker, AttributionControl }, style] = await Promise.all([loadMapLibre(), darkStyle()]);
  restyle(style, { buildings: true });
  const frame = container.closest('.studio');
  const map = new Map({
    container,
    style,
    center: [19.9, 47.65],
    zoom: innerWidth < 720 ? 5.6 : 6.4,
    pitch: 0,
    attributionControl: false,
    // phones: display only, so the page always scrolls; desktop: drag, no wheel zoom
    interactive: !matchMedia('(pointer: coarse)').matches,
    scrollZoom: false,
    maxPitch: 70,
    maxTileCacheSize: 800, // keep both studios' streets in memory
  });
  map.addControl(new AttributionControl({ compact: true }), 'bottom-right');

  let current = locations[0];
  const pins = {};
  for (const loc of locations) {
    const el = document.createElement('div');
    el.className = 'smark';
    el.innerHTML = '<svg class="smark__laurel laurel-svg is-static" viewBox="-120 -120 240 240" aria-hidden="true"></svg><span class="smark__core"></span>';
    drawLaurelSvg(el.querySelector('svg'), { radius: 80, pairs: 8, stroke: 3 });
    el.addEventListener('click', () => document.querySelector(`#studio-switch [data-studio="${loc.id}"]`)?.click());
    pins[loc.id] = el;
    new Marker({ element: el, anchor: 'center' }).setLngLat(loc.lngLat).addTo(map);
  }
  const mark = () => Object.entries(pins).forEach(([id, el]) => el.classList.toggle('is-active', id === current.id));
  mark();

  let orbit = 0;
  let onScreen = false;
  let flown = false;
  const stopOrbit = () => {
    cancelAnimationFrame(orbit);
    orbit = 0;
  };
  const startOrbit = () => {
    if (reduced || orbit) return;
    const step = () => {
      orbit = requestAnimationFrame(step);
      if (onScreen && !document.hidden && !map.isMoving()) map.setBearing(map.getBearing() + 0.06);
    };
    orbit = requestAnimationFrame(step);
  };
  ['mousedown', 'touchstart', 'wheel', 'dragstart'].forEach((ev) => map.on(ev, stopOrbit));

  let token = 0;
  const fly = (first = false) => {
    stopOrbit();
    const mine = ++token;
    map.flyTo({ center: current.lngLat, zoom: innerWidth < 720 ? 15 : 15.8, pitch: 60, bearing: first ? -22 : map.getBearing() + 40, duration: reduced ? 0 : first ? 5200 : 3600, curve: 1.6, essential: true });
    // only the latest flight may start the orbit
    map.once('moveend', () => mine === token && startOrbit());
    sound.whoosh(first ? 2.6 : 2);
  };
  addEventListener('studiochange', (e) => {
    current = locations.find((l) => l.id === e.detail.id) || current;
    mark();
    if (flown) fly();
  });

  const io = new IntersectionObserver(
    ([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen && map.loaded() && !flown) {
        flown = true;
        fly(true);
      }
    },
    { threshold: 0.35 },
  );
  // Warm the tile cache while the map is still hidden: the zoomed-out view a
  // flight passes through, then each studio exactly as the camera will frame
  // it, so a switch never starts on a blank map. Coarse tiles also stand in
  // while sharper ones arrive.
  const settled = () => new Promise((r) => {
    map.once('idle', r);
    setTimeout(r, 4000);
  });
  const warm = async () => {
    const lng = locations.reduce((a, l) => a + l.lngLat[0], 0) / locations.length;
    const lat = locations.reduce((a, l) => a + l.lngLat[1], 0) / locations.length;
    for (const z of [7, 9.5]) {
      map.jumpTo({ center: [lng, lat], zoom: z, pitch: 0, bearing: 0 });
      await settled();
    }
    for (const loc of [...locations].reverse()) {
      map.jumpTo({ center: loc.lngLat, zoom: innerWidth < 720 ? 15 : 15.8, pitch: 60, bearing: -22 });
      await settled();
    }
    map.jumpTo({ center: [19.9, 47.65], zoom: innerWidth < 720 ? 5.6 : 6.4, pitch: 0, bearing: 0 });
    await settled();
  };
  map.on('load', async () => {
    await warm();
    frame.classList.add('is-ready');
    container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
    io.observe(container);
  });
  return map;
}

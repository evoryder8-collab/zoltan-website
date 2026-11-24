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
import { icon } from '../lib/icons.js';
import { sound } from '../lib/audio.js';

// the universe outlives the globe: a phone lets the map go when it is far
// away (championships.js) and builds a new one on the way back
let space = null;
const GOLD = '#e0b56d';

export async function mountGlobe(container, { events, home, reduced = false }) {
  const [{ Map, Marker, AttributionControl }, style] = await Promise.all([loadMapLibre(), darkStyle()]);
  // a lit face: rose land, deep plum seas, borders as fine light lines
  restyle(style, { labels: false, colors: { bg: '#6a2131', park: '#702333', water: '#2d101e', boundary: '#f08a9c' } });
  // land, sea and country borders only: no regions, roads or rail when zoomed in
  style.layers = style.layers.filter((l) => !/^(boundary_state|highway|road|railway|aeroway)/.test(l.id));
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
  const frame = container.closest('.globe');
  space ??= mountSpace(frame.querySelector('.globe__space'), { reduced });
  const gone = new AbortController();
  const { signal } = gone;

  // One pin per city. An event is upcoming until its last day is over, so the
  // globe moves each one to "competed" by itself; Copenhagen holds both.
  const today = new Date().toISOString().slice(0, 10);
  const isNext = (e) => e.end >= today;
  const places = [];
  for (const e of events.filter((x) => x.lngLat)) {
    const key = e.lngLat.join();
    let place = places.find((x) => x.key === key);
    if (!place) places.push((place = { key, lngLat: e.lngLat, events: [] }));
    place.events.push(e);
  }
  for (const place of places) {
    const next = place.events.filter(isNext).length;
    place.status = next === 0 ? 'past' : next === place.events.length ? 'next' : 'both';
  }
  // labels are placed in this order when pins crowd: overall titles, then
  // the rest he competed in, then the upcoming ones (each in date order)
  const rank = (place) => (place.events.some((e) => e.featured) ? 0 : place.status === 'next' ? 2 : 1);
  places.sort((a, b) => rank(a) - rank(b));

  const small = innerWidth < 720;
  // size the globe to the frame: radius ≈ 42% of its height
  const fit = () => Math.log2(((Math.min(container.clientHeight, container.clientWidth * 0.9) * 0.42) * 2 * Math.PI) / 512);
  // the whole globe at rest, tipped to show both Hungary and Sydney; a fly-in
  // or a zoom leaves it, and the globe comes back to it afterwards
  const REST_LAT = 12;
  const resting = () => ({ zoom: fit(), lat: REST_LAT });
  const away = () => map.getZoom() - fit() > 0.05 || Math.abs(map.getCenter().lat - REST_LAT) > 0.5;
  // Phones: one finger never moves the map, so a vertical swipe always scrolls
  // the page; a sideways swipe turns the globe (swipeToTurn below), and two
  // fingers move and pinch it. Desktop: drag with the mouse; the wheel scrolls
  // the page and a trackpad pinch (Ctrl + wheel) zooms. Both have + and −.
  const touch = matchMedia('(pointer: coarse)').matches;
  const map = new Map({
    container,
    style,
    center: [76, REST_LAT],
    zoom: fit(),
    maxZoom: 6,
    attributionControl: false,
    scrollZoom: false,
    boxZoom: false,
    cooperativeGestures: touch,
    doubleClickZoom: !touch,
    dragRotate: !touch,
    touchPitch: false,
    renderWorldCopies: false,
    fadeDuration: 250,
    pixelRatio: Math.min(devicePixelRatio || 1, 2), // 3x screens draw at 2x: half the GPU memory
  });
  map.touchZoomRotate.disableRotation();
  const floor = () => map.setMinZoom(fit() - 0.5);
  floor();
  map.on('resize', floor);
  map.addControl(new AttributionControl({ compact: true }), 'bottom-right');

  container.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    map.zoomTo(map.getZoom() - e.deltaY * 0.01, { duration: 0 }, { originalEvent: e });
  }, { passive: false, signal });
  for (const b of frame.querySelectorAll('[data-zoom]')) {
    b.addEventListener('click', (e) => map[b.dataset.zoom > 0 ? 'zoomIn' : 'zoomOut']({ duration: reduced ? 0 : 450 }, { originalEvent: e }), { signal });
  }

  // arcs from home: solid with travelling comets for the journeys made, a
  // dashed gold line for the ones to come
  const arcs = places.map((place) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: greatCircle(home.lngLat, place.lngLat, 160) },
    properties: { next: place.status === 'next' },
  }));
  const travelled = arcs.filter((a) => !a.properties.next).map((a) => a.geometry.coordinates);
  map.on('load', () => {
    map.addSource('arcs', { type: 'geojson', data: { type: 'FeatureCollection', features: arcs } });
    const made = ['!', ['get', 'next']];
    map.addLayer({ id: 'arcs-glow', type: 'line', source: 'arcs', filter: made, layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ff3b4e', 'line-width': 7, 'line-blur': 6, 'line-opacity': 0.45 } });
    map.addLayer({ id: 'arcs-core', type: 'line', source: 'arcs', filter: made, layout: { 'line-cap': 'round' }, paint: { 'line-color': '#f6f1ec', 'line-width': 1.3, 'line-opacity': 0.85 } });
    map.addLayer({ id: 'arcs-next', type: 'line', source: 'arcs', filter: ['get', 'next'], paint: { 'line-color': GOLD, 'line-width': 1.4, 'line-opacity': 0.8, 'line-dasharray': [2, 3] } });
    map.addSource('comets', { type: 'geojson', data: comets(0) });
    map.addLayer({ id: 'comets-glow', type: 'circle', source: 'comets', paint: { 'circle-radius': 9, 'circle-color': '#ff3b4e', 'circle-blur': 1, 'circle-opacity': 0.8 } });
    map.addLayer({ id: 'comets-core', type: 'circle', source: 'comets', paint: { 'circle-radius': 2.6, 'circle-color': '#fff' } });
    frame.classList.add('is-ready');
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
      features: travelled.map((c, i) => {
        const f = (time * 0.09 + i * 0.37) % 1;
        const k = Math.min(c.length - 1, Math.floor(f * (c.length - 1)));
        return { type: 'Feature', geometry: { type: 'Point', coordinates: c[k] }, properties: {} };
      }),
    };
  }

  // pins: home, then one per city
  const pins = [];
  const addPin = (lngLat, cls, prefer) => {
    const el = document.createElement('div');
    el.className = `gmark ${cls}`;
    el.innerHTML = '<span class="gmark__pulse"></span><span class="gmark__core"></span><span class="gmark__label glass"></span>';
    // a marker on the far side is hidden, not ghosted over whatever faces the camera
    new Marker({ element: el, anchor: 'center', opacityWhenCovered: '0' }).setLngLat(lngLat).addTo(map);
    const pin = { el, label: el.lastChild, lngLat, prefer, side: null, size: null, xy: null };
    pins.push(pin);
    return pin;
  };
  const homePin = addPin(home.lngLat, 'gmark--home', 'bottom');
  for (const place of places) {
    place.pin = addPin(place.lngLat, `gmark--${place.status}`, 'top');
    place.pin.rank = rank(place);
    place.pin.el.addEventListener('click', () => api.flyTo(place.events[0].id), { signal });
  }
  // home's label gives way only to the overall titles
  pins.sort((a, b) => (a.rank ?? 0.5) - (b.rank ?? 0.5));
  const label = () => {
    homePin.label.textContent = t('globe.home');
    for (const place of places) {
      place.pin.label.textContent = [t(`champs.events.${place.events[0].id}.city`), ...place.events.map((e) => e.end.slice(0, 4))].join(' · ');
    }
    for (const pin of pins) pin.size = null;
    if (shown) open(shown);
    map.triggerRepaint();
  };

  // Labels never overlap. Each frame the pins are laid out in turn (the one
  // tapped, then by rank): a label takes the first side of its pin, from the
  // one it prefers, that stays inside the frame and clear of the other pins,
  // the labels already placed and the frame's own buttons and card. With no
  // side free it waits for a zoom; its pin still shows.
  let activePin = null;
  const furniture = [...frame.querySelectorAll('.globe__legend, .globe__zoom, .globe__hint')];
  function layout() {
    const box = container.getBoundingClientRect();
    const W = box.width;
    const H = box.height;
    const taken = [...furniture, panel]
      .filter((el) => el?.getClientRects().length)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return [r.left - box.left - 6, r.top - box.top - 6, r.width + 12, r.height + 12];
      });
    const order = activePin ? [activePin, ...pins.filter((p) => p !== activePin)] : pins;
    const live = order.filter((p) => !p.el.classList.contains('maplibregl-marker-covered'));
    for (const p of live) {
      p.size ??= [p.label.offsetWidth, p.label.offsetHeight];
      p.xy = map.project(p.lngLat);
      taken.push([p.xy.x - 9, p.xy.y - 9, 18, 18]);
    }
    for (const p of order) {
      let side = 'none';
      if (live.includes(p)) {
        for (const s of [p.prefer, ...SIDES]) {
          const r = beside(s, p.xy, p.size);
          if (r[0] >= 6 && r[1] >= 6 && r[0] + r[2] <= W - 6 && r[1] + r[3] <= H - 6 && !taken.some((q) => overlaps(q, r))) {
            side = s;
            taken.push(r);
            break;
          }
        }
      }
      if (p.side !== side) p.el.dataset.side = p.side = side;
    }
  }
  map.on('render', layout);

  // tap a pin: its championships, with dates and any titles, in a card
  const panel = document.createElement('section');
  panel.className = 'gpanel glass';
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  frame.append(panel);
  let shown = null;
  const open = (place) => {
    shown = place;
    panel.innerHTML =
      `<button type="button" class="gpanel__close" aria-label="${esc(t('globe.close'))}">${icon('close')}</button>` +
      place.events
        .map((e) => {
          const ev = t(`champs.events.${e.id}`);
          const next = isNext(e);
          return `
          <article class="gpanel__event${next ? ' is-next' : ''}">
            <p class="gpanel__meta"><span class="gpanel__chip">${esc(t(next ? 'globe.next' : 'globe.past'))}</span><span>${esc(ev.date)}</span></p>
            <h3 class="gpanel__name">${esc(ev.name)}</h3>
            ${ev.note ? `<p class="gpanel__note">${esc(ev.note)}</p>` : ''}
            <p class="gpanel__place">${icon('pin')}<span>${esc(ev.place)}</span></p>
            ${ev.titles ? `<ul class="gpanel__titles">${ev.titles.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          </article>`;
        })
        .join('');
    panel.hidden = false;
    frame.classList.add('has-panel');
    idleUntil = Infinity;
  };
  const close = () => {
    shown = null;
    panel.hidden = true;
    frame.classList.remove('has-panel');
    activePin = null;
    pins.forEach((p) => p.el.classList.remove('is-active'));
    idle(4000);
  };
  panel.addEventListener('click', (e) => e.target.closest('.gpanel__close') && close(), { signal });
  label();
  addEventListener('langchange', label, { signal });

  // slow turn while idle and on screen; comets travel. While a card is open
  // the globe stays where the visitor left it.
  let onScreen = false;
  let idleUntil = 0;
  const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting));
  io.observe(container);
  const idle = (ms) => (idleUntil = shown ? Infinity : performance.now() + ms);
  const takeOver = () => idle(9000);
  ['mousedown', 'touchstart', 'dragstart'].forEach((ev) => map.on(ev, takeOver));
  map.on('zoomstart', (e) => e.originalEvent && idle(20000));
  const halt = touch ? swipeToTurn(container, map, { takeOver, resting, away, signal }) : () => {};
  let last = 0;
  let raf = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (!onScreen || document.hidden || reduced || now - last < 33) return;
    last = now;
    map.getSource('comets')?.setData(comets(now / 1000));
    if (now > idleUntil && !map.isMoving()) {
      const c = map.getCenter();
      // after a fly-in or a zoom, back out to the whole globe first, then the slow turn resumes
      if (away()) map.easeTo({ center: [c.lng, REST_LAT], zoom: fit(), duration: 2600 });
      else map.jumpTo({ center: [c.lng + 0.045, c.lat] });
    }
  };
  raf = requestAnimationFrame(loop);

  const api = {
    flyTo(id) {
      const place = places.find((x) => x.events.some((e) => e.id === id));
      if (!place) return;
      activePin = place.pin;
      pins.forEach((p) => p.el.classList.toggle('is-active', p === activePin));
      open(place);
      halt();
      // the pin settles in the middle of what the card leaves uncovered
      const offset = [0, -(panel.offsetHeight / 2)];
      map.flyTo({ center: place.lngLat, zoom: Math.max(map.getZoom(), small ? 2.6 : 3.4), offset, duration: reduced ? 0 : 3200, curve: 1.5, essential: true });
      sound.whoosh(2.2);
    },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      halt();
      gone.abort();
      map.remove();
      panel.remove();
      frame.classList.remove('is-ready', 'has-panel');
    },
  };
  return api;
}

// a label's box beside its pin (pins are 22 px; labels keep 8 px clear)
const SIDES = ['top', 'right', 'left', 'bottom'];
function beside(side, { x, y }, [w, h]) {
  if (side === 'top') return [x - w / 2, y - 19 - h, w, h];
  if (side === 'bottom') return [x - w / 2, y + 19, w, h];
  if (side === 'right') return [x + 19, y - h / 2, w, h];
  return [x - 19 - w, y - h / 2, w, h];
}
const overlaps = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

/**
 * Sideways swipes turn the globe, with momentum; vertical swipes scroll the page.
 * A swipe only turns the longitude, so one that starts close over an event
 * after a fly-in also eases the camera back out to the whole globe: otherwise
 * it would slide along that one latitude, Sydney's being mostly ocean.
 */
function swipeToTurn(container, map, { takeOver, resting, away, signal }) {
  container.style.touchAction = 'pan-y';
  let start = null;
  let turning = false;
  let lastX = 0;
  let lastT = 0;
  let vel = 0; // degrees per ms
  let glide = 0;
  let settle = 0;
  const settleOut = () => {
    cancelAnimationFrame(settle);
    let prev = performance.now();
    const step = (now) => {
      const k = 1 - Math.exp(-(now - prev) / 260);
      prev = now;
      const { zoom, lat } = resting();
      const c = map.getCenter();
      const z = map.getZoom();
      const there = Math.abs(zoom - z) < 0.004 && Math.abs(lat - c.lat) < 0.03;
      // only zoom and latitude: the finger keeps the longitude
      map.jumpTo({ center: [c.lng, there ? lat : c.lat + (lat - c.lat) * k], zoom: there ? zoom : z + (zoom - z) * k });
      if (!there) settle = requestAnimationFrame(step);
    };
    settle = requestAnimationFrame(step);
  };
  const degPerPx = () => 360 / (512 * 2 ** map.getZoom());
  const turn = (deg) => {
    const c = map.getCenter();
    map.jumpTo({ center: [c.lng - deg, c.lat] });
  };
  container.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    if (!e.isPrimary) {
      start = null; // a second finger: it's a pinch, MapLibre zooms
      turning = false;
      return;
    }
    cancelAnimationFrame(glide);
    start = { x: e.clientX, y: e.clientY };
    lastX = e.clientX;
    lastT = performance.now();
    turning = false;
    vel = 0;
    takeOver();
  }, { signal });
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
        if (away()) settleOut();
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
  }, { signal });
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
  container.addEventListener('pointerup', release, { signal });
  container.addEventListener('pointercancel', () => (start = null), { signal });
  // a fly-in takes the camera: stop any glide or settle that would cut it short
  return () => {
    cancelAnimationFrame(glide);
    cancelAnimationFrame(settle);
  };
}

// Shared MapLibre setup for the championship globe and the studio map:
// lazy-loads the library and recolours OpenFreeMap's dark style into
// Zoltan's wine and crimson (after the AusMC landing page's navy restyle).

let lib = null;
export function loadMapLibre() {
  lib ??= Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url').then((m) => m.default),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]).then(([m, workerUrl]) => {
    m.setWorkerUrl(workerUrl);
    return m;
  });
  return lib;
}

let base = null;
export async function darkStyle() {
  base ??= fetch('https://tiles.openfreemap.org/styles/dark').then((r) => {
    if (!r.ok) throw new Error(`style HTTP ${r.status}`);
    return r.json();
  });
  return structuredClone(await base);
}

const C = {
  bg: '#1a0b0f',
  water: '#0a0406',
  park: '#1f0d12',
  road: '#33141b',
  roadMajor: '#4a1823',
  motorway: '#7a1d2e',
  rail: '#2a1014',
  text: '#ecd9d2',
  halo: '#0b0607',
  boundary: '#6e2030',
};

export function restyle(style, { buildings = false, labels = true } = {}) {
  style.layers = style.layers.filter((l) => l.id !== 'building' && (labels || l.type !== 'symbol'));
  for (const l of style.layers) {
    const p = (l.paint = l.paint || {});
    const id = l.id;
    if (l.type === 'background') p['background-color'] = C.bg;
    else if (id === 'water') p['fill-color'] = C.water;
    else if (id === 'waterway') p['line-color'] = C.water;
    else if (id.startsWith('landuse_residential')) p['fill-color'] = C.bg;
    else if (id.startsWith('landcover') || id.startsWith('landuse_park')) p['fill-color'] = C.park;
    else if (id.startsWith('highway_motorway')) p['line-color'] = C.motorway;
    else if (id.startsWith('highway_major')) p['line-color'] = C.roadMajor;
    else if (id.startsWith('highway') || id.startsWith('road')) {
      if (l.type === 'line') p['line-color'] = C.road;
      if (l.type === 'fill') p['fill-color'] = C.road;
    } else if (id.startsWith('railway')) p['line-color'] = C.rail;
    else if (id.startsWith('boundary')) p['line-color'] = C.boundary;
    else if (id.startsWith('aeroway')) {
      if (l.type === 'line') p['line-color'] = C.road;
      if (l.type === 'fill') p['fill-color'] = C.bg;
    }
    if (l.type === 'symbol' && l.layout?.['text-field']) {
      p['text-color'] = id === 'water_name' ? '#9a6a74' : C.text;
      p['text-halo-color'] = C.halo;
      p['text-halo-width'] = 1.2;
    }
  }
  if (buildings) {
    const labelIdx = style.layers.findIndex((l) => l.type === 'symbol');
    style.layers.splice(labelIdx < 0 ? style.layers.length : labelIdx, 0, {
      id: 'zoltan-buildings',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0], 0, '#2a0d14', 30, '#4d1220', 90, '#8a1a30', 200, '#c3122f'],
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, ['coalesce', ['get', 'render_height'], 0]],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.9,
      },
    });
  }
  return style;
}

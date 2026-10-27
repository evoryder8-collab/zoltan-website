// Crimson silk: domain-warped noise folded into soft highlights, rendered at
// reduced resolution (it is all soft light, so upscaling is invisible) and
// throttled to ~30fps so the glass panels on top stay cheap. Pointer or touch
// down sends a warm ripple through the cloth, like pressure on a muscle.

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform float uLevel;
uniform vec3 uRip[6];

vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  // ripples: expanding rings that push the cloth outward and glow warm
  vec2 disp = vec2(0.0);
  float glow = 0.0;
  for (int i = 0; i < 6; i++) {
    vec3 r = uRip[i];
    float age = uTime - r.z;
    if (age > 0.0 && age < 3.2) {
      vec2 rp = (r.xy * uRes - 0.5 * uRes) / uRes.y;
      vec2 d = p - rp;
      float len = length(d) + 1e-4;
      float ring = len - age * 0.42;
      float w = exp(-ring * ring * 70.0) * exp(-age * 1.15);
      disp += (d / len) * w * 0.07;
      glow += w;
    }
  }

  vec2 q = p + disp;
  float t = uTime * 0.035;
  vec2 m = (uMouse - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  q += (m - q) * 0.035 * exp(-dot(q - m, q - m) * 2.0);

  vec2 w1 = vec2(snoise(q * 0.62 + vec2(t, -t * 0.6)), snoise(q * 0.62 + vec2(-t * 0.7, t) + 4.3));
  vec2 w2 = vec2(snoise(q * 0.95 + w1 * 1.1 + vec2(1.7, 9.2) + t), snoise(q * 0.95 + w1 * 1.1 + vec2(8.3, 2.8) - t));
  float n = snoise(q * 0.55 + w2 * 0.7 + vec2(0.0, uScroll * 0.12));
  float folds = 0.5 + 0.5 * sin((q.x * 1.2 + q.y * 0.8 + n * 1.5 + w1.x * 0.5) * 1.7 + t * 4.0);

  vec3 ink = vec3(0.035, 0.016, 0.02);
  vec3 wine = vec3(0.19, 0.025, 0.05);
  vec3 crimson = vec3(0.70, 0.06, 0.16);
  vec3 ember = vec3(1.0, 0.24, 0.30);

  float body = smoothstep(-0.35, 1.0, n) * uLevel;
  vec3 col = mix(ink, wine, body * 0.9);
  col = mix(col, crimson, pow(folds, 6.0) * body * 0.42);
  col += ember * pow(folds, 24.0) * 0.13 * body;
  col += vec3(1.0, 0.86, 0.82) * pow(folds, 70.0) * 0.05 * body;
  col += ember * glow * 0.32;
  col += crimson * exp(-dot(p - m, p - m) * 5.0) * 0.06 * uLevel;

  // vignette into ink, darker at the bottom where the copy sits
  vec2 v = uv - vec2(0.5, 0.56);
  col *= 1.0 - smoothstep(0.25, 0.95, length(v * vec2(1.1, 1.35)));
  // ordered dither against banding in the dark gradients
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

export function initSilk(canvas, { reduced = false } = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  const api = { ripple() {}, setLevel() {}, ok: false };
  if (!gl) {
    document.documentElement.classList.add('no-webgl');
    return api;
  }
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn('[silk] falling back to CSS', err);
    document.documentElement.classList.add('no-webgl');
    return api;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const u = { res: U('uRes'), time: U('uTime'), mouse: U('uMouse'), scroll: U('uScroll'), level: U('uLevel'), rip: U('uRip') };

  const rips = new Float32Array(18).fill(-99);
  let ripIdx = 0;
  const mouse = { x: 0.5, y: 0.6, tx: 0.5, ty: 0.6 };
  let level = 0;
  let levelTarget = 1;
  const start = performance.now();
  const now = () => (performance.now() - start) / 1000;

  const SCALE = 0.5;
  const resize = () => {
    const w = Math.max(2, Math.round(innerWidth * SCALE));
    const h = Math.max(2, Math.round(innerHeight * SCALE));
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  };
  resize();
  addEventListener('resize', resize);

  addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX / innerWidth;
    mouse.ty = 1 - e.clientY / innerHeight;
  }, { passive: true });

  const draw = () => {
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    level += (levelTarget - level) * 0.04;
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.time, reduced ? 12 : now());
    gl.uniform2f(u.mouse, mouse.x, mouse.y);
    gl.uniform1f(u.scroll, scrollY / innerHeight);
    gl.uniform1f(u.level, reduced ? levelTarget : level);
    gl.uniform3fv(u.rip, rips);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  let last = 0;
  let raf = 0;
  const loop = (t) => {
    raf = requestAnimationFrame(loop);
    if (t - last < 32) return;
    last = t;
    draw();
  };
  if (reduced) {
    draw();
    addEventListener('resize', draw);
  } else {
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    });
  }
  canvas.classList.add('is-on');

  api.ok = true;
  api.ripple = (x, y) => {
    if (reduced) return;
    rips[ripIdx * 3] = x / innerWidth;
    rips[ripIdx * 3 + 1] = 1 - y / innerHeight;
    rips[ripIdx * 3 + 2] = now();
    ripIdx = (ripIdx + 1) % 6;
  };
  api.setLevel = (v) => {
    levelTarget = v;
    if (reduced) draw();
  };
  return api;
}

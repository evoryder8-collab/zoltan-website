// A pool of live crimson silk behind the hero portrait: the background's
// domain-warped noise, kept quiet (low highlights, slow, faint at the edges)
// so it reads as liquid moving softly behind him rather than a shape. Low
// resolution, ~30fps, only while on screen; tilt or pointer leans the flow.
import { tilt } from './tilt.js';

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLean;

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
  vec2 p = (uv - 0.5) * 2.0;
  float r = length(p);
  float t = uTime * 0.075;
  vec2 q = p * 1.15 + uLean * 0.3;
  vec2 w1 = vec2(snoise(q * 0.85 + vec2(t, -t * 0.7)), snoise(q * 0.85 + vec2(-t * 0.6, t) + 3.1));
  vec2 w2 = vec2(snoise(q * 1.5 + w1 * 1.3 + vec2(1.7, 9.2) + t * 0.8), snoise(q * 1.5 + w1 * 1.3 + vec2(8.3, 2.8) - t * 0.8));
  float n = snoise(q * 0.75 + w2 * 0.9);
  float folds = 0.5 + 0.5 * sin((q.x * 1.3 + q.y * 0.9 + n * 2.2 + w1.y * 0.7) * 2.3 + t * 6.0);

  vec3 wine = vec3(0.26, 0.02, 0.06);
  vec3 crimson = vec3(0.80, 0.06, 0.17);
  vec3 ember = vec3(1.0, 0.27, 0.33);
  float body = smoothstep(-0.6, 1.0, n);
  vec3 col = mix(wine, crimson, body * 0.8);
  col = mix(col, ember, pow(folds, 8.0) * 0.38);
  col += vec3(1.0, 0.86, 0.86) * pow(folds, 42.0) * 0.1;

  // soft circular falloff, breathing with the cloth
  float edge = smoothstep(1.0, 0.0, r);
  float mask = edge * edge * (0.4 + 0.35 * body) * 0.6;
  gl_FragColor = vec4(col * mask, mask);
}`;

export function mountAura(canvas, { reduced = false } = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  try {
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
  } catch (err) {
    console.warn('[aura] unavailable', err);
    return null;
  }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uLean = gl.getUniformLocation(prog, 'uLean');
  gl.clearColor(0, 0, 0, 0);

  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => {
    lean.tx = e.clientX / innerWidth - 0.5;
    lean.ty = 0.5 - e.clientY / innerHeight;
  }, { passive: true });

  const SCALE = 0.55;
  const resize = () => {
    const w = Math.max(2, Math.round(canvas.clientWidth * SCALE * Math.min(devicePixelRatio || 1, 2)));
    const h = Math.max(2, Math.round(canvas.clientHeight * SCALE * Math.min(devicePixelRatio || 1, 2)));
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    if (reduced) draw(8);
  };
  const start = performance.now();
  const draw = (time) => {
    if (tilt.active) {
      lean.tx = tilt.x;
      lean.ty = -tilt.y;
    }
    lean.x += (lean.tx - lean.x) * 0.05;
    lean.y += (lean.ty - lean.y) * 0.05;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, time);
    gl.uniform2f(uLean, lean.x, lean.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  if (reduced) return { ok: true };

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  let last = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (!visible || document.hidden || now - last < 33) return;
    last = now;
    draw((now - start) / 1000);
  };
  requestAnimationFrame(loop);
  return { ok: true };
}

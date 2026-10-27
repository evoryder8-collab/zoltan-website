// Sound design, all synthesised with the Web Audio API: no audio files, so
// every sound stays in step with the motion that triggers it. Nothing plays
// until the visitor turns sound on; the choice is remembered.

const STORE = 'zoltan.sound';
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// D major pentatonic, the same family the laurel chime and hovers draw from
const PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90];

class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.lastHover = 0;
    this.pad = null;
    this.supported = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  }

  get saved() {
    try {
      return localStorage.getItem(STORE) === 'on';
    } catch {
      return false;
    }
  }

  /** Must run inside a user gesture the first time (browser autoplay rules). */
  enable(on) {
    this.enabled = !!on && this.supported;
    try {
      localStorage.setItem(STORE, this.enabled ? 'on' : 'off');
    } catch {}
    if (this.enabled) {
      this.boot();
      this.ctx.resume?.();
      this.ambient(true);
    } else {
      this.ambient(false);
    }
    dispatchEvent(new CustomEvent('soundchange', { detail: { on: this.enabled } }));
  }

  boot() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(comp).connect(ctx.destination);
    // a soft hall made from decaying noise, for chimes and whooshes
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(2.6, 3.2);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.32;
    this.verb.connect(this.wet).connect(this.master);
    this.noiseBuf = this.noise(1.5);
  }

  impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  noise(seconds) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  ready() {
    return this.enabled && this.ctx && this.ctx.state !== 'closed';
  }

  /** One enveloped oscillator, optionally into the reverb. */
  tone({ freq, type = 'sine', gain = 0.1, attack = 0.004, decay = 0.4, when = 0, glide, wet = 0, pan = 0, detune = 0 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + decay);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    let node = o.connect(g);
    if (p) {
      p.pan.value = pan;
      node = node.connect(p);
    }
    node.connect(this.master);
    if (wet) {
      const s = ctx.createGain();
      s.gain.value = wet;
      node.connect(s).connect(this.verb);
    }
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  /** Filtered noise burst. */
  air({ from = 400, to = 2400, q = 1.2, gain = 0.08, dur = 0.8, when = 0, wet = 0.3, pan0 = -0.3, pan1 = 0.3 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = src.connect(f).connect(g);
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(pan0, t);
      p.pan.linearRampToValueAtTime(pan1, t + dur);
      node = node.connect(p);
    }
    node.connect(this.master);
    const s = ctx.createGain();
    s.gain.value = wet;
    node.connect(s).connect(this.verb);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /** Glassy tap for buttons and chips. */
  tap() {
    if (!this.ready()) return;
    this.tone({ freq: 2093, type: 'sine', gain: 0.06, decay: 0.09, glide: 1760 });
    this.tone({ freq: 3136, type: 'sine', gain: 0.025, decay: 0.07, wet: 0.2 });
  }

  /** Barely-there tick for hovers; throttled. */
  hover() {
    if (!this.ready()) return;
    const now = performance.now();
    if (now - this.lastHover < 70) return;
    this.lastHover = now;
    const m = PENTA[7 + Math.floor(Math.random() * 5)];
    this.tone({ freq: mtof(m), gain: 0.012, decay: 0.12, wet: 0.25 });
  }

  /** The laurel completes: a rising pentatonic shimmer. */
  chime() {
    if (!this.ready()) return;
    [62, 69, 74, 78, 81, 86].forEach((m, i) => {
      this.tone({ freq: mtof(m), type: 'sine', gain: 0.05 - i * 0.005, attack: 0.01, decay: 2.2, when: i * 0.075, wet: 0.7, pan: (i % 2 ? 1 : -1) * 0.25 });
      this.tone({ freq: mtof(m + 12), type: 'triangle', gain: 0.008, decay: 1.2, when: i * 0.075 + 0.01, wet: 0.6 });
    });
  }

  /** Medal clink: inharmonic metal partials, louder for harder spins. */
  clink(strength = 0.6) {
    if (!this.ready()) return;
    const s = Math.max(0.2, Math.min(1, strength));
    const base = 1480 + Math.random() * 120;
    [1, 2.76, 5.4, 8.93].forEach((r, i) => {
      this.tone({ freq: base * r, gain: (0.05 * s) / (i + 1), attack: 0.001, decay: 0.9 / (1 + i * 0.4), wet: 0.35, pan: (Math.random() - 0.5) * 0.4 });
    });
  }

  /** Globe flights and big moves. */
  whoosh(dur = 1.4) {
    if (!this.ready()) return;
    this.air({ from: 220, to: 2600, dur, gain: 0.07, wet: 0.5 });
    this.tone({ freq: mtof(50), gain: 0.03, attack: 0.3, decay: dur, wet: 0.4 });
  }

  /** A touch on the silk: a soft low pulse with a breath on top. */
  ripple(x = 0) {
    if (!this.ready()) return;
    const pan = Math.max(-0.6, Math.min(0.6, x * 1.2));
    this.tone({ freq: 150, glide: 82, gain: 0.07, attack: 0.008, decay: 0.55, pan, wet: 0.3 });
    this.air({ from: 900, to: 300, dur: 0.6, gain: 0.025, wet: 0.4, pan0: pan, pan1: pan });
  }

  /** A quiet, slowly breathing pad underneath everything. */
  ambient(on) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (on && !this.pad) {
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.035, t + 4);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      lp.Q.value = 0.6;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.06;
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain).connect(lp.frequency);
      const oscs = [38, 45, 50, 54, 57].map((m, i) => {
        const o = ctx.createOscillator();
        o.type = i < 2 ? 'sine' : 'triangle';
        o.frequency.value = mtof(m);
        o.detune.value = (i - 2) * 4;
        o.connect(lp);
        o.start();
        return o;
      });
      lp.connect(out).connect(this.master);
      const s = ctx.createGain();
      s.gain.value = 0.6;
      out.connect(s).connect(this.verb);
      lfo.start();
      this.pad = { out, oscs, lfo };
    } else if (!on && this.pad) {
      const { out, oscs, lfo } = this.pad;
      this.pad = null;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      setTimeout(() => [...oscs, lfo].forEach((o) => o.stop()), 1400);
    }
  }
}

export const sound = new Sound();

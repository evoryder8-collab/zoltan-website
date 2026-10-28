// Sound: Zoltan's soundtrack underneath, and UI sounds synthesised with the
// Web Audio API on top, so each one stays in step with the motion that
// triggers it. Nothing plays until the visitor turns sound on; the choice is
// remembered, and so is where the soundtrack was, from page to page.
import trackUrl from '../media/soundtrack.m4a?url';

const STORE = 'zoltan.sound';
const AT = 'zoltan.track';
const LEVEL = 0.36; // the soundtrack under everything
const DUCKED = 0.022; // while a film speaks
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// D major pentatonic, the same family the laurel chime and hovers draw from
const PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90];

class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.lastHover = 0;
    this.track = null;
    this.speaking = new Set(); // the films playing with sound
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
      this.soundtrack(true);
    } else {
      this.soundtrack(false);
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

  /** One honour appearing in the opening: a soft, rising bell. */
  accolade(i = 0) {
    if (!this.ready()) return;
    const m = PENTA[6 + (i % 6)];
    this.tone({ freq: mtof(m), type: 'sine', gain: 0.022, attack: 0.04, decay: 1.6, wet: 0.75, pan: (i % 2 ? 1 : -1) * 0.4 });
    this.tone({ freq: mtof(m + 12), type: 'sine', gain: 0.006, attack: 0.02, decay: 0.9, wet: 0.6 });
  }

  /** The contact jewels arrive: small glassy bells, from the middle out. */
  summon() {
    if (!this.ready()) return;
    [[86, 0, 0.12], [83, -0.3, 0.23], [88, 0.3, 0.23], [81, -0.55, 0.34], [93, 0.55, 0.34]].forEach(([m, pan, when]) => {
      this.tone({ freq: mtof(m), type: 'sine', gain: 0.016, attack: 0.008, decay: 1.1, when, wet: 0.7, pan });
      this.tone({ freq: mtof(m + 12), type: 'sine', gain: 0.004, attack: 0.004, decay: 0.5, when, wet: 0.5, pan });
    });
  }

  /** The opening: a low swell, rising air and a high shimmer as the curtain parts. */
  reveal() {
    if (!this.ready()) return;
    this.tone({ freq: 55, type: 'sine', gain: 0.13, attack: 0.06, decay: 3, wet: 0.5 });
    this.tone({ freq: 82.4, type: 'triangle', gain: 0.035, attack: 0.1, decay: 2.6, wet: 0.6 });
    this.air({ from: 180, to: 4200, dur: 1.5, gain: 0.06, wet: 0.65, pan0: -0.5, pan1: 0.5 });
    [74, 81, 86, 90, 93].forEach((m, i) => {
      this.tone({ freq: mtof(m), type: 'sine', gain: 0.018, attack: 0.25, decay: 2.8, when: 0.3 + i * 0.07, wet: 0.85, pan: (i % 2 ? 1 : -1) * 0.35 });
    });
  }

  /** Sound was on last time: it comes back with the first tap or key, since
   *  browsers need one (on phones a swipe doesn't count, a tap does). */
  restore() {
    if (!this.saved || !this.supported) return;
    const events = ['pointerdown', 'pointerup', 'touchend', 'keydown'];
    const off = () => events.forEach((e) => removeEventListener(e, on, true));
    const on = () => {
      if (!this.saved) return off(); // turned off in the meantime
      if (this.ctx?.state === 'running' && this.track && !this.track.el.paused) return off();
      if (!this.enabled) this.enable(true);
      else this.soundtrack(true); // the last try didn't count as a gesture: again
    };
    events.forEach((e) => addEventListener(e, on, { capture: true, passive: true }));
  }

  /** Steps the soundtrack back while a film plays with sound. `who` names the
   *  film, so one stopping doesn't bring the music up under another. */
  duck(on, who = 'film') {
    if (on) this.speaking.add(who);
    else this.speaking.delete(who);
    if (this.enabled && this.track && !document.hidden) this.fade(this.speaking.size ? DUCKED : LEVEL, this.speaking.size ? 0.8 : 2.4);
  }

  fade(to, seconds) {
    const g = this.track.gain.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.exponentialRampToValueAtTime(to, t + seconds);
  }

  /** The soundtrack: streamed and looped (it ends in its own fade), faded
   *  through a gain of its own because iOS ignores media volume, and kept off
   *  the compressor so the UI sounds never pump it. It rests while the tab is
   *  hidden and picks up where it was on the next page. */
  soundtrack(on) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.track) {
      if (!on) return;
      let at = 0;
      try {
        at = parseFloat(sessionStorage.getItem(AT)) || 0;
      } catch {}
      const el = new Audio(at > 1 ? `${trackUrl}#t=${at.toFixed(1)}` : trackUrl);
      el.loop = true;
      el.preload = 'auto';
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      ctx.createMediaElementSource(el).connect(gain).connect(ctx.destination);
      this.track = { el, gain, rest: 0 };
      addEventListener('pagehide', () => {
        try {
          sessionStorage.setItem(AT, el.currentTime.toFixed(1));
        } catch {}
      });
      document.addEventListener('visibilitychange', () => this.enabled && this.soundtrack(!document.hidden));
    }
    const track = this.track;
    clearTimeout(track.rest);
    if (on) {
      ctx.resume?.();
      track.el.play()?.catch(() => {});
      this.fade(this.speaking.size ? DUCKED : LEVEL, 3);
    } else {
      this.fade(0.0001, 1.2);
      track.rest = setTimeout(() => track.el.pause(), 1300);
    }
  }
}

export const sound = new Sound();

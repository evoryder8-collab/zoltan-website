// Sound: Zoltan's soundtrack underneath, and recorded UI sounds on top
// (CC0, from Freesound via Openverse: see media/sfx/CREDITS.md), each played
// in step with the motion that triggers it, a little varied in pitch and
// place so repeats never sound mechanical. Nothing plays until the visitor
// turns sound on; the choice is remembered, and so is where the soundtrack
// was, from page to page.
import trackUrl from '../media/soundtrack.m4a?url';
import tapUrl from '../media/sfx/tap.mp3?url';
import tickUrl from '../media/sfx/tick.mp3?url';
import bellUrl from '../media/sfx/bell.mp3?url';
import chimesUrl from '../media/sfx/chimes.mp3?url';
import clinkUrl from '../media/sfx/clink.mp3?url';
import swooshUrl from '../media/sfx/swoosh.mp3?url';
import whooshUrl from '../media/sfx/whoosh.mp3?url';
import silkUrl from '../media/sfx/silk.mp3?url';
import swellUrl from '../media/sfx/swell.mp3?url';
import popUrl from '../media/sfx/pop.mp3?url';
import sparkleUrl from '../media/sfx/sparkle.mp3?url';

const STORE = 'zoltan.sound';
const AT = 'zoltan.track';
const LEVEL = 0.36; // the soundtrack under everything
const DUCKED = 0.022; // while a film speaks
const SFX = { tap: tapUrl, tick: tickUrl, bell: bellUrl, chimes: chimesUrl, clink: clinkUrl, swoosh: swooshUrl, whoosh: whooshUrl, silk: silkUrl, swell: swellUrl, pop: popUrl, sparkle: sparkleUrl };
// the glockenspiel bar in bell.mp3 rings at C7 (a touch sharp); every bell is
// pitched from it, in D major pentatonic, the soundtrack's family
const BELL = 96.16;
const PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90];
const pitch = (m) => 2 ** ((m - BELL) / 12);
const vary = (amount) => 1 + (Math.random() - 0.5) * amount;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.lastHover = 0;
    this.track = null;
    this.speaking = new Set(); // the films playing with sound
    this.bytes = null; // the sound files, fetched ahead
    this.buffers = {}; // and decoded, once there's a context
    this.decoding = {};
    this.supported = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  }

  get saved() {
    try {
      return localStorage.getItem(STORE) === 'on';
    } catch {
      return false;
    }
  }

  /** Fetch the sound files ahead of time (when sound is about to be asked for
   *  or restored), so they're ready the moment it's switched on. */
  prefetch() {
    if (this.bytes || !this.supported) return;
    this.bytes = Object.fromEntries(
      Object.entries(SFX).map(([name, url]) => [
        name,
        fetch(url)
          .then((r) => r.arrayBuffer())
          .catch(() => null),
      ]),
    );
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
    // a soft hall made from decaying noise, to give the bells some air
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(2.6, 3.2);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.32;
    this.verb.connect(this.wet).connect(this.master);
    // the recordings: decoded as they arrive
    this.prefetch();
    for (const [name, bytes] of Object.entries(this.bytes || {})) {
      this.decoding[name] = bytes
        .then((data) => data && new Promise((ok, no) => ctx.decodeAudioData(data, ok, no)))
        .then((buf) => buf && (this.buffers[name] = buf))
        .catch(() => null);
    }
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

  ready() {
    return this.enabled && this.ctx && this.ctx.state !== 'closed';
  }

  /** One recording: `rate` pitches it (and stretches it), `pan` places it,
   *  `wet` sends some to the hall. Not decoded yet: it plays when it is, if
   *  that's soon enough to still belong to the moment. */
  play(name, { gain = 0.2, rate = 1, pan = 0, when = 0, wet = 0 } = {}) {
    const buf = this.buffers[name];
    if (!buf) {
      const asked = performance.now();
      this.decoding[name]?.then(() => performance.now() - asked < 500 && this.buffers[name] && this.play(name, { gain, rate, pan, when, wet }));
      return;
    }
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    let node = src.connect(g);
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      node = node.connect(p);
    }
    node.connect(this.master);
    if (wet) {
      const send = ctx.createGain();
      send.gain.value = wet;
      node.connect(send).connect(this.verb);
    }
    src.start(ctx.currentTime + when);
  }

  /** A glass tapped, for buttons and chips. */
  tap() {
    if (!this.ready()) return;
    this.play('tap', { gain: 0.2, rate: vary(0.1), wet: 0.06 });
  }

  /** Barely-there tick for hovers; throttled. */
  hover() {
    if (!this.ready()) return;
    const now = performance.now();
    if (now - this.lastHover < 70) return;
    this.lastHover = now;
    this.play('tick', { gain: 0.07, rate: 0.85 + Math.random() * 0.4 });
  }

  /** The laurel completes: a rising run of bells under a wind-chime shimmer. */
  chime() {
    if (!this.ready()) return;
    [81, 86, 90, 93, 98, 102].forEach((m, i) => {
      this.play('bell', { gain: 0.2 - i * 0.015, rate: pitch(m), when: i * 0.075, pan: (i % 2 ? 1 : -1) * 0.25, wet: 0.3 });
    });
    this.play('chimes', { gain: 0.1, when: 0.18, wet: 0.2 });
  }

  /** Medal clink, louder for harder spins. */
  clink(strength = 0.6) {
    if (!this.ready()) return;
    const s = clamp(strength, 0.2, 1);
    this.play('clink', { gain: 0.32 * s, rate: vary(0.12), pan: (Math.random() - 0.5) * 0.3, wet: 0.1 });
  }

  /** Air moving: a short swoosh for the menu and sheet, a deep whoosh for
   *  globe and map flights, stretched towards the move's length. */
  whoosh(dur = 1.4) {
    if (!this.ready()) return;
    if (dur <= 1.2) this.play('swoosh', { gain: 0.22, rate: clamp(0.62 / dur, 0.75, 1.1), wet: 0.12 });
    else this.play('whoosh', { gain: 0.26, rate: clamp(2.9 / dur, 0.85, 1.25), wet: 0.15 });
  }

  /** A touch on the silk: the soft flap of fabric, where the finger was. */
  ripple(x = 0) {
    if (!this.ready()) return;
    this.play('silk', { gain: 0.12, rate: vary(0.2), pan: clamp(x * 1.2, -0.6, 0.6) });
  }

  /** One honour appearing in the opening: a soft bell, a step higher each time. */
  accolade(i = 0) {
    if (!this.ready()) return;
    this.play('bell', { gain: 0.13, rate: pitch(PENTA[6 + (i % 6)] + 12), pan: (i % 2 ? 1 : -1) * 0.4, wet: 0.4 });
  }

  /** The contact jewels arrive: small bells, from the middle out. */
  summon() {
    if (!this.ready()) return;
    [[86, 0, 0.12], [83, -0.3, 0.23], [88, 0.3, 0.23], [81, -0.55, 0.34], [93, 0.55, 0.34]].forEach(([m, pan, when]) => {
      this.play('bell', { gain: 0.09, rate: pitch(m + 12), when, pan, wet: 0.35 });
    });
  }

  /** The ticket's confetti: two soft pops, then a sparkle. */
  sparkle() {
    if (!this.ready()) return;
    this.play('pop', { gain: 0.2, pan: -0.4 });
    this.play('pop', { gain: 0.16, rate: 1.08, pan: 0.4, when: 0.05 });
    this.play('sparkle', { gain: 0.14, when: 0.08, wet: 0.25 });
  }

  /** The opening: a cinematic swell as the portal opens, with a shimmer above. */
  reveal() {
    if (!this.ready()) return;
    this.play('swell', { gain: 0.42 });
    this.play('chimes', { gain: 0.08, when: 0.6, wet: 0.3 });
  }

  /** Sound was on last time: it comes back with the first tap or key, since
   *  browsers need one (on phones a swipe doesn't count, a tap does). */
  restore() {
    if (!this.saved || !this.supported) return;
    this.prefetch();
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
    if (!this.enabled || !this.track || document.hidden) return;
    if (this.speaking.size) this.fade(DUCKED, 0.8);
    else this.wake();
  }

  /** The films are quiet again: the soundtrack comes back up, smoothly. A
   *  phone pauses other audio while a video speaks (and may suspend the
   *  audio context), so it's woken and started again first; if the phone
   *  wants a tap for that, the next tap does it. */
  wake() {
    const { el } = this.track;
    clearTimeout(this.track.rest);
    if (this.ctx.state !== 'running') this.ctx.resume?.()?.catch?.(() => {});
    if (el.paused) el.play()?.catch(() => this.onNextTap(() => this.enabled && !this.speaking.size && this.wake()));
    this.fade(LEVEL, 2.8);
  }

  onNextTap(fn) {
    const events = ['touchend', 'click', 'keydown'];
    const once = () => {
      events.forEach((e) => removeEventListener(e, once, true));
      fn();
    };
    events.forEach((e) => addEventListener(e, once, { capture: true, passive: true }));
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
      // paused by the phone, not by us (sound still on, no film speaking,
      // the tab in view): bring it back
      el.addEventListener('pause', () => {
        setTimeout(() => {
          if (this.enabled && !this.speaking.size && !document.hidden && el.paused) this.wake();
        }, 400);
      });
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

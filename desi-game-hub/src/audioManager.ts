type SFXType =
  | "click"
  | "turn"
  | "suspense"
  | "win"
  | "lose"
  | "mark"
  | "bingo"
  | "dice"
  | "reveal"
  | "correct"
  | "wrong"
  | "chomp"
  | "countdown"
  | "assign";

interface AudioPrefs {
  muted: boolean;
  sfxVol: number;
  musicVol: number;
  musicMuted: boolean;
}

// ── Indian pentatonic melody note frequencies (Hz) ──────────────────────────
// Sa  Re  Ga  Pa  Dha  Sa'  (A pentatonic major-ish)
const SCALE = [220, 247, 277, 330, 370, 440, 494, 554, 659, 740, 880];
const MELODY_NOTES = [220, 247, 277, 330, 370, 440, 494, 554]; // Sa-Re-Ga-Pa-Dha

// Pick weighted random note (center notes more likely)
function randNote(): number {
  const weights = [1, 2, 3, 2, 3, 2, 3, 2];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return MELODY_NOTES[i];
  }
  return MELODY_NOTES[4];
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Music state
  private musicNodes: AudioNode[] = [];
  private musicLoopTimeout: ReturnType<typeof setTimeout> | null = null;
  private musicPlaying = false;
  private musicScheduleTime = 0;

  private prefs: AudioPrefs = {
    muted: false,
    sfxVol: 0.72,
    musicVol: 0.28,
    musicMuted: false,
  };

  constructor() {
    this.loadPrefs();
  }

  private loadPrefs() {
    try {
      const raw = localStorage.getItem("dgh_audio_v4");
      if (raw) this.prefs = { ...this.prefs, ...JSON.parse(raw) };
    } catch {}
  }

  private savePrefs() {
    try {
      localStorage.setItem("dgh_audio_v4", JSON.stringify(this.prefs));
    } catch {}
  }

  private ensureCtx(): AudioContext {
    if (this.ctx && this.ctx.state !== "closed") {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.applyVolumes();
    return this.ctx;
  }

  private applyVolumes() {
    if (!this.masterGain || !this.sfxGain || !this.musicGain) return;
    this.masterGain.gain.value = this.prefs.muted ? 0 : 1;
    this.sfxGain.gain.value = this.prefs.sfxVol;
    this.musicGain.gain.value = this.prefs.musicMuted ? 0 : this.prefs.musicVol;
  }

  // ── SFX ──────────────────────────────────────────────────────────────────────
  playSFX(type: SFXType) {
    if (this.prefs.muted) return;
    const ctx = this.ensureCtx();
    const out = this.sfxGain!;
    const now = ctx.currentTime;

    if (type === "click") {
      const o = ctx.createOscillator(); o.type = "triangle";
      const g = ctx.createGain();
      o.frequency.setValueAtTime(820, now);
      o.frequency.exponentialRampToValueAtTime(310, now + 0.07);
      g.gain.setValueAtTime(0.38, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      o.connect(g); g.connect(out);
      o.start(now); o.stop(now + 0.13);
      return;
    }

    if (type === "turn") {
      const dur = 0.4;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.2);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "bandpass";
      f.frequency.setValueAtTime(1200, now); f.frequency.exponentialRampToValueAtTime(200, now + dur);
      f.Q.value = 2.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.45, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(now);
      return;
    }

    if (type === "suspense") {
      const o = ctx.createOscillator(); o.type = "sine";
      const g = ctx.createGain();
      o.frequency.setValueAtTime(155, now); o.frequency.exponentialRampToValueAtTime(48, now + 0.4);
      g.gain.setValueAtTime(0.68, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      o.connect(g); g.connect(out);
      o.start(now); o.stop(now + 0.58);
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 310;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.3, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      o2.connect(g2); g2.connect(out);
      o2.start(now); o2.stop(now + 0.12);
      return;
    }

    if (type === "win") {
      const runNotes = [392, 440, 494, 523, 659, 784];
      runNotes.forEach((freq, i) => {
        const t = now + i * 0.07;
        const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g); g.connect(out);
        o.start(t); o.stop(t + 0.26);
      });
      const bellT = now + runNotes.length * 0.07;
      [784, 784 * 2.76].forEach((freq, i) => {
        const o = ctx.createOscillator(); o.type = i === 0 ? "triangle" : "sine";
        o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, bellT); g.gain.linearRampToValueAtTime(i === 0 ? 0.5 : 0.18, bellT + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, bellT + (i === 0 ? 1.1 : 0.6));
        o.connect(g); g.connect(out);
        o.start(bellT); o.stop(bellT + (i === 0 ? 1.2 : 0.65));
      });
      return;
    }

    if (type === "lose") {
      [330, 277, 220, 185].forEach((freq, i) => {
        const t = now + i * 0.13;
        const o = ctx.createOscillator(); o.type = "sine";
        const g = ctx.createGain();
        o.frequency.setValueAtTime(freq * 1.5, t);
        o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.28);
        g.gain.setValueAtTime(0.42, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
        o.connect(g); g.connect(out);
        o.start(t); o.stop(t + 0.4);
      });
      return;
    }

    // ── New SFX ──────────────────────────────────────────────────────────────

    if (type === "mark") {
      // Soft "dab" — mark a number on bingo/board
      const o = ctx.createOscillator(); o.type = "sine";
      const g = ctx.createGain();
      o.frequency.setValueAtTime(660, now); o.frequency.exponentialRampToValueAtTime(420, now + 0.08);
      g.gain.setValueAtTime(0.32, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      o.connect(g); g.connect(out);
      o.start(now); o.stop(now + 0.16);
      return;
    }

    if (type === "bingo") {
      // Celebratory rising arpeggio — bingo line complete!
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((freq, i) => {
        const t = now + i * 0.06;
        const o = ctx.createOscillator(); o.type = "triangle";
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.frequency.value = freq;
        o.connect(g); g.connect(out);
        o.start(t); o.stop(t + 0.35);
      });
      // Bell tail
      const bellT = now + notes.length * 0.06 + 0.05;
      const ob = ctx.createOscillator(); ob.type = "sine"; ob.frequency.value = 1047;
      const gb = ctx.createGain();
      gb.gain.setValueAtTime(0.55, bellT); gb.gain.exponentialRampToValueAtTime(0.001, bellT + 1.2);
      ob.connect(gb); gb.connect(out);
      ob.start(bellT); ob.stop(bellT + 1.3);
      return;
    }

    if (type === "dice") {
      // Rattling noise burst — dice/chit shuffle
      const dur = 0.35;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const env = Math.sin((i / d.length) * Math.PI);
        d[i] = (Math.random() * 2 - 1) * env * 0.7;
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 3000;
      const g = ctx.createGain(); g.gain.value = 0.55;
      src.connect(f); f.connect(g); g.connect(out);
      src.start(now);
      // Add a short click at end (the "land")
      const oc = ctx.createOscillator(); oc.type = "triangle";
      const gc = ctx.createGain();
      oc.frequency.setValueAtTime(200, now + dur);
      gc.gain.setValueAtTime(0.5, now + dur); gc.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.08);
      oc.connect(gc); gc.connect(out);
      oc.start(now + dur); oc.stop(now + dur + 0.1);
      return;
    }

    if (type === "reveal") {
      // Dramatic whoosh + accent — card flip / role reveal
      const dur = 0.5;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t2 = i / d.length;
        d[i] = (Math.random() * 2 - 1) * Math.pow(t2, 0.5) * Math.pow(1 - t2, 0.3);
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "bandpass";
      f.frequency.setValueAtTime(300, now); f.frequency.exponentialRampToValueAtTime(4000, now + dur);
      f.Q.value = 1.5;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.6, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(now);
      // Accent hit
      const oa = ctx.createOscillator(); oa.type = "triangle"; oa.frequency.value = 880;
      const ga = ctx.createGain();
      ga.gain.setValueAtTime(0.38, now + dur - 0.05); ga.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.15);
      oa.connect(ga); ga.connect(out);
      oa.start(now + dur - 0.05); oa.stop(now + dur + 0.18);
      return;
    }

    if (type === "correct") {
      // Bright two-tone "ding ding" — correct guess
      [880, 1108].forEach((freq, i) => {
        const t = now + i * 0.1;
        const o = ctx.createOscillator(); o.type = "sine";
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.frequency.value = freq;
        o.connect(g); g.connect(out);
        o.start(t); o.stop(t + 0.38);
      });
      return;
    }

    if (type === "wrong") {
      // Harsh buzzer — wrong guess
      const o = ctx.createOscillator(); o.type = "sawtooth";
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
      o.frequency.setValueAtTime(140, now); o.frequency.linearRampToValueAtTime(100, now + 0.22);
      g.gain.setValueAtTime(0.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      o.connect(f); f.connect(g); g.connect(out);
      o.start(now); o.stop(now + 0.3);
      return;
    }

    if (type === "chomp") {
      // Punchy "nom" — snake eating food
      const o = ctx.createOscillator(); o.type = "square";
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 800;
      const g = ctx.createGain();
      o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(180, now + 0.06);
      g.gain.setValueAtTime(0.42, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      o.connect(f); f.connect(g); g.connect(out);
      o.start(now); o.stop(now + 0.12);
      return;
    }

    if (type === "countdown") {
      // Soft tick-tock style countdown beep
      const o = ctx.createOscillator(); o.type = "sine";
      const g = ctx.createGain();
      o.frequency.value = 1000;
      g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      o.connect(g); g.connect(out);
      o.start(now); o.stop(now + 0.1);
      return;
    }

    if (type === "assign") {
      // Playful "plop" — assigning a relation in HeartMindDustbin
      const o = ctx.createOscillator(); o.type = "triangle";
      const g = ctx.createGain();
      o.frequency.setValueAtTime(440, now); o.frequency.exponentialRampToValueAtTime(220, now + 0.12);
      g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      o.connect(g); g.connect(out);
      o.start(now); o.stop(now + 0.2);
      return;
    }
  }

  // ── BACKGROUND MUSIC ────────────────────────────────────────────────────────
  // Procedural looping ambient Indian-style music.
  // Uses pentatonic scale with a drone, soft tabla-like percussion, and melody.

  startMusic() {
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    const ctx = this.ensureCtx();
    this.musicScheduleTime = ctx.currentTime + 0.1;
    this._scheduleMusicBar();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicLoopTimeout) {
      clearTimeout(this.musicLoopTimeout);
      this.musicLoopTimeout = null;
    }
    // Fade out musicGain then stop nodes
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0, now + 0.6);
      const nodes = this.musicNodes;
      this.musicNodes = [];
      setTimeout(() => {
        nodes.forEach(n => { try { (n as OscillatorNode).stop?.(); } catch {} });
        // Restore musicGain
        if (this.musicGain && !this.prefs.musicMuted) {
          this.musicGain.gain.value = this.prefs.musicVol;
        }
      }, 700);
    }
  }

  private _scheduleMusicBar() {
    if (!this.musicPlaying || !this.ctx) return;
    const ctx = this.ctx;
    const out = this.musicGain!;
    const t = this.musicScheduleTime;

    // === Constants ===
    const BPM = 72;
    const beat = 60 / BPM;
    const barLen = beat * 4; // 4 beats per bar

    // === Tanpura drone (Sa + Pa) ===
    this._playDronePulse(ctx, out, 110, t, barLen);    // Sa low
    this._playDronePulse(ctx, out, 165, t, barLen);    // Pa
    this._playDronePulse(ctx, out, 220, t, barLen);    // Sa mid

    // === Tabla-like bass hit on beat 1 ===
    this._tablaHit(ctx, out, t, 0.18);

    // === Tabla-like thap on beat 3 ===
    this._tablaHit(ctx, out, t + beat * 2, 0.1);

    // === Soft off-beat hits ===
    this._tablaHit(ctx, out, t + beat * 1, 0.07);
    this._tablaHit(ctx, out, t + beat * 3, 0.07);

    // === Melody phrase (2 notes per bar chosen from scale) ===
    const mel1 = randNote();
    const mel2 = randNote();
    this._melodyNote(ctx, out, mel1, t + beat * 0.5, beat * 1.2, 0.12);
    this._melodyNote(ctx, out, mel2, t + beat * 2.5, beat * 1.2, 0.1);

    // Occasionally add a 3rd note for variation
    if (Math.random() < 0.4) {
      const mel3 = randNote();
      this._melodyNote(ctx, out, mel3 * 0.5, t + beat * 3.5, beat * 0.8, 0.08);
    }

    // Schedule next bar
    this.musicScheduleTime = t + barLen;
    const msUntilNext = Math.max(0, (this.musicScheduleTime - ctx.currentTime - 0.3) * 1000);
    this.musicLoopTimeout = setTimeout(() => this._scheduleMusicBar(), msUntilNext);
  }

  private _playDronePulse(
    ctx: AudioContext,
    out: AudioNode,
    freq: number,
    start: number,
    dur: number,
  ) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.055, start + 0.3);
    g.gain.setValueAtTime(0.055, start + dur - 0.3);
    g.gain.linearRampToValueAtTime(0, start + dur);
    o.connect(g); g.connect(out);
    o.start(start); o.stop(start + dur + 0.05);
    this.musicNodes.push(o);
  }

  private _tablaHit(ctx: AudioContext, out: AudioNode, t: number, gain: number) {
    // Bass-drum-like thump using pitched noise + oscillator
    const dur = 0.25;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass";
    f.frequency.value = 180; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t);

    // Tone layer
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    const gt = ctx.createGain();
    gt.gain.setValueAtTime(gain * 0.8, t); gt.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(gt); gt.connect(out);
    o.start(t); o.stop(t + 0.22);
    this.musicNodes.push(o);
  }

  private _melodyNote(
    ctx: AudioContext,
    out: AudioNode,
    freq: number,
    start: number,
    dur: number,
    gain: number,
  ) {
    const o = ctx.createOscillator(); o.type = "triangle";
    // Slight vibrato
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 5.5;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 3;
    lfo.connect(lfoGain); lfoGain.connect(o.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.06);
    g.gain.setValueAtTime(gain, start + dur - 0.1);
    g.gain.linearRampToValueAtTime(0, start + dur);

    o.frequency.value = freq;
    o.connect(g); g.connect(out);
    o.start(start); o.stop(start + dur + 0.05);
    lfo.start(start); lfo.stop(start + dur + 0.05);
    this.musicNodes.push(o, lfo);
  }

  // ── Volume controls ──────────────────────────────────────────────────────────

  toggleMute() {
    this.prefs.muted = !this.prefs.muted;
    this.applyVolumes();
    this.savePrefs();
    return this.prefs.muted;
  }

  toggleMusicMute() {
    this.prefs.musicMuted = !this.prefs.musicMuted;
    this.applyVolumes();
    this.savePrefs();
    return this.prefs.musicMuted;
  }

  setSfxVol(v: number) {
    this.prefs.sfxVol = Math.max(0, Math.min(1, v));
    if (this.sfxGain && !this.prefs.muted) this.sfxGain.gain.value = this.prefs.sfxVol;
    this.savePrefs();
  }

  setMusicVol(v: number) {
    this.prefs.musicVol = Math.max(0, Math.min(1, v));
    if (this.musicGain && !this.prefs.musicMuted) this.musicGain.gain.value = this.prefs.musicVol;
    this.savePrefs();
  }

  get isMuted() { return this.prefs.muted; }
  get isMusicMuted() { return this.prefs.musicMuted; }
  get sfxVol() { return this.prefs.sfxVol; }
  get musicVol() { return this.prefs.musicVol; }
  get isMusicPlaying() { return this.musicPlaying; }
}

export const audioManager = new AudioManager();
export type { SFXType };

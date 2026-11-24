import Phaser from "phaser";

const MUTE_KEY = "ember-muted";

/**
 * Sound effects synthesized with Web Audio, so the project still needs no asset files.
 * Uses Phaser's audio context, which Phaser unlocks on the first tap or key press.
 */
export class Sfx {
  private ctx?: AudioContext;
  private out?: GainNode;
  private noise?: AudioBuffer;
  muted = readMuted();

  constructor(scene: Phaser.Scene) {
    const manager = scene.sound as Partial<Phaser.Sound.WebAudioSoundManager>;
    this.ctx = manager.context;
    if (!this.ctx) return;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.35;
    this.out.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    writeMuted(this.muted);
    return this.muted;
  }

  /** Quick upward chirp. */
  flap() {
    this.tone({ type: "triangle", from: 380, to: 720, duration: 0.09, volume: 0.5 });
    this.hiss({ duration: 0.08, volume: 0.12, filter: 2400 });
  }

  /** Two-note bell when a pillar is passed. */
  point() {
    this.tone({ type: "sine", from: 880, to: 880, duration: 0.09, volume: 0.45 });
    this.tone({ type: "sine", from: 1320, to: 1320, duration: 0.18, volume: 0.4, delay: 0.07 });
  }

  /** Low thump plus a burst of noise. */
  hit() {
    this.tone({ type: "square", from: 160, to: 40, duration: 0.22, volume: 0.45 });
    this.hiss({ duration: 0.25, volume: 0.4, filter: 900 });
  }

  /** Falling sigh after the crash. */
  fade() {
    this.tone({ type: "triangle", from: 520, to: 140, duration: 0.6, volume: 0.3, delay: 0.25 });
  }

  private ready() {
    if (this.muted || !this.ctx || !this.out) return false;
    return this.ctx.state === "running";
  }

  private tone(o: { type: OscillatorType; from: number; to: number; duration: number; volume: number; delay?: number }) {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.from, t);
    osc.frequency.exponentialRampToValueAtTime(o.to, t + o.duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.duration);
    osc.connect(gain).connect(this.out!);
    osc.start(t);
    osc.stop(t + o.duration + 0.02);
  }

  private hiss(o: { duration: number; volume: number; filter: number }) {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = o.filter;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(o.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.duration);
    src.connect(filter).connect(gain).connect(this.out!);
    src.start(t);
    src.stop(t + o.duration);
  }

  private noiseBuffer(ctx: AudioContext) {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(value: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // Storage blocked: mute just won't persist.
  }
}

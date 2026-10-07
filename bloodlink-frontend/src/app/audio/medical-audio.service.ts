import { Injectable } from '@angular/core';

type AudioContextConstructor = new () => AudioContext;

function resolveAudioContext(): AudioContextConstructor | null {
  const w = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Synthesised patient-monitor audio.
 * Must be unlocked from a real click / key / touch — browsers block autoplay.
 */
@Injectable({ providedIn: 'root' })
export class MedicalAudioService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlockBound = false;
  private muted = true;

  get enabled(): boolean {
    return !this.muted && this.ctx?.state === 'running';
  }

  primeOnFirstGesture(): void {
    if (this.unlockBound) return;
    this.unlockBound = true;

    const unlock = () => {
      void this.enable();
    };
    for (const event of ['pointerdown', 'keydown', 'touchstart'] as const) {
      addEventListener(event, unlock, { passive: true });
    }
  }

  async enable(): Promise<boolean> {
    const Ctor = resolveAudioContext();
    if (!Ctor) return false;

    if (!this.ctx) {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    }

    try {
      if (this.ctx.state !== 'running') await this.ctx.resume();
    } catch {
      return false;
    }

    if (this.ctx.state !== 'running') return false;
    this.muted = false;
    return true;
  }

  mute(): void {
    this.muted = true;
    this.stopFlatline();
  }

  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  beep(at: number = this.currentTime, volume = 0.55): void {
    if (!this.enabled || !this.ctx || !this.master) return;

    const start = Math.max(at, this.ctx.currentTime);
    const duration = 0.1;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(this.master);

    const fundamental = this.ctx.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(880, start);

    const overtone = this.ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(1760, start);
    const overtoneGain = this.ctx.createGain();
    overtoneGain.gain.value = 0.32;

    fundamental.connect(gain);
    overtone.connect(overtoneGain).connect(gain);

    for (const osc of [fundamental, overtone]) {
      osc.start(start);
      osc.stop(start + duration + 0.03);
    }
  }

  /**
   * Stethoscope-like lub-dub. Soft, low and organic — not a monitor beep.
   */
  heartbeat(at: number = this.currentTime, volume = 0.62): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const start = Math.max(at, this.ctx.currentTime);
    this.valve(start, { from: 78, to: 34, duration: 0.17, volume, noise: 0.22, lowpass: 240 });
    this.valve(start + 0.23, { from: 110, to: 48, duration: 0.11, volume: volume * 0.58, noise: 0.12, lowpass: 320 });
  }

  thump(at: number = this.currentTime, volume = 0.7): void {
    if (!this.enabled || !this.ctx || !this.master) return;

    const start = Math.max(at, this.ctx.currentTime);
    const duration = 0.26;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(62, start);
    osc.frequency.exponentialRampToValueAtTime(32, start + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  private valve(
    start: number,
    options: { from: number; to: number; duration: number; volume: number; noise: number; lowpass: number }
  ): void {
    if (!this.ctx || !this.master) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(options.lowpass, start);
    filter.frequency.exponentialRampToValueAtTime(90, start + options.duration);
    filter.Q.value = 0.7;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);

    filter.connect(gain).connect(this.master);

    const body = this.ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(options.from, start);
    body.frequency.exponentialRampToValueAtTime(options.to, start + options.duration);
    body.connect(filter);

    const warmth = this.ctx.createOscillator();
    warmth.type = 'triangle';
    warmth.frequency.setValueAtTime(options.from * 0.5, start);
    const warmthGain = this.ctx.createGain();
    warmthGain.gain.value = 0.28;
    warmth.connect(warmthGain).connect(filter);

    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * options.duration), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = options.noise;
    noise.connect(noiseGain).connect(filter);

    body.start(start);
    warmth.start(start);
    noise.start(start);
    body.stop(start + options.duration + 0.02);
    warmth.stop(start + options.duration + 0.02);
    noise.stop(start + options.duration + 0.02);
  }

  private flatlineNodes: { osc: OscillatorNode; gain: GainNode } | null = null;

  startFlatline(volume = 0.28): void {
    if (!this.enabled || !this.ctx || !this.master || this.flatlineNodes) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.16);

    osc.connect(gain).connect(this.master);
    osc.start(now);

    this.flatlineNodes = { osc, gain };
  }

  stopFlatline(fadeSeconds = 0.35): void {
    if (!this.ctx || !this.flatlineNodes) return;

    const { osc, gain } = this.flatlineNodes;
    this.flatlineNodes = null;

    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
    osc.stop(now + fadeSeconds + 0.05);
  }
}

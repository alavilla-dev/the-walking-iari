/**
 * Sistema de sonido del juego. Por ahora SINTETIZA todo con Web Audio
 * (sin archivos): blips de menú, confirmación, pasos y un drone tétrico
 * para la pantalla de título. Cuando tengamos música/efectos reales,
 * se cargan como buffers y se disparan desde acá sin tocar las escenas.
 *
 * Hooks previstos (a futuro):
 *  - música de fondo del depto (loop tranquilo)
 *  - tocadiscos con tecno (toggle desde un objeto interactivo)
 *  - stingers de tensión cuando empiece el brote
 */

type Ctx = AudioContext;

export class Sfx {
  private static instance: Sfx | null = null;
  static get(): Sfx {
    if (!this.instance) this.instance = new Sfx();
    return this.instance;
  }

  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private droneNodes: AudioNode[] = [];
  private muted = false;

  private ensure(): Ctx | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Reanuda el contexto (las políticas de autoplay lo suspenden hasta el 1er gesto). */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  // ---- Efectos cortos ----

  private tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.2, slideTo?: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.unlock();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  /** Navegar el menú. */
  blip(): void {
    this.tone(520, 0.07, "square", 0.15);
  }

  /** Confirmar opción. */
  confirm(): void {
    this.tone(440, 0.09, "square", 0.18);
    setTimeout(() => this.tone(660, 0.12, "square", 0.18), 70);
  }

  /** Maullido (barrido de tono). high=agudo (Marfil), grave (Venus). */
  meow(high = true): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.unlock();
    const base = high ? 620 : 380;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(base * 0.8, t);
    osc.frequency.linearRampToValueAtTime(base * 1.25, t + 0.12);
    osc.frequency.linearRampToValueAtTime(base * 0.85, t + 0.32);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 1600;
    osc.connect(lp).connect(g).connect(this.master);
    osc.start(); osc.stop(t + 0.38);
  }

  /** Paso sobre el piso (ruido corto y grave). */
  footstep(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const dur = 0.08;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length); // ruido con decay
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    src.connect(lp).connect(g).connect(this.master);
    src.start();
  }

  // ---- Drone tétrico del título ----

  startTitleDrone(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.droneNodes.length) return;
    this.unlock();
    const g = ctx.createGain();
    g.gain.value = 0.0;
    g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2);
    g.connect(this.master);

    // Dos osciladores graves y desafinados + un LFO que modula el volumen.
    const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 55;
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 55 * 1.5 + 1.5;
    const o3 = ctx.createOscillator(); o3.type = "triangle"; o3.frequency.value = 110.3;
    const o3g = ctx.createGain(); o3g.gain.value = 0.04;
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.13;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.06;
    lfo.connect(lfoG).connect(g.gain);

    o1.connect(g); o2.connect(g); o3.connect(o3g).connect(g);
    o1.start(); o2.start(); o3.start(); lfo.start();
    this.droneNodes = [o1, o2, o3, lfo, g];
  }

  stopTitleDrone(): void {
    const ctx = this.ensure();
    if (!ctx) { this.droneNodes = []; return; }
    for (const n of this.droneNodes) {
      try { (n as OscillatorNode).stop?.(); } catch { /* gain node: sin stop */ }
      try { n.disconnect(); } catch { /* ya desconectado */ }
    }
    this.droneNodes = [];
  }
}

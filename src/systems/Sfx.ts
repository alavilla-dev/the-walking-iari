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
  private technoSrc: AudioBufferSourceNode | null = null;
  private technoGain: GainNode | null = null;

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

  isMuted(): boolean {
    return this.muted;
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
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

  /**
   * Disparo: "crack" de ruido filtrado + golpe grave. El perfil "shotgun" es
   * más largo, grave y con más cuerpo que la pistola.
   */
  gunshot(kind: "pistol" | "shotgun" = "pistol"): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.unlock();
    const t = ctx.currentTime;
    const shotgun = kind === "shotgun";
    const dur = shotgun ? 0.34 : 0.16;
    const hpFreq = shotgun ? 320 : 700;
    const crackGain = shotgun ? 0.62 : 0.5;
    const lowFrom = shotgun ? 200 : 170;
    const lowTo = shotgun ? 36 : 48;
    const lowGain = shotgun ? 0.5 : 0.32;
    const lowDur = shotgun ? 0.22 : 0.12;

    // Crack/cuerpo de ruido con decay.
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, shotgun ? 1.4 : 2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = hpFreq;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(crackGain, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp).connect(ng).connect(this.master);
    src.start(t);

    // Golpe grave (cuerpo del disparo).
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(lowFrom, t);
    osc.frequency.exponentialRampToValueAtTime(lowTo, t + lowDur * 0.85);
    const og = ctx.createGain();
    og.gain.setValueAtTime(lowGain, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + lowDur);
    osc.connect(og).connect(this.master);
    osc.start(t);
    osc.stop(t + lowDur + 0.02);
  }

  /** Gatillo vacío: click seco y corto. */
  dryFire(): void {
    this.tone(2200, 0.03, "square", 0.08);
    setTimeout(() => this.tone(1400, 0.02, "square", 0.05), 18);
  }

  /** Recarga: dos clicks mecánicos ("cha-chunk"). */
  reloadSound(): void {
    this.tone(380, 0.05, "square", 0.12);
    setTimeout(() => this.tone(520, 0.06, "square", 0.13), 140);
  }

  /** Curación: brillo ascendente suave. */
  heal(): void {
    this.tone(520, 0.12, "sine", 0.16, 780);
    setTimeout(() => this.tone(780, 0.18, "sine", 0.14, 1040), 90);
  }

  /** Subir de nivel: arpegio ascendente alegre. */
  levelUp(): void {
    this.tone(523, 0.1, "square", 0.16);
    setTimeout(() => this.tone(659, 0.1, "square", 0.16), 90);
    setTimeout(() => this.tone(784, 0.12, "square", 0.16), 180);
    setTimeout(() => this.tone(1047, 0.18, "square", 0.16), 280);
  }

  /** Silbido del golpe cuerpo a cuerpo (ruido pasa-banda barriendo). */
  swoosh(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.unlock();
    const t = ctx.currentTime;
    const dur = 0.14;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
  }

  // ---- Base de techno (tocadiscos / tele) ----

  /** Arranca un loop techno (kick + bajo) en volumen 0. Idempotente. */
  startTechno(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.technoSrc) return;
    this.unlock();

    const bpm = 126, beats = 4;
    const beat = 60 / bpm, dur = beat * beats, sr = ctx.sampleRate;
    const eighth = beat / 2;
    const notes = [55, 55, 82.41, 55, 55, 73.42, 55, 65.41]; // patrón de un compás
    const buf = ctx.createBuffer(1, Math.floor(dur * sr), sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      let s = 0;
      // Kick "four-on-the-floor" (en cada negra).
      const tb = t % beat;
      if (tb < 0.18) {
        const env = (1 - tb / 0.18) ** 2;
        const f = 120 * Math.pow(45 / 120, Math.min(1, tb / 0.12));
        s += Math.sin(2 * Math.PI * f * tb) * env * 0.7;
      }
      // Bajo (una nota por corchea; fase reseteada por nota → loop limpio).
      const te = t % eighth;
      const n = notes[Math.floor(t / eighth) % notes.length];
      const env2 = Math.exp(-te * 7);
      s += (Math.sin(2 * Math.PI * n * te) * 0.6 + Math.sin(2 * Math.PI * n * 2 * te) * 0.18) * env2 * 0.3;
      data[i] = Math.max(-1, Math.min(1, s));
    }

    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(g).connect(this.master);
    src.start();
    this.technoSrc = src; this.technoGain = g;
  }

  /** Volumen del loop techno (0..1), suavizado. Para la base por cercanía. */
  setTechnoVolume(v: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.technoGain) return;
    const target = Math.max(0, Math.min(1, v)) * 0.4;
    this.technoGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
  }

  stopTechno(): void {
    try { this.technoSrc?.stop(); } catch { /* ya parado */ }
    try { this.technoSrc?.disconnect(); this.technoGain?.disconnect(); } catch { /* ya desconectado */ }
    this.technoSrc = null; this.technoGain = null;
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

import Phaser from "phaser";
import { Sfx } from "./Sfx";
import type { Direction, DialogueScript } from "../types";

/**
 * Director de cinemáticas. Ejecuta una lista de "pasos" (Step) en orden,
 * cada uno asíncrono. Sirve para la intro del Cap. 1 y cualquier cutscene:
 * mover personajes, paneos de cámara, diálogos encadenados, fundidos, sonidos.
 *
 * Uso:
 *   const cs = new Cutscene(scene);
 *   await cs.play([
 *     fadeIn(600),
 *     say("Iara", "Otra noche sola..."),
 *     moveActor(iara, x, y, 70),
 *     wait(400),
 *     call(() => { ... }),
 *   ]);
 *
 * Se puede saltear con cs.skip() (los pasos restantes resuelven al instante).
 */

export interface CutsceneCtx {
  scene: Phaser.Scene;
  readonly skipped: boolean;
}

export type Step = (ctx: CutsceneCtx) => Promise<void>;

export class Cutscene {
  private skipFlag = false;
  active = false;

  constructor(private scene: Phaser.Scene) {}

  get skipped(): boolean {
    return this.skipFlag;
  }

  skip(): void {
    this.skipFlag = true;
  }

  async play(steps: Step[]): Promise<void> {
    this.active = true;
    const self = this;
    const ctx: CutsceneCtx = {
      scene: this.scene,
      get skipped() { return self.skipFlag; },
    };
    for (const step of steps) {
      await step(ctx);
    }
    this.active = false;
  }
}

// ---------- Pasos ----------

type MovableActor = Phaser.GameObjects.Sprite & { facing?: Direction };

/** Espera fija (ms). */
export const wait = (ms: number): Step => (ctx) =>
  new Promise((res) => {
    if (ctx.skipped) return res();
    ctx.scene.time.delayedCall(ms, res);
  });

/** Ejecuta una función arbitraria. */
export const call = (fn: () => void): Step => async () => {
  fn();
};

/** Fundido desde negro. */
export const fadeIn = (ms = 600): Step => (ctx) =>
  new Promise((res) => {
    if (ctx.skipped) { ctx.scene.cameras.main.fadeIn(0); return res(); }
    ctx.scene.cameras.main.fadeIn(ms, 0, 0, 0);
    ctx.scene.time.delayedCall(ms, res);
  });

/** Fundido a negro. */
export const fadeOut = (ms = 600): Step => (ctx) =>
  new Promise((res) => {
    if (ctx.skipped) { ctx.scene.cameras.main.fadeOut(0); return res(); }
    ctx.scene.cameras.main.fadeOut(ms, 0, 0, 0);
    ctx.scene.time.delayedCall(ms, res);
  });

/** Una línea de diálogo; resuelve cuando el jugador la cierra (Enter). */
export const say = (speaker: string, text: string): Step => (ctx) =>
  new Promise((res) => {
    if (ctx.skipped) return res();
    const hud = ctx.scene.scene.get("Hud") as unknown as {
      dialogue: { start: (s: DialogueScript, id: string, onClose?: () => void) => void; visible: boolean };
    };
    if (!hud?.dialogue) return res();
    const script: DialogueScript = { n: { id: "n", speaker, text, next: null } };
    hud.dialogue.start(script, "n", () => res());
  });

/** Mueve un actor hasta (x,y) por tween, orientando su sprite. */
export const moveActor = (actor: MovableActor, x: number, y: number, speed = 80): Step => (ctx) =>
  new Promise((res) => {
    const dx = x - actor.x;
    const dy = y - actor.y;
    const dir: Direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    actor.facing = dir;
    if (ctx.scene.textures.exists(`player_${dir}`)) actor.setTexture(`player_${dir}`);
    const dist = Math.hypot(dx, dy);
    const dur = ctx.skipped ? 0 : (dist / speed) * 1000;
    if (dur === 0) { actor.setPosition(x, y); return res(); }
    ctx.scene.tweens.add({ targets: actor, x, y, duration: dur, ease: "Linear", onComplete: () => res() });
  });

/** Orienta al actor sin moverlo. */
export const face = (actor: MovableActor, dir: Direction): Step => async (ctx) => {
  actor.facing = dir;
  if (ctx.scene.textures.exists(`player_${dir}`)) actor.setTexture(`player_${dir}`);
};

/** Dispara un efecto de sonido. */
export const sfx = (name: "blip" | "confirm" | "footstep"): Step => async () => {
  Sfx.get()[name]();
};

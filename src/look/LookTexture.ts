import Phaser from "phaser";
import { drawCharacter, SPRITE_W, SPRITE_H } from "./characters";
import type { CharacterLook, Direction, AnimState } from "./characters";

let counter = 0;

/**
 * Puente entre el Look System (Canvas2D) y Phaser (WebGL): cada personaje vive
 * en su propia textura-canvas que se vuelve a dibujar por frame con la pose
 * actual (dirección + estado + tiempo). El sprite de la entidad usa esa textura.
 *
 * Pensado para pocas entidades a la vez (jugador + un puñado de zombies/NPCs),
 * que es lo que pide el modo historia. Si algún día hay multitudes, conviene
 * pre-hornear sprite sheets.
 */
export interface LookTexture {
  key: string;
  draw(dir: Direction, state: AnimState, tSec: number): void;
  destroy(): void;
}

export function createLookTexture(scene: Phaser.Scene, look: CharacterLook, scale = 1): LookTexture {
  const w = SPRITE_W * scale, h = SPRITE_H * scale;
  const key = `look:${look.id}:${counter++}`;
  const ct = scene.textures.createCanvas(key, w, h);
  if (!ct) throw new Error(`No se pudo crear la textura de ${look.id}`);
  ct.setFilter(Phaser.Textures.FilterMode.NEAREST);
  const ctx = ct.context;
  ctx.imageSmoothingEnabled = false;

  return {
    key,
    draw(dir, state, tSec) {
      ctx.clearRect(0, 0, w, h);
      drawCharacter(ctx, look, dir, state, tSec, scale, 0, 0);
      ct.refresh();
    },
    destroy() {
      if (scene.textures.exists(key)) scene.textures.remove(key);
    },
  };
}

/** Dirección de animación (4) más cercana a un vector de movimiento. */
export function dirFromVector(vx: number, vy: number): Direction {
  if (Math.abs(vx) > Math.abs(vy)) return vx < 0 ? "left" : "right";
  return vy < 0 ? "up" : "down";
}

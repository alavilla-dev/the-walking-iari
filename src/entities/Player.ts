import Phaser from "phaser";
import {
  PLAYER_SPEED, SPRINT_MULT, MELEE_RANGE,
  GUN_RECOIL, PLAYER_HURT_KNOCKBACK, PLAYER_IFRAMES,
} from "../config";
import { Sfx } from "../systems/Sfx";
import { createLookTexture, type LookTexture } from "../look/LookTexture";
import { CHARACTERS } from "../look/characters";
import type { AnimState } from "../look/characters";
import type { WeaponDef } from "../data/weapons";
import type { Direction } from "../types";

/** Dirección de animación (4) más cercana a un ángulo de apuntado. */
function dirFromAngle(angle: number): Direction {
  const a = Phaser.Math.RadToDeg(angle);
  if (a >= -45 && a < 45) return "right";
  if (a >= 45 && a < 135) return "down";
  if (a >= -135 && a < -45) return "up";
  return "left";
}

export interface MuzzleInfo { x: number; y: number; angle: number; }

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: Direction = "down";
  private look: LookTexture;
  private lastUse = -Infinity;
  private attacking = false;
  private shooting = false;
  private running = false;
  private hitstunUntil = 0;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const look = createLookTexture(scene, CHARACTERS.hero_iara, 1);
    super(scene, x, y, look.key);
    this.look = look;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    // Sprite 32x48: cuerpo chico a la altura de los pies.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 8);
    body.setOffset(10, 38);
    this.look.draw(this.facing, "idle", 0); // cuadro inicial (evita 1 frame vacío)
  }

  handleInput(input: {
    up: boolean; down: boolean; left: boolean; right: boolean; sprint: boolean;
  }): void {
    // Durante el aturdimiento por un golpe, conserva la velocidad de retroceso.
    if (this.scene.time.now < this.hitstunUntil) return;

    let vx = 0, vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;

    const moving = vx !== 0 || vy !== 0;
    const speed = PLAYER_SPEED * (input.sprint ? SPRINT_MULT : 1);
    this.running = moving && input.sprint;

    // Normalizar diagonal y suavizar (aceleración/frenado).
    const len = Math.hypot(vx, vy) || 1;
    const targetVx = moving ? (vx / len) * speed : 0;
    const targetVy = moving ? (vy / len) * speed : 0;
    const ease = moving ? 0.25 : 0.35;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setVelocity(
      Phaser.Math.Linear(body.velocity.x, targetVx, ease),
      Phaser.Math.Linear(body.velocity.y, targetVy, ease),
    );

    // Dirección de cara (no se pisa mientras ataca/dispara: ahí mira al apuntado).
    if (!this.attacking && !this.shooting) {
      if (vy < 0) this.facing = "up";
      else if (vy > 0) this.facing = "down";
      else if (vx < 0) this.facing = "left";
      else if (vx > 0) this.facing = "right";
    }
  }

  /** Redibuja el sprite con la pose actual. La escena lo llama una vez por frame. */
  renderLook(tSec: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const moving = body.velocity.length() > 12;
    const state: AnimState = this.shooting ? "shoot"
      : this.attacking ? "knife"
      : moving ? (this.running ? "run" : "walk")
      : "idle";
    this.look.draw(this.facing, state, tSec);
  }

  /** ¿El cooldown del arma actual ya pasó? */
  canUse(time: number, def: WeaponDef): boolean {
    return time - this.lastUse >= def.cooldown;
  }

  /** Ángulo (rad) de la dirección a la que mira, para la visión/niebla. */
  get facingAngle(): number {
    switch (this.facing) {
      case "right": return 0;
      case "down": return Math.PI / 2;
      case "left": return Math.PI;
      default: return -Math.PI / 2; // up
    }
  }

  /** Golpe cuerpo a cuerpo hacia `aimAngle`. Devuelve el rectángulo de golpe o null. */
  meleeSwing(time: number, def: WeaponDef, aimAngle: number): Phaser.Geom.Rectangle | null {
    if (!this.canUse(time, def)) return null;
    this.lastUse = time;
    this.facing = dirFromAngle(aimAngle);
    Sfx.get().swoosh();

    this.attacking = true;
    this.scene.time.delayedCall(def.cooldown * 0.55, () => { this.attacking = false; });

    const r = def.range ?? MELEE_RANGE;
    let cx = this.x, cy = this.y;
    if (this.facing === "up") cy -= r;
    else if (this.facing === "down") cy += r;
    else if (this.facing === "left") cx -= r;
    else cx += r;
    return new Phaser.Geom.Rectangle(cx - r / 2, cy - r / 2, r, r);
  }

  /**
   * Dispara el arma de fuego apuntando a `aimAngle`. Devuelve la boca del arma
   * (de dónde sale la bala) o null si está en cooldown. La escena crea la(s) bala(s).
   */
  fireRanged(time: number, aimAngle: number, def: WeaponDef): MuzzleInfo | null {
    if (!this.canUse(time, def)) return null;
    this.lastUse = time;
    Sfx.get().gunshot(def.sfx ?? "pistol");

    this.facing = dirFromAngle(aimAngle);
    this.shooting = true;
    this.scene.time.delayedCall(170, () => { this.shooting = false; });

    // Retroceso suave en contra del disparo.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x -= Math.cos(aimAngle) * GUN_RECOIL;
    body.velocity.y -= Math.sin(aimAngle) * GUN_RECOIL;

    return {
      x: this.x + Math.cos(aimAngle) * 20,
      y: this.y + Math.sin(aimAngle) * 20 - 6,
      angle: aimAngle,
    };
  }

  isInvulnerable(time: number): boolean {
    return time < this.invulnerableUntil;
  }

  /**
   * Recibe un golpe desde (fromX,fromY): retrocede, parpadea y queda invulnerable
   * un instante. Devuelve false si estaba en i-frames (no se aplica daño).
   */
  hurt(fromX: number, fromY: number): boolean {
    const time = this.scene.time.now;
    if (time < this.invulnerableUntil) return false;
    this.invulnerableUntil = time + PLAYER_IFRAMES;
    this.hitstunUntil = time + 160;

    const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    this.setVelocity(Math.cos(angle) * PLAYER_HURT_KNOCKBACK, Math.sin(angle) * PLAYER_HURT_KNOCKBACK);

    this.setTint(0xff5555);
    this.scene.tweens.add({
      targets: this, alpha: 0.35, duration: 90, yoyo: true, repeat: 2,
      onComplete: () => { this.clearTint(); this.setAlpha(1); },
    });
    return true;
  }

  destroy(fromScene?: boolean): void {
    this.look.destroy();
    super.destroy(fromScene);
  }
}

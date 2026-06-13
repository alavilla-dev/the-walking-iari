import Phaser from "phaser";
import {
  PLAYER_SPEED, SPRINT_MULT,
  MELEE_RANGE, MELEE_DAMAGE, MELEE_COOLDOWN,
} from "../config";
import type { Direction } from "../types";

// Frame de reposo (idle) por dirección en la hoja LPC (9 cols x 4 filas).
const IDLE: Record<Direction, number> = { up: 0, left: 9, down: 18, right: 27 };

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: Direction = "down";
  private lastAttack = -Infinity;
  private attacking = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "iara_walk", IDLE.down);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    // Cuerpo chico a la altura de los pies (frame LPC 64x64).
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 12);
    body.setOffset(24, 48);
  }

  handleInput(input: {
    up: boolean; down: boolean; left: boolean; right: boolean; sprint: boolean;
  }): void {
    let vx = 0, vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;

    const moving = vx !== 0 || vy !== 0;
    const speed = PLAYER_SPEED * (input.sprint ? SPRINT_MULT : 1);

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

    // Dirección de cara (prioriza eje vertical).
    if (vy < 0) this.facing = "up";
    else if (vy > 0) this.facing = "down";
    else if (vx < 0) this.facing = "left";
    else if (vx > 0) this.facing = "right";

    // Mientras ataca, no se pisa la animación de golpe.
    if (this.attacking) return;

    // Animación: camina si se mueve, si no queda en reposo.
    if (moving) {
      this.anims.play(`iara-walk-${this.facing}`, true);
    } else {
      this.anims.stop();
      this.setFrame(IDLE[this.facing]);
    }
  }

  canAttack(time: number): boolean {
    return time - this.lastAttack >= MELEE_COOLDOWN;
  }

  /** Devuelve el rectángulo de golpe frente a Iara, o null si está en cooldown. */
  attack(time: number): Phaser.Geom.Rectangle | null {
    if (!this.canAttack(time)) return null;
    this.lastAttack = time;

    // Animación de golpe (slash); al terminar vuelve al reposo/caminar.
    this.attacking = true;
    this.anims.play(`iara-slash-${this.facing}`, true);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.attacking = false;
      this.setFrame(IDLE[this.facing]);
    });

    const r = MELEE_RANGE;
    let cx = this.x, cy = this.y;
    if (this.facing === "up") cy -= r;
    else if (this.facing === "down") cy += r;
    else if (this.facing === "left") cx -= r;
    else cx += r;
    return new Phaser.Geom.Rectangle(cx - r / 2, cy - r / 2, r, r);
  }

  get meleeDamage(): number {
    return MELEE_DAMAGE;
  }
}

import Phaser from "phaser";
import {
  PLAYER_SPEED, SPRINT_MULT,
  MELEE_RANGE, MELEE_DAMAGE, MELEE_COOLDOWN,
} from "../config";
import type { Direction } from "../types";

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: Direction = "down";
  private bobTween?: Phaser.Tweens.Tween;
  private lastAttack = -Infinity;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player_down");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(12);
  }

  /** keys: objeto con estados booleanos de input. */
  handleInput(input: {
    up: boolean; down: boolean; left: boolean; right: boolean; sprint: boolean;
  }): void {
    let vx = 0;
    let vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;

    const moving = vx !== 0 || vy !== 0;
    const speed = PLAYER_SPEED * (input.sprint ? SPRINT_MULT : 1);

    // Normalizar diagonal y suavizar (aceleración/frenado) para un andar menos rígido
    const len = Math.hypot(vx, vy) || 1;
    const targetVx = moving ? (vx / len) * speed : 0;
    const targetVy = moving ? (vy / len) * speed : 0;
    const ease = moving ? 0.25 : 0.35; // frena un poco más rápido que acelera
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setVelocity(
      Phaser.Math.Linear(body.velocity.x, targetVx, ease),
      Phaser.Math.Linear(body.velocity.y, targetVy, ease),
    );

    // Dirección de cara (prioriza eje vertical para el sprite)
    if (vy < 0) this.facing = "up";
    else if (vy > 0) this.facing = "down";
    else if (vx < 0) this.facing = "left";
    else if (vx > 0) this.facing = "right";
    if (moving) this.setTexture(`player_${this.facing}`);

    this.updateBob(moving);
  }

  private updateBob(moving: boolean): void {
    if (moving && !this.bobTween?.isPlaying()) {
      this.bobTween = this.scene.tweens.add({
        targets: this,
        scaleY: 0.92,
        duration: 120,
        yoyo: true,
        repeat: -1,
      });
    } else if (!moving && this.bobTween) {
      this.bobTween.stop();
      this.setScale(1);
      this.bobTween = undefined;
    }
  }

  canAttack(time: number): boolean {
    return time - this.lastAttack >= MELEE_COOLDOWN;
  }

  /** Devuelve el rectángulo de golpe frente a Iara, o null si está en cooldown. */
  attack(time: number): Phaser.Geom.Rectangle | null {
    if (!this.canAttack(time)) return null;
    this.lastAttack = time;
    const r = MELEE_RANGE;
    let cx = this.x, cy = this.y;
    if (this.facing === "up") cy -= r;
    else if (this.facing === "down") cy += r;
    else if (this.facing === "left") cx -= r;
    else cx += r;
    // Feedback visual
    const fx = this.scene.add.circle(cx, cy, 10, 0xffffff, 0.5).setDepth(50);
    this.scene.tweens.add({ targets: fx, alpha: 0, duration: 150, onComplete: () => fx.destroy() });
    return new Phaser.Geom.Rectangle(cx - r / 2, cy - r / 2, r, r);
  }

  get meleeDamage(): number {
    return MELEE_DAMAGE;
  }
}

import Phaser from "phaser";
import { BULLET_SPEED, BULLET_RANGE, GUN_DAMAGE } from "../config";

/**
 * Proyectil de la pistola. Viaja en línea recta hacia el ángulo de disparo,
 * desaparece tras `BULLET_RANGE` px. Recuerda su origen para empujar al zombie
 * en la dirección del balazo.
 */
export class Bullet extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number;
  readonly knockback: number;
  readonly originX2: number;
  readonly originY2: number;

  constructor(scene: Phaser.Scene, x: number, y: number, angle: number, damage = GUN_DAMAGE, knockback = 160) {
    super(scene, x, y, "bullet");
    this.damage = damage;
    this.knockback = knockback;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.originX2 = x;
    this.originY2 = y;
    this.setRotation(angle);
    this.setDepth(700);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setVelocity(Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED);
    // Estela corta.
    scene.tweens.add({ targets: this, scaleX: 1.6, duration: 60, yoyo: true, repeat: -1 });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (Phaser.Math.Distance.Between(this.originX2, this.originY2, this.x, this.y) > BULLET_RANGE) {
      this.destroy();
    }
  }
}

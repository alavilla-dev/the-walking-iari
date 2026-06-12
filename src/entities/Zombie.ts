import Phaser from "phaser";
import { ZombieBrain } from "../systems/ZombieBrain";
import {
  ZOMBIE_SPEED, ZOMBIE_BASE_PS, ZOMBIE_DAMAGE,
  ZOMBIE_ATTACK_COOLDOWN,
} from "../config";

export class Zombie extends Phaser.Physics.Arcade.Sprite {
  private brain = new ZombieBrain();
  private ps = ZOMBIE_BASE_PS;
  private lastAttack = -Infinity;
  private stunnedUntil = 0;
  /** callback cuando este zombie golpea al jugador */
  onHitPlayer?: (damage: number) => void;
  /** callback cuando muere (para dar XP) */
  onDeath?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "zombie");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(12);
  }

  think(time: number, player: Phaser.Math.Vector2): void {
    // Mientras está aturdido por un golpe, conserva la velocidad de retroceso.
    if (time < this.stunnedUntil) return;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const ready = time - this.lastAttack >= ZOMBIE_ATTACK_COOLDOWN;
    const action = this.brain.decide({ distance, attackCooldownReady: ready });

    if (action.move) {
      // moveTo fija velocidad de golpe; suavizamos hacia ella para un andar menos brusco.
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      const body = this.body as Phaser.Physics.Arcade.Body;
      const tx = Math.cos(angle) * ZOMBIE_SPEED;
      const ty = Math.sin(angle) * ZOMBIE_SPEED;
      this.setVelocity(
        Phaser.Math.Linear(body.velocity.x, tx, 0.12),
        Phaser.Math.Linear(body.velocity.y, ty, 0.12),
      );
    } else {
      this.setVelocity(0, 0);
    }
    if (action.attack) {
      this.lastAttack = time;
      this.onHitPlayer?.(ZOMBIE_DAMAGE);
      this.flashAttack();
    }
  }

  takeDamage(amount: number, fromX?: number, fromY?: number): void {
    this.ps -= amount;
    this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 60, yoyo: true });
    if (fromX !== undefined && fromY !== undefined) {
      this.applyKnockback(fromX, fromY);
    }
    if (this.ps <= 0) this.die();
  }

  /** Empuja al zombie en dirección contraria al origen del golpe y lo aturde brevemente. */
  applyKnockback(fromX: number, fromY: number, force = 320, stunMs = 220): void {
    const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    this.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
    this.stunnedUntil = this.scene.time.now + stunMs;
  }

  private die(): void {
    this.onDeath?.();
    this.destroy();
  }

  private flashAttack(): void {
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => this.clearTint());
  }
}

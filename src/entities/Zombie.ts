import Phaser from "phaser";
import { ZombieBrain } from "../systems/ZombieBrain";
import { Vfx } from "../systems/Vfx";
import { createLookTexture, dirFromVector, type LookTexture } from "../look/LookTexture";
import { CHARACTERS } from "../look/characters";
import type { Direction } from "../look/characters";
import {
  ZOMBIE_SPEED, ZOMBIE_BASE_PS, ZOMBIE_DAMAGE,
  ZOMBIE_ATTACK_COOLDOWN, ZOMBIE_XP_REWARD,
} from "../config";

export type ZombieKind = "walker" | "runner" | "brute";

interface KindStats {
  hp: number; speedMult: number; scale: number; dmgMult: number;
  kbFactor: number; look: string; xp: number;
}

const KINDS: Record<ZombieKind, KindStats> = {
  // caminante: estándar (oficinista).
  walker: { hp: ZOMBIE_BASE_PS, speedMult: 1.0, scale: 1.25, dmgMult: 1, kbFactor: 1.0, look: "z_oficinista", xp: ZOMBIE_XP_REWARD },
  // corredor: rápido y frágil.
  runner: { hp: 30, speedMult: 2.1, scale: 1.2, dmgMult: 0.8, kbFactor: 1.15, look: "z_corredor", xp: 24 },
  // bruto: lento, mucha vida, pega fuerte y casi no retrocede (obrero).
  brute: { hp: 130, speedMult: 0.6, scale: 1.8, dmgMult: 2.2, kbFactor: 0.32, look: "z_obrero", xp: 45 },
};

export class Zombie extends Phaser.Physics.Arcade.Sprite {
  readonly kind: ZombieKind;
  private stats: KindStats;
  private look: LookTexture;
  private lookDir: Direction = "down";
  private brain = new ZombieBrain();
  private ps: number;
  private psMax: number;
  private speed: number;
  private lastAttack = -Infinity;
  private stunnedUntil = 0;
  private hpBar?: Phaser.GameObjects.Graphics;

  /** callback cuando este zombie golpea al jugador (daño, posición del zombie) */
  onHitPlayer?: (damage: number, x: number, y: number) => void;
  /** callback cuando muere (XP otorgada) */
  onDeath?: (xp: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: ZombieKind = "walker") {
    const stats = KINDS[kind];
    const look = createLookTexture(scene, CHARACTERS[stats.look], 1);
    super(scene, x, y, look.key);
    this.kind = kind;
    this.stats = stats;
    this.look = look;
    this.ps = this.psMax = stats.hp;
    this.speed = ZOMBIE_SPEED * stats.speedMult;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(stats.scale);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(9, 7, 30); // a la altura de los pies (sprite 32x48)
    this.look.draw(this.lookDir, "idle", 0); // cuadro inicial
  }

  get attackDamage(): number {
    return Math.round(ZOMBIE_DAMAGE * this.stats.dmgMult);
  }

  think(time: number, player: Phaser.Math.Vector2): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (time < this.stunnedUntil) { this.updateHpBar(); return; }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const ready = time - this.lastAttack >= ZOMBIE_ATTACK_COOLDOWN;
    const action = this.brain.decide({ distance, attackCooldownReady: ready });

    if (action.move) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      const tx = Math.cos(angle) * this.speed;
      const ty = Math.sin(angle) * this.speed;
      this.setVelocity(
        Phaser.Math.Linear(body.velocity.x, tx, 0.12),
        Phaser.Math.Linear(body.velocity.y, ty, 0.12),
      );
    } else {
      this.setVelocity(body.velocity.x * 0.8, body.velocity.y * 0.8);
    }

    if (action.attack) {
      this.lastAttack = time;
      // Embestida hacia el jugador (lectura de "mordida").
      const a = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(Math.cos(a) * 220, Math.sin(a) * 220);
      this.stunnedUntil = time + 150;
      this.flashAttack();
      this.onHitPlayer?.(this.attackDamage, this.x, this.y);
    }
    this.updateHpBar();
  }

  /** Redibuja el sprite (dirección según el andar). La escena lo llama por frame. */
  renderLook(tSec: number): void {
    const v = (this.body as Phaser.Physics.Arcade.Body).velocity;
    const moving = v.length() > 8;
    if (moving) this.lookDir = dirFromVector(v.x, v.y);
    this.look.draw(this.lookDir, moving ? "walk" : "idle", tSec);
  }

  takeDamage(amount: number, fromX?: number, fromY?: number, knockback = 165): void {
    this.ps -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => { if (this.active) this.clearTint(); });

    if (fromX !== undefined && fromY !== undefined) {
      this.applyKnockback(fromX, fromY, knockback);
      const away = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
      Vfx.blood(this.scene, this.x, this.y, away, 7);
    }
    if (this.ps <= 0) this.die();
    else this.updateHpBar();
  }

  /** Empuja al zombie en contra del origen del golpe y lo aturde un instante. */
  applyKnockback(fromX: number, fromY: number, force = 165, stunMs = 130): void {
    const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    const f = force * this.stats.kbFactor;
    this.setVelocity(Math.cos(angle) * f, Math.sin(angle) * f);
    this.stunnedUntil = this.scene.time.now + stunMs;
  }

  private die(): void {
    this.hpBar?.destroy();
    this.hpBar = undefined;
    Vfx.blood(this.scene, this.x, this.y, undefined, 16);
    Vfx.stain(this.scene, this.x, this.y);
    this.onDeath?.(this.stats.xp);
    this.disableBody(true, false);
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: this.stats.scale * 1.2, scaleY: this.stats.scale * 0.6,
      angle: this.angle + Phaser.Math.Between(-40, 40), duration: 240, ease: "Quad.easeIn",
      onComplete: () => this.destroy(),
    });
  }

  private flashAttack(): void {
    this.setTint(0xff7a4a);
    this.scene.time.delayedCall(140, () => { if (this.active) this.clearTint(); });
  }

  /** Barra de vida flotante; sólo aparece cuando el zombie ya recibió daño. */
  private updateHpBar(): void {
    if (this.ps >= this.psMax) return;
    if (!this.hpBar) this.hpBar = this.scene.add.graphics().setDepth(750);
    const w = 22, h = 3;
    const x = this.x - w / 2;
    const y = this.y - this.displayHeight * 0.55;
    const frac = Phaser.Math.Clamp(this.ps / this.psMax, 0, 1);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.7).fillRect(x - 1, y - 1, w + 2, h + 2);
    this.hpBar.fillStyle(0x3a2a2a, 1).fillRect(x, y, w, h);
    this.hpBar.fillStyle(frac > 0.5 ? 0x6fcf5c : frac > 0.25 ? 0xe8b45a : 0xd9543a, 1).fillRect(x, y, w * frac, h);
  }

  destroy(fromScene?: boolean): void {
    this.hpBar?.destroy();
    this.hpBar = undefined;
    this.look.destroy();
    super.destroy(fromScene);
  }
}

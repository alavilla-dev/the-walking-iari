import Phaser from "phaser";
import { Sfx } from "../systems/Sfx";

export interface CatOpts {
  frenetic: boolean; // Marfil = true (se mueve mucho); Venus = false (tranquilo)
  high: boolean;     // tono del maullido (agudo/grave)
}

/** Gato con deambular simple y maullido al acercarse el jugador. */
export class Cat extends Phaser.Physics.Arcade.Sprite {
  private homeX: number;
  private homeY: number;
  private frenetic: boolean;
  private highMeow: boolean;
  private speed: number;
  private target: { x: number; y: number } | null = null;
  private nextDecision = 0;
  private lastMeow = -Infinity;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, opts: CatOpts) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(1.2);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 9);
    body.setOffset(5, 13);
    this.homeX = x; this.homeY = y;
    this.frenetic = opts.frenetic;
    this.highMeow = opts.high;
    this.speed = opts.frenetic ? 55 : 32;
  }

  tick(time: number, player: Phaser.Math.Vector2): void {
    this.setDepth(this.y);

    // Decidir si camina a un nuevo punto o se queda quieto.
    if (time > this.nextDecision) {
      const moveChance = this.frenetic ? 0.78 : 0.2;
      if (Math.random() < moveChance) {
        const R = this.frenetic ? 230 : 60;
        this.target = {
          x: this.homeX + Phaser.Math.Between(-R, R),
          y: this.homeY + Phaser.Math.Between(-R, R),
        };
      } else {
        this.target = null;
      }
      this.nextDecision = time + (this.frenetic
        ? Phaser.Math.Between(500, 1300)
        : Phaser.Math.Between(2000, 4500));
    }

    // Movimiento hacia el objetivo.
    if (this.target) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      if (d < 8) {
        this.target = null;
        this.setVelocity(0, 0);
      } else {
        this.scene.physics.moveTo(this, this.target.x, this.target.y, this.speed);
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (Math.abs(body.velocity.x) > 4) this.setFlipX(body.velocity.x < 0);
      }
    } else {
      this.setVelocity(0, 0);
    }

    // Maullar al acercarse el jugador.
    const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dp < 72 && time - this.lastMeow > 2600) {
      this.lastMeow = time;
      Sfx.get().meow(this.highMeow);
      this.showMeow();
    }
  }

  private showMeow(): void {
    const t = this.scene.add.text(this.x, this.y - 16, "¡Miau!", {
      color: "#ffffff", fontSize: "10px", backgroundColor: "#00000088",
    }).setOrigin(0.5, 1).setPadding(2).setDepth(this.y + 2000);
    this.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1000, onComplete: () => t.destroy() });
  }
}

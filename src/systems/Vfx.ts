import Phaser from "phaser";
import { RENDER_SCALE } from "../config";

/**
 * Efectos de "jugo" del combate: sangre, números de daño, fogonazo, sacudida
 * de cámara. Todo se dibuja en coords de mundo de la escena que lo invoca.
 */
export const Vfx = {
  /** Estallido de partículas de sangre; si se da `awayAngle`, sale hacia ese lado. */
  blood(scene: Phaser.Scene, x: number, y: number, awayAngle?: number, qty = 10): void {
    const spread = 55;
    const angle = awayAngle === undefined
      ? { min: 0, max: 360 }
      : { min: Phaser.Math.RadToDeg(awayAngle) - spread, max: Phaser.Math.RadToDeg(awayAngle) + spread };
    const e = scene.add.particles(x, y, "blood", {
      speed: { min: 50, max: 190 },
      angle,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0.4 },
      lifespan: { min: 180, max: 420 },
      gravityY: 140,
      quantity: qty,
      emitting: false,
    });
    e.setDepth(800);
    e.explode(qty);
    scene.time.delayedCall(700, () => e.destroy());
  },

  /** Número de daño flotante (rojo cálido; amarillo si es crítico/grande). */
  damageNumber(scene: Phaser.Scene, x: number, y: number, amount: number, big = false): void {
    const t = scene.add.text(x + Phaser.Math.Between(-4, 4), y - 8, `${amount}`, {
      color: big ? "#ffd54a" : "#ff6a5a",
      fontSize: big ? "16px" : "13px",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(820).setResolution(RENDER_SCALE);
    scene.tweens.add({
      targets: t,
      y: y - 30,
      alpha: 0,
      scale: big ? 1.2 : 1,
      duration: 650,
      ease: "Quad.easeOut",
      onComplete: () => t.destroy(),
    });
  },

  /** Fogonazo del disparo en la boca del arma. */
  muzzle(scene: Phaser.Scene, x: number, y: number, angle: number): void {
    const m = scene.add.image(x, y, "muzzle")
      .setDepth(810)
      .setRotation(angle)
      .setScale(0.7 + Math.random() * 0.3);
    scene.tweens.add({
      targets: m, alpha: 0, scaleX: 0.2, scaleY: 0.2,
      duration: 90, ease: "Quad.easeIn",
      onComplete: () => m.destroy(),
    });
  },

  /** Sacudida corta de cámara (impacto). */
  shake(scene: Phaser.Scene, ms = 120, intensity = 0.006): void {
    scene.cameras.main.shake(ms, intensity);
  },

  /** Destello rojo de pantalla cuando Iara recibe daño. */
  hurtFlash(scene: Phaser.Scene): void {
    scene.cameras.main.flash(180, 120, 0, 0);
  },

  /** Destello verde suave al curarse. */
  healFlash(scene: Phaser.Scene): void {
    scene.cameras.main.flash(220, 40, 120, 40);
  },

  /** Mancha de sangre en el piso (decal que se desvanece de a poco). */
  stain(scene: Phaser.Scene, x: number, y: number): void {
    const s = scene.add.image(x, y, "stain")
      .setDepth(-50)
      .setAlpha(0.55)
      .setScale(0.8 + Math.random() * 0.8)
      .setAngle(Math.floor(Math.random() * 360));
    scene.tweens.add({ targets: s, alpha: 0, delay: 5000, duration: 3500, onComplete: () => s.destroy() });
  },
};

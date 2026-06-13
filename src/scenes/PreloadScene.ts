import Phaser from "phaser";
import { createPlaceholderTextures } from "../assets/placeholders";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }
  preload(): void {
    // Pantalla de título.
    this.load.image("title_bg", "title_bg.png");
    // Departamento (render nuevo). El mapa de profundidad/colisión se suma cuando esté.
    this.load.image("apartment_bg", "tiles/depto/render.png");
    // Cuando Ale pase el mapa: this.load.image("apartment_fg",...) + this.load.json("apartment_collision",...)
    // Retrato de Iara (HUD).
    this.load.image("portrait_iara", "portrait_iara.png");
    // Iara animada (LPC), frames 64x64: caminar (9), golpe (6), disparo (13) x 4 direcciones.
    this.load.spritesheet("iara_walk", "tiles/iara_walk.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("iara_slash", "tiles/iara_slash.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("iara_shoot", "tiles/iara_shoot.png", { frameWidth: 64, frameHeight: 64 });
    // Gatos (Elthen): Marfil blanco + Venus negro, frames 32x32.
    this.load.spritesheet("cat_marfil", "tiles/cat_marfil.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("cat_venus", "tiles/cat_venus.png", { frameWidth: 32, frameHeight: 32 });
  }

  create(): void {
    createPlaceholderTextures(this); // zombie (placeholder aún en uso)
    this.createIaraAnims();
    this.createCatAnims();

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash === "#apt") return void this.scene.start("Apartment");
    if (hash === "#lab") return void this.scene.start("Lab");
    this.scene.start("Title");
  }

  /** Animaciones de Iara (LPC: filas up/left/down/right). */
  private createIaraAnims(): void {
    const order = ["up", "left", "down", "right"];
    // Caminar (9 frames/fila, usamos 1..8).
    order.forEach((dir, r) => this.anims.create({
      key: `iara-walk-${dir}`,
      frames: this.anims.generateFrameNumbers("iara_walk", { start: r * 9 + 1, end: r * 9 + 8 }),
      frameRate: 11, repeat: -1,
    }));
    // Golpe (6 frames/fila).
    order.forEach((dir, r) => this.anims.create({
      key: `iara-slash-${dir}`,
      frames: this.anims.generateFrameNumbers("iara_slash", { start: r * 6, end: r * 6 + 5 }),
      frameRate: 14, repeat: 0,
    }));
    // Disparo (13 frames/fila) — para la fase de armas.
    order.forEach((dir, r) => this.anims.create({
      key: `iara-shoot-${dir}`,
      frames: this.anims.generateFrameNumbers("iara_shoot", { start: r * 13, end: r * 13 + 12 }),
      frameRate: 16, repeat: 0,
    }));
  }

  /** Animaciones de los gatos (Elthen): sentarse (idle) y caminar. */
  private createCatAnims(): void {
    for (const k of ["cat_marfil", "cat_venus"]) {
      this.anims.create({ key: `${k}-idle`, frames: this.anims.generateFrameNumbers(k, { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
      this.anims.create({ key: `${k}-walk`, frames: this.anims.generateFrameNumbers(k, { start: 32, end: 37 }), frameRate: 10, repeat: -1 });
    }
  }
}

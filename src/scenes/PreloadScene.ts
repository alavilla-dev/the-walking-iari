import Phaser from "phaser";
import { createPlaceholderTextures } from "../assets/placeholders";
import { createApartmentTextures } from "../assets/apartment";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }
  preload(): void {
    // Arte de la pantalla de título (recorte del diseño image.png).
    this.load.image("title_bg", "title_bg.png");
    // Cuando tengamos LimeZu / audio real: this.load.spritesheet/audio acá.
  }
  create(): void {
    createPlaceholderTextures(this); // Iara, zombie, gato, retrato
    createApartmentTextures(this);   // pisos + mobiliario del depto (sobrescribe floor_wood)
    // Flujo: Título → (Nueva Partida) → Departamento (Cap. 1).
    this.scene.start("Title");
  }
}

import Phaser from "phaser";
import { createPlaceholderTextures } from "../assets/placeholders";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }
  preload(): void {
    // Arte de la pantalla de título (recorte del diseño image.png).
    this.load.image("title_bg", "title_bg.png");
    // Fondo real del departamento (recorte de ref-depto.jpg, sin HUD ni personaje).
    this.load.image("apartment_bg", "apartment_bg.png");
    // Sprites reales de Iara (recortados de la hoja de personajes, 4 direcciones).
    this.load.image("player_down", "iara_down.png");
    this.load.image("player_up", "iara_up.png");
    this.load.image("player_left", "iara_left.png");
    this.load.image("player_right", "iara_right.png");
    // Retrato real de Iara para el HUD.
    this.load.image("portrait_iara", "portrait_iara.png");
    // Pisos del tileset LimeZu (recortes 16x16).
    this.load.image("floor_wood", "tiles/floor_wood.png");
    this.load.image("floor_tile", "tiles/floor_tile.png");
    // Cuando tengamos audio real: this.load.audio(...) acá.
  }
  create(): void {
    createPlaceholderTextures(this); // Iara, zombie, gato, retrato (sprites de personajes)
    // Atajo de desarrollo: #apt salta al depto, #lab al laboratorio.
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash === "#apt") return void this.scene.start("Apartment");
    if (hash === "#lab") return void this.scene.start("Lab");
    // Flujo normal: Título → (Nueva Partida) → Departamento (Cap. 1).
    this.scene.start("Title");
  }
}

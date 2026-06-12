import Phaser from "phaser";
import { createPlaceholderTextures } from "../assets/placeholders";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }
  preload(): void {
    // Cuando tengamos LimeZu: this.load.spritesheet(...) acá.
  }
  create(): void {
    createPlaceholderTextures(this);
    this.scene.start("Lab");
  }
}

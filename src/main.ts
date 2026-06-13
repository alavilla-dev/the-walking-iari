import Phaser from "phaser";
import { TILE } from "./config";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { TitleScene } from "./scenes/TitleScene";
import { ApartmentScene } from "./scenes/ApartmentScene";
import { LabScene } from "./scenes/LabScene";
import { HudScene } from "./scenes/HudScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 20 * TILE,
  height: 15 * TILE,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#0d0d12",
  scale: {
    // Escala para llenar la ventana manteniendo proporción y nitidez.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [BootScene, PreloadScene, TitleScene, ApartmentScene, LabScene, HudScene],
});

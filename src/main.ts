import Phaser from "phaser";
import { LOGICAL_W, LOGICAL_H, RENDER_SCALE } from "./config";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { TitleScene } from "./scenes/TitleScene";
import { ApartmentScene } from "./scenes/ApartmentScene";
import { LabScene } from "./scenes/LabScene";
import { HudScene } from "./scenes/HudScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  // Canvas a 2x la resolución lógica (supersampling para HUD/texto nítido).
  width: LOGICAL_W * RENDER_SCALE,
  height: LOGICAL_H * RENDER_SCALE,
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

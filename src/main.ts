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
  backgroundColor: "#0d0d12",
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [BootScene, PreloadScene, TitleScene, ApartmentScene, LabScene, HudScene],
});

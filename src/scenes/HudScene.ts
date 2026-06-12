import Phaser from "phaser";
import { DialogueBox } from "../ui/DialogueBox";
import { InventoryPanel } from "../ui/InventoryPanel";
import type { GameHost } from "./GameHost";

// Paleta del HUD estilo Pokémon (cajas crema, borde marrón, texto oscuro).
const PANEL = 0xf6f1e3;
const PANEL_DK = 0xe7dec8;
const BORDER = 0x3a2a1c;

/** Dibuja una caja redondeada estilo Pokémon en un Graphics nuevo y la devuelve. */
function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setScrollFactor(0).setDepth(150);
  g.fillStyle(BORDER, 1).fillRoundedRect(x, y, w, h, 8);
  g.fillStyle(PANEL, 1).fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 7);
  g.fillStyle(PANEL_DK, 1).fillRoundedRect(x + 2, y + h - 8, w - 4, 6, 4);
  return g;
}

export class HudScene extends Phaser.Scene {
  private host!: GameHost;
  private psBar!: Phaser.GameObjects.Graphics;
  private psText!: Phaser.GameObjects.Text;
  private lvlText!: Phaser.GameObjects.Text;
  dialogue!: DialogueBox;
  inventoryPanel!: InventoryPanel;

  constructor() {
    super("Hud");
  }

  init(data: { host: GameHost }): void {
    this.host = data.host;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const info = this.host.hudInfo;

    // --- Caja de LUGAR (arriba-izq) ---
    panel(this, 6, 6, 168, 40);
    this.add.text(16, 12, info.place, { color: "#2a2018", fontSize: "12px", fontStyle: "bold" }).setDepth(151);
    this.add.text(16, 28, info.subtitle, { color: "#6a5a44", fontSize: "10px" }).setDepth(151);

    // --- Menú (arriba-der) ---
    const menu = ["Diario", "Mochila", "Guardar", "Opciones"];
    panel(this, W - 110, 6, 104, 18 + menu.length * 15);
    menu.forEach((m, i) => {
      this.add.text(W - 98, 14 + i * 15, `▸ ${m}`, { color: "#2a2018", fontSize: "11px" }).setDepth(151);
    });

    // --- Panel de PERSONAJE (abajo-izq) ---
    const py = H - 56;
    panel(this, 6, py, 168, 50);
    this.add.image(30, py + 25, "portrait_iara").setDepth(151);
    const sym = info.gender === "F" ? "♀" : "♂";
    this.add.text(56, py + 8, `${info.name.toUpperCase()}  ${sym}`, {
      color: "#2a2018", fontSize: "12px", fontStyle: "bold",
    }).setDepth(151);
    this.lvlText = this.add.text(140, py + 8, "Nv.1", { color: "#2a2018", fontSize: "11px" }).setDepth(151);
    this.add.text(56, py + 24, "PS", { color: "#6a5a44", fontSize: "10px", fontStyle: "bold" }).setDepth(151);
    this.psBar = this.add.graphics().setDepth(151);
    this.psText = this.add.text(120, py + 34, "20/20", { color: "#2a2018", fontSize: "9px" }).setDepth(151);

    this.host.events.on("hud-update", () => this.refresh());

    // UI overlays
    this.dialogue = new DialogueBox(this);
    this.inventoryPanel = new InventoryPanel(this, this.host.inventory);

    const kb = this.input.keyboard!;
    kb.addKey("ENTER").on("down", () => this.dialogue.advance());
    kb.addKey("I").on("down", () => this.inventoryPanel.toggle());

    this.refresh();
  }

  private refresh(): void {
    const psMax = this.host.progression.psMax();
    const ps = this.host.ps;
    this.lvlText.setText(`Nv.${this.host.progression.level}`);
    this.psText.setText(`${ps}/${psMax}`);

    const x = 74, y = this.scale.height - 22, w = 80, h = 7;
    this.psBar.clear();
    this.psBar.fillStyle(0x000000, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    this.psBar.fillStyle(0x3a3a3a, 1).fillRect(x, y, w, h);
    const frac = psMax > 0 ? ps / psMax : 0;
    const color = frac > 0.5 ? 0x5cd65c : frac > 0.2 ? 0xf0c020 : 0xe04040;
    this.psBar.fillStyle(color, 1).fillRect(x, y, w * frac, h);
  }
}

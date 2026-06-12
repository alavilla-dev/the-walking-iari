import Phaser from "phaser";
import { DialogueBox } from "../ui/DialogueBox";
import { InventoryPanel } from "../ui/InventoryPanel";
import type { LabScene } from "./LabScene";

export class HudScene extends Phaser.Scene {
  private lab!: LabScene;
  private psBar!: Phaser.GameObjects.Graphics;
  private psText!: Phaser.GameObjects.Text;
  private lvlText!: Phaser.GameObjects.Text;
  dialogue!: DialogueBox;
  inventoryPanel!: InventoryPanel;

  constructor() {
    super("Hud");
  }

  init(data: { lab: LabScene }): void {
    this.lab = data.lab;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Lugar (arriba-izq)
    this.add
      .text(8, 6, "Laboratorio — Morón", {
        color: "#ffffff", fontSize: "12px", backgroundColor: "#000000a0",
      })
      .setPadding(4);

    // Menú (arriba-der)
    this.add
      .text(W - 8, 6, "Diario · Mochila · Guardar · Opciones", {
        color: "#cccccc", fontSize: "11px", backgroundColor: "#000000a0",
      })
      .setPadding(4)
      .setOrigin(1, 0);

    // Retrato + Nv + PS (abajo-izq)
    this.add.image(20, H - 28, "portrait_iara").setOrigin(0, 0.5);
    this.lvlText = this.add.text(52, H - 40, "Nv.1", { color: "#ffffff", fontSize: "12px" });
    this.psText = this.add.text(52, H - 12, "PS 20/20", { color: "#ffffff", fontSize: "11px" });
    this.psBar = this.add.graphics();

    this.lab.events.on("hud-update", () => this.refresh());

    // UI overlays
    this.dialogue = new DialogueBox(this);
    this.inventoryPanel = new InventoryPanel(this, this.lab.inventory);

    const kb = this.input.keyboard!;
    kb.addKey("ENTER").on("down", () => this.dialogue.advance());
    kb.addKey("I").on("down", () => this.inventoryPanel.toggle());

    this.refresh();
  }

  private refresh(): void {
    const psMax = this.lab.progression.psMax();
    const ps = this.lab.ps;
    this.lvlText.setText(`Nv.${this.lab.progression.level}`);
    this.psText.setText(`PS ${ps}/${psMax}`);

    const H = this.scale.height;
    const x = 52, y = H - 26, w = 90, h = 8;
    this.psBar.clear();
    this.psBar.fillStyle(0x333333, 1).fillRect(x, y, w, h);
    this.psBar.fillStyle(0x4caf50, 1).fillRect(x, y, w * (ps / psMax), h);
    this.psBar.lineStyle(1, 0x000000, 1).strokeRect(x, y, w, h);
  }
}

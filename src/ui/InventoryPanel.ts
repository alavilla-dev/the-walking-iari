import Phaser from "phaser";
import type { InventoryModel } from "../systems/InventoryModel";

export class InventoryPanel {
  private container: Phaser.GameObjects.Container;

  constructor(private scene: Phaser.Scene, private inventory: InventoryModel) {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const bg = scene.add.rectangle(0, 0, 220, 200, 0x101018, 0.97).setOrigin(0.5);
    bg.setStrokeStyle(2, 0xffffff, 0.6);
    const title = scene.add.text(0, -85, "MOCHILA", { color: "#ffd54a", fontSize: "14px" }).setOrigin(0.5);
    this.container = scene.add.container(W / 2, H / 2, [bg, title]);
    this.container.setDepth(210).setScrollFactor(0).setVisible(false);
  }

  get visible(): boolean {
    return this.container.visible;
  }

  toggle(): void {
    if (this.container.visible) this.hide();
    else this.show();
  }

  private show(): void {
    // limpiar items previos (todo menos bg + título)
    while (this.container.length > 2) this.container.removeAt(2, true);
    const items = this.inventory.list();
    if (items.length === 0) {
      this.container.add(
        this.scene.add.text(0, 0, "(vacía)", { color: "#888888", fontSize: "12px" }).setOrigin(0.5),
      );
    } else {
      items.forEach((it, i) => {
        const label = `${it.def.name}${it.def.stackable ? ` x${it.qty}` : ""}`;
        const t = this.scene.add.text(-95, -60 + i * 22, `• ${label}`, {
          color: it.def.type === "narrative" ? "#ff9fce" : "#ffffff",
          fontSize: "12px",
        });
        this.container.add(t);
      });
    }
    this.container.setVisible(true);
  }

  private hide(): void {
    this.container.setVisible(false);
  }
}

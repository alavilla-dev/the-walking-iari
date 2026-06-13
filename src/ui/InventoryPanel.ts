import Phaser from "phaser";
import { crispText, logicalW, logicalH } from "./uikit";
import type { InventoryModel } from "../systems/InventoryModel";

export interface InventoryHooks {
  /** Equipar un arma por id (clic en la mochila). */
  onEquip?: (id: string) => void;
  /** Usar un consumible por id (clic en la mochila). */
  onUse?: (id: string) => void;
  /** Id del arma equipada (para marcarla). */
  equippedId?: () => string | null | undefined;
}

export class InventoryPanel {
  private container: Phaser.GameObjects.Container;

  private static readonly PW = 224;
  private static readonly PH = 212;

  constructor(private scene: Phaser.Scene, private inventory: InventoryModel, private hooks: InventoryHooks = {}) {
    const W = logicalW(scene);
    const H = logicalH(scene);
    const pw = InventoryPanel.PW, ph = InventoryPanel.PH;
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.4).fillRoundedRect(-pw / 2 + 2, -ph / 2 + 3, pw, ph, 7);
    g.fillStyle(0x17130e, 0.95).fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 7);
    g.lineStyle(1, 0x6b4f2a, 1).strokeRoundedRect(-pw / 2 + 0.5, -ph / 2 + 0.5, pw - 1, ph - 1, 7);
    g.lineStyle(1, 0xc9904a, 0.22).strokeRoundedRect(-pw / 2 + 2.5, -ph / 2 + 2.5, pw - 5, ph - 5, 5);
    g.fillStyle(0xc9904a, 0.9).fillRect(-pw / 2 + 14, -ph / 2 + 28, pw - 28, 1);
    const title = crispText(scene, 0, -ph / 2 + 10, "MOCHILA", { color: "#e8b45a", fontSize: "13px", fontStyle: "bold" }).setOrigin(0.5, 0);
    this.container = scene.add.container(W / 2, H / 2, [g, title]);
    this.container.setDepth(210).setVisible(false);
  }

  get visible(): boolean {
    return this.container.visible;
  }

  toggle(): void {
    if (this.container.visible) this.hide();
    else this.show();
  }

  private show(): void {
    // limpiar items previos (todo menos panel + título)
    while (this.container.length > 2) this.container.removeAt(2, true);
    const ph = InventoryPanel.PH;
    const items = this.inventory.list();
    if (items.length === 0) {
      this.container.add(
        crispText(this.scene, 0, 0, "(vacía)", { color: "#9c8a70", fontSize: "12px" }).setOrigin(0.5),
      );
    } else {
      const equipped = this.hooks.equippedId?.();
      items.forEach((it, i) => {
        const isWeapon = it.def.type === "weapon";
        const isEquipped = isWeapon && it.def.id === equipped;
        const label = `${it.def.name}${it.def.stackable ? ` x${it.qty}` : ""}${isEquipped ? "  ◀" : ""}`;
        const color = isEquipped ? "#e8b45a" : it.def.type === "narrative" ? "#c79ad6" : "#efe6d4";
        const t = crispText(this.scene, -96, -ph / 2 + 42 + i * 22, `▪ ${label}`, { color, fontSize: "12px" });
        if (isWeapon && this.hooks.onEquip && !isEquipped) {
          t.setInteractive({ useHandCursor: true });
          t.on("pointerover", () => t.setColor("#ffd98a"));
          t.on("pointerout", () => t.setColor(color));
          t.on("pointerdown", () => { this.hooks.onEquip!(it.def.id); this.hide(); });
        } else if (it.def.type === "heal" && this.hooks.onUse) {
          t.setInteractive({ useHandCursor: true });
          t.on("pointerover", () => t.setColor("#9be08a"));
          t.on("pointerout", () => t.setColor(color));
          t.on("pointerdown", () => { this.hooks.onUse!(it.def.id); this.show(); });
        }
        this.container.add(t);
      });
    }
    const hint = this.hooks.onEquip ? "clic en un arma para equipar  ·  I / ESC" : "I  /  ESC para cerrar";
    this.container.add(
      crispText(this.scene, 0, ph / 2 - 16, hint, { color: "#9c8a70", fontSize: "9px" }).setOrigin(0.5),
    );
    this.container.setVisible(true);
  }

  private hide(): void {
    this.container.setVisible(false);
  }
}

import Phaser from "phaser";
import { DialogueRunner } from "../systems/DialogueRunner";
import type { DialogueScript } from "../types";

export class DialogueBox {
  private container: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private runner?: DialogueRunner;
  private onCloseCb?: () => void;

  constructor(private scene: Phaser.Scene) {
    const W = scene.scale.width;
    const H = scene.scale.height;
    // Caja a la derecha del panel de personaje (estilo referencia).
    const boxW = W - 186;
    const boxH = 58;
    const bg = scene.add.graphics();
    bg.fillStyle(0x3a2a1c, 1).fillRoundedRect(0, 0, boxW, boxH, 8);
    bg.fillStyle(0xf6f1e3, 1).fillRoundedRect(2, 2, boxW - 4, boxH - 4, 7);
    this.nameText = scene.add.text(10, 6, "", { color: "#7a3b1a", fontSize: "12px", fontStyle: "bold" });
    this.bodyText = scene.add.text(10, 24, "", {
      color: "#2a2018", fontSize: "12px", wordWrap: { width: boxW - 24 },
    });
    this.container = scene.add.container(178, H - 64, [bg, this.nameText, this.bodyText]);
    this.container.setDepth(200).setScrollFactor(0).setVisible(false);
  }

  get visible(): boolean {
    return this.container.visible;
  }

  start(script: DialogueScript, startId: string, onClose?: () => void): void {
    this.runner = new DialogueRunner(script);
    this.runner.start(startId);
    this.onCloseCb = onClose;
    this.container.setVisible(true);
    this.render();
  }

  /** Avanza (nodos sin opciones) o cierra al terminar. */
  advance(): void {
    if (!this.runner) return;
    if (this.runner.hasOptions()) return; // las opciones se eligen con selectOption
    this.runner.advance();
    if (this.runner.isFinished()) this.close();
    else this.render();
  }

  selectOption(index: number): void {
    if (!this.runner?.hasOptions()) return;
    this.runner.choose(index);
    if (this.runner.isFinished()) this.close();
    else this.render();
  }

  private render(): void {
    const node = this.runner!.current()!;
    this.nameText.setText(node.speaker);
    this.bodyText.setText(node.text);
    this.optionTexts.forEach((t) => t.destroy());
    this.optionTexts = [];
    if (node.options) {
      node.options.forEach((opt, i) => {
        const t = this.scene.add
          .text(20, 56 + i * 16, `▶ ${opt.text}`, { color: "#9fd3ff", fontSize: "12px" })
          .setInteractive({ useHandCursor: true });
        t.on("pointerdown", () => this.selectOption(i));
        this.container.add(t);
        this.optionTexts.push(t);
      });
    }
  }

  private close(): void {
    this.container.setVisible(false);
    this.optionTexts.forEach((t) => t.destroy());
    this.optionTexts = [];
    this.runner = undefined;
    this.onCloseCb?.();
  }
}

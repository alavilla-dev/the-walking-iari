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
    const bg = scene.add.rectangle(0, 0, W - 16, 90, 0x101018, 0.95).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0xffffff, 0.6);
    this.nameText = scene.add.text(10, 6, "", { color: "#ffd54a", fontSize: "13px" });
    this.bodyText = scene.add.text(10, 26, "", {
      color: "#ffffff", fontSize: "12px", wordWrap: { width: W - 40 },
    });
    this.container = scene.add.container(8, H - 98, [bg, this.nameText, this.bodyText]);
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

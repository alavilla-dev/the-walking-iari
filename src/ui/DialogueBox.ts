import Phaser from "phaser";
import { DialogueRunner } from "../systems/DialogueRunner";
import { crispText, logicalW, logicalH } from "./uikit";
import type { DialogueScript } from "../types";

export class DialogueBox {
  private container: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private runner?: DialogueRunner;
  private onCloseCb?: () => void;

  constructor(private scene: Phaser.Scene) {
    const W = logicalW(scene);
    const H = logicalH(scene);
    // Caja oscura a la derecha del panel de personaje (paleta del HUD).
    const boxW = W - 192;
    const boxH = 60;
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.38).fillRoundedRect(2, 3, boxW, boxH, 6);     // sombra
    bg.fillStyle(0x17130e, 0.92).fillRoundedRect(0, 0, boxW, boxH, 6);     // relleno
    bg.lineStyle(1, 0x6b4f2a, 1).strokeRoundedRect(0.5, 0.5, boxW - 1, boxH - 1, 6);
    bg.fillStyle(0xc9904a, 0.9).fillRect(10, 22, boxW - 20, 1);            // separador ámbar
    this.nameText = crispText(scene, 12, 7, "", { color: "#e8b45a", fontSize: "12px", fontStyle: "bold" });
    this.bodyText = crispText(scene, 12, 27, "", {
      color: "#efe6d4", fontSize: "12px", wordWrap: { width: boxW - 24 },
    });
    this.container = scene.add.container(184, H - 66, [bg, this.nameText, this.bodyText]);
    this.container.setDepth(200).setVisible(false);
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
        const t = crispText(this.scene, 22, 58 + i * 16, `▶ ${opt.text}`, { color: "#e8b45a", fontSize: "12px" })
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

import Phaser from "phaser";
import { SaveSystem } from "../systems/SaveSystem";
import { Sfx } from "../systems/Sfx";

interface MenuItem {
  label: string;
  action: () => void;
}

export class TitleScene extends Phaser.Scene {
  private items: MenuItem[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private selected = 0;

  constructor() {
    super("Title");
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Fondo oscuro (barras laterales) + arte de título (fit por altura).
    this.cameras.main.setBackgroundColor("#140f0a");
    const bg = this.add.image(W / 2, H / 2, "title_bg");
    const scale = H / bg.height;
    bg.setScale(scale);

    Sfx.get().startTitleDrone();

    // Panel del menú (cubre el menú "horneado" del arte, con botones interactivos).
    const px = 96, py = 196, pw = 196, ph = 150;
    const panel = this.add.graphics().setDepth(10);
    panel.fillStyle(0x000000, 0.82).fillRoundedRect(px, py, pw, ph, 6);
    panel.lineStyle(2, 0x7a2a1a, 0.9).strokeRoundedRect(px, py, pw, ph, 6);
    panel.lineStyle(1, 0xc24a2a, 0.5).strokeRoundedRect(px + 3, py + 3, pw - 6, ph - 6, 5);

    this.items = [
      { label: "NUEVA PARTIDA", action: () => this.newGame() },
      { label: "CARGAR PARTIDA", action: () => this.loadGame() },
      { label: "OPCIONES", action: () => this.flash("Opciones — próximamente") },
      { label: "SALIR", action: () => this.flash("¡Gracias por jugar! ❤") },
    ];

    this.cursor = this.add.text(px + 12, py + 18, "▸", {
      color: "#e8c060", fontSize: "16px", fontStyle: "bold",
    }).setDepth(12);

    this.items.forEach((it, i) => {
      const t = this.add.text(px + 30, py + 18 + i * 30, it.label, {
        color: "#e9ddc4", fontSize: "15px", fontStyle: "bold",
      }).setDepth(12).setInteractive({ useHandCursor: true });
      t.on("pointerover", () => this.select(i));
      t.on("pointerdown", () => { this.select(i); this.confirm(); });
      this.texts.push(t);
    });

    const kb = this.input.keyboard!;
    kb.on("keydown-UP", () => this.move(-1));
    kb.on("keydown-DOWN", () => this.move(1));
    kb.on("keydown-W", () => this.move(-1));
    kb.on("keydown-S", () => this.move(1));
    kb.on("keydown-ENTER", () => this.confirm());
    kb.on("keydown-SPACE", () => this.confirm());

    this.add.text(W / 2, H - 12, "© 2025 IARI GAMES", {
      color: "#8a7a60", fontSize: "9px",
    }).setOrigin(0.5, 1).setDepth(12);

    this.refresh();
  }

  private move(dir: number): void {
    this.selected = (this.selected + dir + this.items.length) % this.items.length;
    Sfx.get().blip();
    this.refresh();
  }

  private select(i: number): void {
    if (i === this.selected) return;
    this.selected = i;
    Sfx.get().blip();
    this.refresh();
  }

  private confirm(): void {
    Sfx.get().confirm();
    this.items[this.selected].action();
  }

  private refresh(): void {
    this.texts.forEach((t, i) => {
      t.setColor(i === this.selected ? "#ffffff" : "#b9a986");
    });
    const ty = (this.texts[this.selected]?.y ?? 0);
    this.cursor.setY(ty);
  }

  private newGame(): void {
    Sfx.get().stopTitleDrone();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop("Title");
      this.scene.start("Apartment");
    });
  }

  private loadGame(): void {
    if (!SaveSystem.load(1)) {
      this.flash("No hay partida guardada");
      return;
    }
    // Por ahora carga el depto; el estado se aplicará cuando integremos el flujo.
    this.newGame();
  }

  private flash(msg: string): void {
    const t = this.add.text(this.scale.width / 2, this.scale.height - 40, msg, {
      color: "#ffffff", fontSize: "12px", backgroundColor: "#000000c0",
    }).setOrigin(0.5).setPadding(6).setDepth(20);
    this.time.delayedCall(1500, () => t.destroy());
  }
}

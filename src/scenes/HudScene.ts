import Phaser from "phaser";
import { DialogueBox } from "../ui/DialogueBox";
import { InventoryPanel } from "../ui/InventoryPanel";
import { Sfx } from "../systems/Sfx";
import { crispText, logicalW, logicalH, crispUI } from "../ui/uikit";
import type { GameHost } from "./GameHost";

// Paleta oscura/cálida de The Walking Iari (madera, cobre, ámbar tenue).
const BG = 0x17130e;        // relleno de panel (madera muy oscura)
const BG_A = 0.88;
const EDGE = 0x6b4f2a;      // borde cobre apagado
const EDGE_HI = 0xc9904a;   // acento ámbar
const INK = "#efe6d4";      // texto principal (hueso cálido)
const INK_SOFT = "#9c8a70"; // texto secundario
const HILITE = "#e8b45a";   // hover ámbar

/** Panel oscuro redondeado con sombra, borde cobre y filo ámbar interior. */
function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, depth = 150): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  const r = 6;
  g.fillStyle(0x000000, 0.38).fillRoundedRect(x + 2, y + 3, w, h, r);     // sombra
  g.fillStyle(BG, BG_A).fillRoundedRect(x, y, w, h, r);                    // relleno
  g.lineStyle(1, EDGE, 1).strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
  g.lineStyle(1, EDGE_HI, 0.22).strokeRoundedRect(x + 2.5, y + 2.5, w - 5, h - 5, r - 2);
  return g;
}

export class HudScene extends Phaser.Scene {
  private host!: GameHost;
  private psBar!: Phaser.GameObjects.Graphics;
  private psText!: Phaser.GameObjects.Text;
  private lvlText!: Phaser.GameObjects.Text;
  private modal?: Phaser.GameObjects.Container;
  private weaponIcon?: Phaser.GameObjects.Image;
  private weaponName?: Phaser.GameObjects.Text;
  private weaponAmmo?: Phaser.GameObjects.Text;
  dialogue!: DialogueBox;
  inventoryPanel!: InventoryPanel;

  constructor() {
    super("Hud");
  }

  init(data: { host: GameHost }): void {
    this.host = data.host;
  }

  create(): void {
    crispUI(this);
    const W = logicalW(this);
    const H = logicalH(this);
    const info = this.host.hudInfo;

    // --- Caja de LUGAR (arriba-izq) ---
    panel(this, 6, 6, 176, 38);
    crispText(this, 16, 11, info.place.toUpperCase(), { color: INK, fontSize: "11px", fontStyle: "bold" }).setDepth(151);
    crispText(this, 16, 26, info.subtitle, { color: INK_SOFT, fontSize: "9px" }).setDepth(151);
    // Marquita de acento a la izquierda.
    this.add.graphics().setDepth(151).fillStyle(EDGE_HI, 0.9).fillRect(6, 12, 3, 26);

    // (El menú superior derecho se quitó; irá un hub de acciones más adelante.)

    // --- Panel de PERSONAJE (abajo-izq) ---
    this.buildCharacterPanel(H, info.name, info.gender);

    // --- Panel de ARMA (abajo-der), sólo en escenas con combate ---
    if (this.host.weaponInfo) this.buildWeaponPanel(W, H);

    this.host.events.on("hud-update", () => this.refresh());
    this.host.events.on("weapon-update", () => this.refreshWeapon());

    // UI overlays
    this.dialogue = new DialogueBox(this);
    this.inventoryPanel = new InventoryPanel(this, this.host.inventory, {
      onEquip: this.host.equipWeapon
        ? (id) => { this.host.equipWeapon!(id); this.refreshWeapon(); }
        : undefined,
      onUse: this.host.useItem ? (id) => this.host.useItem!(id) : undefined,
      equippedId: () => this.host.weaponInfo?.()?.id,
    });

    const kb = this.input.keyboard!;
    kb.addKey("ENTER").on("down", () => this.dialogue.advance());
    kb.addKey("I").on("down", () => this.toggleInventory());
    kb.addKey("J").on("down", () => this.openJournal());
    kb.addKey("O").on("down", () => this.openOptions());
    kb.addKey("ESC").on("down", () => this.closeModal());

    this.refresh();
    this.refreshWeapon();
  }

  // ---------- Panel de arma (abajo-der) ----------

  private buildWeaponPanel(W: number, H: number): void {
    const pw = 120, ph = 44, px = W - pw - 6, py = H - ph - 6;
    panel(this, px, py, pw, ph);
    crispText(this, px + 10, py + 6, "ARMA", { color: INK_SOFT, fontSize: "8px", fontStyle: "bold" }).setDepth(151);
    this.weaponIcon = this.add.image(px + 24, py + 26, "ic_pistol").setDepth(152);
    this.weaponName = crispText(this, px + 46, py + 13, "", { color: INK, fontSize: "11px", fontStyle: "bold" }).setDepth(152);
    this.weaponAmmo = crispText(this, px + 46, py + 27, "", { color: INK_SOFT, fontSize: "11px" }).setDepth(152);
  }

  private refreshWeapon(): void {
    if (!this.weaponName || !this.weaponAmmo || !this.weaponIcon) return;
    const w = this.host.weaponInfo?.();
    if (!w) return;
    this.weaponIcon.setTexture(w.icon);
    this.weaponName.setText(w.name);
    if (w.kind === "ranged") {
      this.weaponAmmo.setText(w.reloading ? "recargando…" : `${w.mag ?? 0} / ${w.reserve ?? 0}`);
      this.weaponAmmo.setColor(!w.reloading && w.mag === 0 ? "#d9543a" : INK_SOFT);
    } else {
      this.weaponAmmo.setText("c. a c.");
      this.weaponAmmo.setColor(INK_SOFT);
    }
  }

  // ---------- Panel de personaje ----------

  private buildCharacterPanel(H: number, name: string, gender: "F" | "M"): void {
    const px = 6, py = H - 62, pw = 176, ph = 56;
    panel(this, px, py, pw, ph);

    // Retrato enmarcado.
    const cx = px + 28, cy = py + ph / 2;
    const frame = this.add.graphics().setDepth(151);
    frame.fillStyle(0x000000, 0.5).fillRoundedRect(cx - 19, cy - 19, 38, 38, 5);
    const portrait = this.add.image(cx, cy, "portrait_iara").setDepth(152);
    const pw2 = portrait.width, ph2 = portrait.height;
    portrait.setScale(Math.min(34 / pw2, 34 / ph2));
    frame.lineStyle(1.5, EDGE_HI, 0.9).strokeRoundedRect(cx - 19, cy - 19, 38, 38, 5).setDepth(153);

    const tx = px + 54;
    const sym = gender === "F" ? "♀" : "♂";
    crispText(this, tx, py + 8, name.toUpperCase(), { color: INK, fontSize: "12px", fontStyle: "bold" }).setDepth(151);
    crispText(this, tx + name.length * 7 + 6, py + 9, sym, { color: HILITE, fontSize: "11px", fontStyle: "bold" }).setDepth(151);
    this.lvlText = crispText(this, px + pw - 34, py + 8, "Nv.1", { color: INK_SOFT, fontSize: "10px", fontStyle: "bold" }).setDepth(151);

    crispText(this, tx, py + 26, "PS", { color: INK_SOFT, fontSize: "9px", fontStyle: "bold" }).setDepth(151);
    this.psBar = this.add.graphics().setDepth(151);
    this.psText = crispText(this, px + pw - 12, py + 24, "20/20", { color: INK, fontSize: "9px" })
      .setOrigin(1, 0).setDepth(152);
  }

  // ---------- Acciones del menú (vía atajos de teclado / futuro hub) ----------

  private toggleInventory(): void {
    this.closeModal();
    this.inventoryPanel.toggle();
  }

  private openJournal(): void {
    if (this.swapModal("journal")) return;
    const info = this.host.hudInfo;
    const objective = info.objective ?? "Sin objetivos por ahora.";
    const notes = this.host.inventory
      .list()
      .filter((it) => it.def.type === "narrative")
      .map((it) => `• ${it.def.name}`);

    const body: { text: string; color?: string }[] = [
      { text: "OBJETIVO", color: HILITE },
      { text: objective, color: INK },
      { text: "", color: INK },
      { text: "PISTAS", color: HILITE },
      ...(notes.length
        ? notes.map((n) => ({ text: n, color: INK }))
        : [{ text: "(ninguna todavía)", color: INK_SOFT }]),
    ];
    this.buildModal("DIARIO", body, "journal");
  }

  private openOptions(): void {
    if (this.swapModal("options")) return;
    this.buildModal("OPCIONES", [], "options");
    const m = this.modal!;
    const cx = logicalW(this) / 2;
    const top = logicalH(this) / 2 - 34;

    const sound = crispText(this, cx, top, "", { color: INK, fontSize: "13px", fontStyle: "bold" })
      .setOrigin(0.5)
      .setDepth(252)
      .setInteractive({ useHandCursor: true });
    const paint = () => sound.setText(`Sonido:  ${Sfx.get().isMuted() ? "✕ OFF" : "♪ ON"}`);
    paint();
    sound.on("pointerover", () => sound.setColor(HILITE));
    sound.on("pointerout", () => sound.setColor(INK));
    sound.on("pointerdown", () => { Sfx.get().toggleMuted(); Sfx.get().blip(); paint(); });
    m.add(sound);
  }

  // ---------- Sistema de modales ----------

  /** Si ya hay un modal de `kind` abierto, lo cierra y devuelve true (toggle). */
  private swapModal(kind: string): boolean {
    if (this.modal?.getData("kind") === kind) { this.closeModal(); return true; }
    this.closeModal();
    if (this.inventoryPanel.visible) this.inventoryPanel.toggle();
    return false;
  }

  private buildModal(title: string, lines: { text: string; color?: string }[], kind: string): void {
    const W = logicalW(this), H = logicalH(this);
    const pw = 248, ph = 168;
    const px = (W - pw) / 2, py = (H - ph) / 2;

    const backdrop = this.add.rectangle(0, 0, W, H, 0x05040a, 0.55).setOrigin(0, 0).setInteractive();
    backdrop.on("pointerdown", () => this.closeModal());

    const box = panel(this, px, py, pw, ph, 251);
    // Cabecera con barrita de acento.
    box.fillStyle(EDGE_HI, 0.9).fillRect(px + 14, py + 30, pw - 28, 1);

    const titleText = crispText(this, px + pw / 2, py + 14, title, {
      color: HILITE, fontSize: "14px", fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(252);

    const bodyTexts = lines.map((ln, i) =>
      crispText(this, px + 18, py + 42 + i * 17, ln.text, {
        color: ln.color ?? INK, fontSize: "12px", wordWrap: { width: pw - 36 },
      }).setDepth(252),
    );

    const hint = crispText(this, px + pw / 2, py + ph - 16, "clic afuera  ·  ESC", {
      color: INK_SOFT, fontSize: "9px",
    }).setOrigin(0.5).setDepth(252);

    this.modal = this.add.container(0, 0, [backdrop, box, titleText, ...bodyTexts, hint]).setDepth(250);
    this.modal.setData("kind", kind);
  }

  private closeModal(): void {
    this.modal?.destroy(true);
    this.modal = undefined;
  }

  // ---------- PS / nivel ----------

  private refresh(): void {
    const psMax = this.host.progression.psMax();
    const ps = this.host.ps;
    this.lvlText.setText(`Nv.${this.host.progression.level}`);
    this.psText.setText(`${ps}/${psMax}`);

    const x = 70, y = logicalH(this) - 32, w = 96, h = 6;
    this.psBar.clear();
    this.psBar.fillStyle(0x000000, 0.6).fillRoundedRect(x - 1, y - 1, w + 2, h + 2, 2);
    this.psBar.fillStyle(0x2a2622, 1).fillRoundedRect(x, y, w, h, 2);
    const frac = psMax > 0 ? ps / psMax : 0;
    const color = frac > 0.5 ? 0x6fcf5c : frac > 0.2 ? 0xe8b45a : 0xd9543a;
    if (frac > 0) this.psBar.fillStyle(color, 1).fillRoundedRect(x, y, Math.max(2, w * frac), h, 2);
    this.psBar.lineStyle(1, EDGE, 0.8).strokeRoundedRect(x, y, w, h, 2);
  }
}

import Phaser from "phaser";
import { SAVE_VERSION } from "../config";
import { Player } from "../entities/Player";
import { ProgressionModel } from "../systems/ProgressionModel";
import { InventoryModel } from "../systems/InventoryModel";
import { SaveSystem } from "../systems/SaveSystem";
import { Sfx } from "../systems/Sfx";
import { Cutscene } from "../systems/Cutscene";
import { introCap1 } from "./cutscenes/introCap1";
import type { SaveState, DialogueScript } from "../types";
import type { HudInfo } from "./GameHost";
import type { HudScene } from "./HudScene";

// Render real del depto (recorte de ref-depto.jpg, sin HUD ni personaje pegados).
const BG_W = 1125;
const BG_H = 830;
const DEBUG_COLLIDERS = false;

interface Interactable { x: number; y: number; radius: number; run: () => void; }

export class ApartmentScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private interactables: Interactable[] = [];
  private cutscene = new Cutscene(this);
  private stepTimer = 0;
  private S = 1; private ox = 0; private oy = 0;
  private keys!: {
    up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key;
    sprint: Phaser.Input.Keyboard.Key;
  };

  progression = new ProgressionModel();
  inventory = new InventoryModel();
  ps = this.progression.psMax();

  constructor() { super("Apartment"); }

  get hudInfo(): HudInfo {
    return { name: "Iara", gender: "F", place: "Depto. Hogar", subtitle: "Morón — Buenos Aires" };
  }

  private cvt(ix: number, iy: number): { x: number; y: number } {
    return { x: ix * this.S + this.ox, y: iy * this.S + this.oy };
  }

  create(): void {
    this.interactables = [];
    this.cutscene = new Cutscene(this);
    this.scene.launch("Hud", { host: this });
    this.ps = this.progression.psMax();
    this.registerStateEvents();

    // Fondo real del depto, escalado para verse entero.
    const W = this.scale.width, H = this.scale.height;
    this.S = Math.min(W / BG_W, H / BG_H);
    this.ox = (W - BG_W * this.S) / 2;
    this.oy = (H - BG_H * this.S) / 2;
    this.cameras.main.setBackgroundColor("#0b0a0d");
    this.add.image(this.ox, this.oy, "apartment_bg").setOrigin(0, 0).setScale(this.S).setDepth(-100);

    this.physics.world.setBounds(this.ox, this.oy, BG_W * this.S, BG_H * this.S);
    this.walls = this.physics.add.staticGroup();
    this.buildColliders();

    const start = this.cvt(575, 470);
    this.player = new Player(this, start.x, start.y);
    this.player.setScale(1.35);
    this.player.setDepth(10);
    this.physics.add.collider(this.player, this.walls);

    this.inventory.add("photo_pareja", 1);
    this.inventory.add("llave_depto", 1);

    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey("W"), down: kb.addKey("S"),
      left: kb.addKey("A"), right: kb.addKey("D"),
      sprint: kb.addKey("SHIFT"),
    };
    kb.addKey("E").on("down", () => this.tryInteract());
    kb.addKey("SPACE").on("down", () => this.tryInteract());
    kb.addKey("ESC").on("down", () => this.cutscene.skip());
    Sfx.get().unlock();

    this.buildInteractions();

    const skipIntro = typeof window !== "undefined" && window.location.hash === "#apt";
    if (skipIntro) this.controlHint();
    else this.startIntro();
  }

  // ---------- Colisiones (coords del arte 1125x830) ----------

  private wall(ix: number, iy: number, iw: number, ih: number): void {
    const x = ix * this.S + this.ox, y = iy * this.S + this.oy;
    const w = iw * this.S, h = ih * this.S;
    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0);
    this.physics.add.existing(zone, true);
    this.walls.add(zone);
    if (DEBUG_COLLIDERS) this.add.rectangle(x, y, w, h, 0xff0000, 0.35).setOrigin(0, 0).setDepth(500);
  }

  private buildColliders(): void {
    // Perímetro de las habitaciones.
    this.wall(20, 25, 1085, 16);
    this.wall(20, 795, 1085, 24);
    this.wall(20, 25, 16, 790);
    this.wall(1088, 25, 16, 790);
    // Tabique izq-rooms | hall (puertas: baño ~y195, dormitorio ~y390).
    this.wall(312, 30, 16, 160); this.wall(312, 250, 16, 115); this.wall(312, 425, 16, 45);
    // Tabique hall | derecha (puerta cocina ~y390; balcón abierto arriba).
    this.wall(636, 30, 16, 335); this.wall(636, 430, 16, 40);
    // Baño | dormitorio.
    this.wall(20, 240, 292, 16);
    // Balcón | cocina.
    this.wall(640, 120, 450, 16);
    // Habitaciones de arriba | living (hueco central del hall, x320-640).
    this.wall(20, 463, 300, 16); this.wall(640, 463, 450, 16);
    // Muebles sólidos.
    this.wall(40, 45, 270, 90);     // bañera
    this.wall(40, 290, 280, 165);   // cama
    this.wall(650, 135, 445, 95);   // mesada cocina (arriba)
    this.wall(1000, 135, 90, 220);  // mesada cocina (derecha)
    this.wall(50, 580, 275, 200);   // mesa comedor
    this.wall(535, 545, 225, 165);  // sofá
    this.wall(815, 605, 275, 150);  // mueble TV
  }

  // ---------- Interacciones ----------

  private buildInteractions(): void {
    const add = (ix: number, iy: number, run: () => void) => {
      const p = this.cvt(ix, iy);
      this.interactables.push({ x: p.x, y: p.y, radius: 46, run });
    };
    add(185, 370, () => this.say("Iara", "La cama. Ale me pidió que descanse... como si pudiera."));
    add(660, 620, () => this.say("Marfil", "Mrrrau. (Marfil ronronea en el sillón.)"));
    add(950, 660, () => this.say("Iara", "La tele pasa las noticias. Algo raro en el centro de la ciudad."));
    add(850, 190, () => this.say("Iara", "La heladera llena. Ale hizo las compras antes de salir."));
    add(180, 690, () => this.say("Iara", "Flores frescas en la mesa. Un detalle de él."));
    add(575, 800, () => this.say("Iara", "La puerta. Todavía es de noche... mejor esperar a que vuelva Ale."));
  }

  private tryInteract(): void {
    const hud = this.scene.get("Hud") as HudScene;
    if (hud.dialogue.visible) { hud.dialogue.advance(); return; }
    if (this.cutscene.active) return;
    let best: Interactable | null = null; let bestD = Infinity;
    for (const it of this.interactables) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, it.x, it.y);
      if (d <= it.radius && d < bestD) { best = it; bestD = d; }
    }
    best?.run();
  }

  private say(speaker: string, text: string): void {
    const hud = this.scene.get("Hud") as HudScene;
    const script: DialogueScript = { n: { id: "n", speaker, text, next: null } };
    if (!hud.dialogue.visible) hud.dialogue.start(script, "n");
  }

  // ---------- Intro ----------

  private controlHint(): void {
    this.add.text(this.scale.width / 2, this.scale.height - 14, "WASD/flechas: mover · E: interactuar", {
      color: "#ffffff", fontSize: "10px", backgroundColor: "#00000070",
    }).setOrigin(0.5, 1).setPadding(3).setScrollFactor(0).setDepth(140);
  }

  private async startIntro(): Promise<void> {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.player.setVelocity(0, 0);
    const hint = this.add.text(this.scale.width / 2, 8, "ESC: saltear escena", {
      color: "#ffffff", fontSize: "10px", backgroundColor: "#00000080",
    }).setOrigin(0.5, 0).setPadding(3).setScrollFactor(0).setDepth(160);

    const tv = this.cvt(700, 560);
    const center = this.cvt(575, 470);
    await this.cutscene.play(introCap1(this.player, tv, center));

    hint.destroy();
    body.enable = true;
    body.reset(this.player.x, this.player.y);
    this.controlHint();
  }

  update(): void {
    if (this.cutscene.active) return;
    const cursors = this.input.keyboard!.createCursorKeys();
    this.player.handleInput({
      up: this.keys.up.isDown || cursors.up.isDown,
      down: this.keys.down.isDown || cursors.down.isDown,
      left: this.keys.left.isDown || cursors.left.isDown,
      right: this.keys.right.isDown || cursors.right.isDown,
      sprint: this.keys.sprint.isDown,
    });
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.length() > 12) {
      this.stepTimer -= this.game.loop.delta;
      if (this.stepTimer <= 0) { Sfx.get().footstep(); this.stepTimer = this.keys.sprint.isDown ? 220 : 320; }
    } else { this.stepTimer = 0; }
  }

  // ---------- Estado ----------

  private registerStateEvents(): void {
    this.events.on("xp-gained", (amount: number) => {
      this.progression.addXp(amount);
      this.ps = Math.min(this.ps, this.progression.psMax());
      this.events.emit("hud-update");
    });
  }

  saveGame(slot = 1): void {
    const state: SaveState = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      player: { x: this.player.x, y: this.player.y, ps: this.ps },
      progression: this.progression.toState(),
      inventory: this.inventory.toState(),
      flags: {},
    };
    SaveSystem.save(slot, state);
  }
}

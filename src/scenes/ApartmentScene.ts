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

// Tamaño del fondo real del depto (recorte de ref-depto.jpg).
const BG_W = 1125;
const BG_H = 830;
// Poner en true para ver las cajas de colisión (rojo) sobre el arte.
const DEBUG_COLLIDERS = false;

interface Interactable {
  x: number; y: number; radius: number; run: () => void;
}

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

  constructor() {
    super("Apartment");
  }

  get hudInfo(): HudInfo {
    return { name: "Iara", gender: "F", place: "Depto. Hogar", subtitle: "Morón — Buenos Aires" };
  }

  create(): void {
    this.interactables = [];
    this.cutscene = new Cutscene(this);
    this.scene.launch("Hud", { host: this });
    this.ps = this.progression.psMax();
    this.registerStateEvents();

    // Fondo real del departamento, escalado para verse entero (contain).
    const W = this.scale.width, H = this.scale.height;
    this.S = Math.min(W / BG_W, H / BG_H);
    this.ox = (W - BG_W * this.S) / 2;
    this.oy = (H - BG_H * this.S) / 2;
    this.cameras.main.setBackgroundColor("#0b0a0d");
    this.add.image(this.ox, this.oy, "apartment_bg").setOrigin(0, 0).setScale(this.S).setDepth(-100);

    this.physics.world.setBounds(this.ox, this.oy, BG_W * this.S, BG_H * this.S);
    this.walls = this.physics.add.staticGroup();
    this.buildColliders();

    // Iara arranca en el hall (donde estaba el personaje del arte).
    const start = this.cvt(575, 455);
    this.player = new Player(this, start.x, start.y);
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

    // Intro cinematográfica del Cap. 1 (salteable con ESC).
    this.startIntro();
  }

  private async startIntro(): Promise<void> {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.player.setVelocity(0, 0);

    const hint = this.add.text(this.scale.width / 2, 8, "ESC: saltear escena", {
      color: "#ffffff", fontSize: "10px", backgroundColor: "#00000080",
    }).setOrigin(0.5, 0).setPadding(3).setScrollFactor(0).setDepth(160);

    const tv = this.cvt(720, 560);
    const center = this.cvt(575, 455);
    await this.cutscene.play(introCap1(this.player, tv, center));

    hint.destroy();
    body.enable = true;
    body.reset(this.player.x, this.player.y);

    // Pista de control al recuperar el mando.
    this.add.text(this.scale.width / 2, this.scale.height - 14, "WASD/flechas: mover · E: interactuar", {
      color: "#ffffff", fontSize: "10px", backgroundColor: "#00000070",
    }).setOrigin(0.5, 1).setPadding(3).setScrollFactor(0).setDepth(140);
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
      if (this.stepTimer <= 0) {
        Sfx.get().footstep();
        this.stepTimer = this.keys.sprint.isDown ? 220 : 320;
      }
    } else {
      this.stepTimer = 0;
    }
  }

  // ---------- Colisiones (en coords del arte 1125x830) ----------

  private cvt(ix: number, iy: number): { x: number; y: number } {
    return { x: ix * this.S + this.ox, y: iy * this.S + this.oy };
  }

  /** Agrega una caja de colisión estática a partir de coords del arte. */
  private wall(ix: number, iy: number, iw: number, ih: number): void {
    const x = ix * this.S + this.ox, y = iy * this.S + this.oy;
    const w = iw * this.S, h = ih * this.S;
    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0);
    this.physics.add.existing(zone, true);
    this.walls.add(zone);
    if (DEBUG_COLLIDERS) {
      this.add.rectangle(x, y, w, h, 0xff0000, 0.35).setOrigin(0, 0).setDepth(500);
    }
  }

  private buildColliders(): void {
    // Perímetro
    this.wall(20, 25, 1085, 16);    // arriba
    this.wall(20, 795, 1085, 22);   // abajo
    this.wall(20, 25, 16, 790);     // izquierda
    this.wall(1090, 25, 16, 790);   // derecha

    // Tabiques internos (con huecos de puerta)
    this.wall(322, 40, 14, 175);    // izq-rooms | hall (arriba)
    this.wall(322, 300, 14, 185);   // izq-rooms | hall (abajo) — hueco en el medio
    this.wall(642, 40, 14, 160);    // hall | derecha (arriba)
    this.wall(642, 280, 14, 205);   // hall | derecha (abajo) — hueco
    this.wall(36, 470, 250, 14);    // upper | living (izq)
    this.wall(360, 470, 110, 14);   // upper | living (centro-izq)
    this.wall(700, 470, 390, 14);   // upper | living (der) — hueco central para pasar

    // Muebles sólidos
    this.wall(40, 50, 280, 95);     // bañera + zona baño
    this.wall(45, 285, 290, 175);   // cama
    this.wall(650, 95, 100, 150);   // heladera
    this.wall(650, 150, 445, 85);   // mesada + cocina (arriba)
    this.wall(1010, 150, 85, 200);  // mesada (derecha)
    this.wall(55, 595, 265, 190);   // mesa de comedor
    this.wall(540, 545, 215, 165);  // sofá
    this.wall(815, 600, 280, 150);  // mueble + TV
  }

  // ---------- Interacciones ----------

  private buildInteractions(): void {
    const add = (ix: number, iy: number, run: () => void) => {
      const p = this.cvt(ix, iy);
      this.interactables.push({ x: p.x, y: p.y, radius: 46, run });
    };
    add(190, 370, () => this.say("Iara", "La cama tendida. Ale me pidió que descanse... como si pudiera."));
    add(660, 620, () => this.say("Marfil", "Mrrrau. (Marfil ronronea en el sillón.)"));
    add(950, 650, () => this.say("Iara", "La tele pasa las noticias. Algo raro en el centro de la ciudad."));
    add(850, 200, () => this.say("Iara", "La heladera llena. Ale hizo las compras antes de salir."));
    add(180, 690, () => this.say("Iara", "Flores frescas en la mesa. Un detalle de él."));
    add(575, 790, () => this.say("Iara", "La puerta. Todavía es de noche... mejor esperar a que vuelva Ale."));
  }

  private tryInteract(): void {
    const hud = this.scene.get("Hud") as HudScene;
    if (hud.dialogue.visible) { hud.dialogue.advance(); return; }
    if (this.cutscene.active) return;
    let best: Interactable | null = null;
    let bestD = Infinity;
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

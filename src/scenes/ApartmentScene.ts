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

// Grilla del depto: tiles LimeZu 16px renderizados a 32px (2x).
const TILE = 32;
const MAP_W = 20;
const MAP_H = 15;
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

  // Centro de una celda en píxeles.
  private cx(col: number): number { return col * TILE + TILE / 2; }
  private cy(row: number): number { return row * TILE + TILE / 2; }

  create(): void {
    this.interactables = [];
    this.cutscene = new Cutscene(this);
    this.scene.launch("Hud", { host: this });
    this.ps = this.progression.psMax();
    this.registerStateEvents();

    this.cameras.main.setBackgroundColor("#0b0a0d");
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

    this.buildFloors();
    this.walls = this.physics.add.staticGroup();
    this.buildWalls();
    this.buildFurniture();

    // Iara arranca en el hall.
    this.player = new Player(this, this.cx(9), this.cy(7));
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

    // En #apt (atajo de dev) se saltea la intro para ver/jugar directo.
    const skipIntro = typeof window !== "undefined" && window.location.hash === "#apt";
    if (skipIntro) {
      this.add.text(this.scale.width / 2, this.scale.height - 14, "WASD/flechas: mover · E: interactuar", {
        color: "#ffffff", fontSize: "10px", backgroundColor: "#00000070",
      }).setOrigin(0.5, 1).setPadding(3).setScrollFactor(0).setDepth(140);
    } else {
      this.startIntro();
    }
  }

  // ---------- Pisos (tileset LimeZu) ----------

  private buildFloors(): void {
    // Piso claro (baldosa) en TODO el depto — como la referencia / depto real (blanco).
    this.add.tileSprite(0, 0, MAP_W * TILE, MAP_H * TILE, "floor_tile")
      .setOrigin(0, 0).setTileScale(2, 2).setDepth(-100);
  }

  // ---------- Paredes ----------

  private wall(col: number, row: number, wCols = 1, hRows = 1): void {
    const x = col * TILE, y = row * TILE, w = wCols * TILE, h = hRows * TILE;
    // Visual de pared (tan con remate oscuro arriba, para que se lea como pared).
    this.add.rectangle(x, y, w, h, 0xc2ad84).setOrigin(0, 0).setDepth(-50);
    this.add.rectangle(x, y, w, 6, 0x8a7350).setOrigin(0, 0).setDepth(-50);
    this.add.rectangle(x, y, w, 2, 0x2e2418).setOrigin(0, 0).setDepth(-50);
    // Colisión.
    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0);
    this.physics.add.existing(zone, true);
    this.walls.add(zone);
    if (DEBUG_COLLIDERS) this.add.rectangle(x, y, w, h, 0xff0000, 0.3).setOrigin(0, 0).setDepth(500);
  }

  private buildWalls(): void {
    // Perímetro (hueco de puerta abajo-centro en cols 9-10).
    this.wall(0, 0, MAP_W, 1);
    this.wall(0, MAP_H - 1, 9, 1);
    this.wall(11, MAP_H - 1, 9, 1);
    this.wall(0, 1, 1, MAP_H - 1);
    this.wall(MAP_W - 1, 1, 1, MAP_H - 1);
    // Tabiques verticales (izq-rooms | hall | der-rooms) con puertas en filas 6-7.
    this.wall(6, 1, 1, 5); this.wall(6, 8, 1, 2);
    this.wall(12, 1, 1, 5); this.wall(12, 8, 1, 2);
    // Baño | dormitorio (fila 5, hueco col 3).
    this.wall(1, 5, 2, 1); this.wall(4, 5, 2, 1);
    // Balcón | cocina (fila 5, hueco col 15).
    this.wall(13, 5, 2, 1); this.wall(16, 5, 3, 1);
    // Habitaciones de arriba | living (fila 9; huecos col 3, cols 9-10, col 16).
    this.wall(1, 9, 2, 1); this.wall(4, 9, 5, 1); this.wall(11, 9, 5, 1); this.wall(17, 9, 2, 1);
  }

  // ---------- Muebles ----------

  /** Coloca un mueble (escala 2x). Devuelve la imagen. */
  private furn(key: string, col: number, row: number, solid = false): Phaser.GameObjects.Image {
    const x = col * TILE, y = row * TILE;
    const img = this.add.image(x, y, key).setOrigin(0, 0).setScale(2);
    img.setDepth(y + img.displayHeight - 8);
    if (solid) {
      const m = 6;
      const zx = x + m, zy = y + img.displayHeight * 0.35;
      const zw = img.displayWidth - m * 2, zh = img.displayHeight * 0.6;
      const zone = this.add.zone(zx, zy, zw, zh).setOrigin(0, 0);
      this.physics.add.existing(zone, true);
      this.walls.add(zone);
      if (DEBUG_COLLIDERS) this.add.rectangle(zx, zy, zw, zh, 0x00ff00, 0.3).setOrigin(0, 0).setDepth(500);
    }
    return img;
  }

  private buildFurniture(): void {
    // --- BAÑO (cols 1-5, filas 1-4) ---
    this.furn("f_nightstand", 1.3, 1.4, true);   // lavatorio (aprox.)
    this.furn("f_plant2", 4, 1.2);

    // --- DORMITORIO (cols 1-5, filas 6-9) ---
    this.furn("f_bed", 1.8, 5.7, true);
    this.furn("f_nightstand", 4.2, 5.8, true);
    this.furn("f_plant", 1, 7.6);

    // --- BALCÓN (cols 13-18, filas 1-4) ---
    this.furn("f_window", 14, 0.7);
    this.furn("f_plant", 17, 2);

    // --- COCINA (cols 13-18, filas 5-9) ---
    this.furn("f_counter", 13, 5.4, true);
    this.furn("f_plant2", 18, 8);

    // --- LIVING / COMEDOR (filas 10-13) ---
    // Comedor (izq)
    this.furn("f_rug", 1.8, 10.2);
    this.furn("f_table", 1.6, 10.3, true);
    this.furn("f_chair", 1, 10.2);
    this.furn("f_chair", 4.1, 10.2);
    this.furn("f_chair", 1, 12);
    this.furn("f_chair", 4.1, 12);
    // Estar (der)
    this.furn("f_sofa", 12.5, 10.6, true);
    this.furn("f_sofa", 12.5, 11.6, true);
    this.add.image(15 * TILE, 12 * TILE, "cat").setOrigin(0, 0).setScale(1.5).setDepth(12 * TILE + 40); // Marfil
    this.furn("f_tv", 16.8, 10.8, true);
    this.furn("f_plant", 11, 10);
    this.furn("f_plant", 18, 10);
    // Entrada
    this.furn("f_door", 9.3, 13.2);
  }

  // ---------- Interacciones ----------

  private buildInteractions(): void {
    const add = (col: number, row: number, run: () => void) => {
      this.interactables.push({ x: col * TILE, y: row * TILE, radius: 52, run });
    };
    add(3, 7, () => this.say("Iara", "La cama. Ale me pidió que descanse... como si pudiera."));
    add(15, 13, () => this.say("Marfil", "Mrrrau. (Marfil ronronea en el sillón.)"));
    add(17, 12, () => this.say("Iara", "La tele pasa las noticias. Algo raro en el centro de la ciudad."));
    add(15, 7, () => this.say("Iara", "La heladera llena. Ale hizo las compras antes de salir."));
    add(3, 11, () => this.say("Iara", "Flores frescas en la mesa. Un detalle de él."));
    add(10, 13, () => this.say("Iara", "La puerta. Todavía es de noche... mejor esperar a que vuelva Ale."));
  }

  private say(speaker: string, text: string): void {
    const hud = this.scene.get("Hud") as HudScene;
    const script: DialogueScript = { n: { id: "n", speaker, text, next: null } };
    if (!hud.dialogue.visible) hud.dialogue.start(script, "n");
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

  // ---------- Intro ----------

  private async startIntro(): Promise<void> {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.player.setVelocity(0, 0);
    const hint = this.add.text(this.scale.width / 2, 8, "ESC: saltear escena", {
      color: "#ffffff", fontSize: "10px", backgroundColor: "#00000080",
    }).setOrigin(0.5, 0).setPadding(3).setScrollFactor(0).setDepth(160);

    const tv = { x: this.cx(14), y: this.cy(12) };
    const center = { x: this.cx(9), y: this.cy(7) };
    await this.cutscene.play(introCap1(this.player, tv, center));

    hint.destroy();
    body.enable = true;
    body.reset(this.player.x, this.player.y);
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

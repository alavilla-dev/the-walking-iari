import Phaser from "phaser";
import { SAVE_VERSION } from "../config";
import { Player } from "../entities/Player";
import { ProgressionModel } from "../systems/ProgressionModel";
import { InventoryModel } from "../systems/InventoryModel";
import { SaveSystem } from "../systems/SaveSystem";
import { Sfx } from "../systems/Sfx";
import { Cutscene } from "../systems/Cutscene";
import { introCap1 } from "./cutscenes/introCap1";
import type { SaveState } from "../types";
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
    this.buildColliders();

    // Iara arranca en el hall.
    this.player = new Player(this, this.cx(10), this.cy(9));
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
    // Madera en todo el interior.
    this.add.tileSprite(0, 0, MAP_W * TILE, MAP_H * TILE, "floor_wood")
      .setOrigin(0, 0).setTileScale(2, 2).setDepth(-100);
    // Baldosa en baño (cols 1-5, filas 1-3) y cocina (cols 13-18, filas 5-8).
    this.tileFloor(1, 1, 5, 3);
    this.tileFloor(13, 5, 6, 4);
  }

  private tileFloor(col: number, row: number, wCols: number, hRows: number): void {
    this.add.tileSprite(col * TILE, row * TILE, wCols * TILE, hRows * TILE, "floor_tile")
      .setOrigin(0, 0).setTileScale(2, 2).setDepth(-99);
  }

  // ---------- Colisiones (por ahora solo límites; paredes/muebles en próximos pasos) ----------

  private wall(col: number, row: number, wCols = 1, hRows = 1): void {
    const x = col * TILE, y = row * TILE, w = wCols * TILE, h = hRows * TILE;
    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0);
    this.physics.add.existing(zone, true);
    this.walls.add(zone);
    if (DEBUG_COLLIDERS) this.add.rectangle(x, y, w, h, 0xff0000, 0.35).setOrigin(0, 0).setDepth(500);
  }

  private buildColliders(): void {
    // Paso 2 (próximo): paredes y división de ambientes. Por ahora, solo borde.
    this.wall(0, 0, MAP_W, 1);
    this.wall(0, MAP_H - 1, MAP_W, 1);
    this.wall(0, 0, 1, MAP_H);
    this.wall(MAP_W - 1, 0, 1, MAP_H);
  }

  // ---------- Interacciones ----------

  private buildInteractions(): void {
    // Se completan al colocar los muebles (Paso 3).
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

    const tv = { x: this.cx(15), y: this.cy(11) };
    const center = { x: this.cx(10), y: this.cy(9) };
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

import Phaser from "phaser";
import { TILE, SAVE_VERSION } from "../config";
import { Player } from "../entities/Player";
import { ProgressionModel } from "../systems/ProgressionModel";
import { InventoryModel } from "../systems/InventoryModel";
import { SaveSystem } from "../systems/SaveSystem";
import { Sfx } from "../systems/Sfx";
import type { SaveState, DialogueScript } from "../types";
import type { HudInfo } from "./GameHost";
import type { HudScene } from "./HudScene";

const MAP_W = 20;
const MAP_H = 15;
const cx = (col: number) => col * TILE + TILE / 2;
const cy = (row: number) => row * TILE + TILE / 2;

interface Interactable {
  x: number;
  y: number;
  radius: number;
  run: () => void;
}

export class ApartmentScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private interactables: Interactable[] = [];
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

  create(): void {
    this.interactables = [];
    this.scene.launch("Hud", { host: this });
    this.ps = this.progression.psMax();
    this.registerStateEvents();
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

    this.buildFloors();
    this.walls = this.physics.add.staticGroup();
    this.solids = this.physics.add.staticGroup();
    this.buildWalls();
    this.buildFurniture();

    // Iara arranca en el centro del hall, mirando hacia abajo.
    this.player = new Player(this, cx(9), cy(7));
    this.player.setDepth(this.player.y);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.solids);

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
    Sfx.get().unlock();

    // Pista de ayuda (arriba-centro, entre la caja de lugar y el menú)
    this.add.text(MAP_W * TILE / 2, 10, "WASD/flechas: mover · E: interactuar", {
      color: "#ffffff", fontSize: "10px", backgroundColor: "#00000070",
    }).setOrigin(0.5, 0).setPadding(3).setScrollFactor(0).setDepth(140);

    // Línea ambiente al entrar (como la referencia: "Un hogar dulce hogar.")
    this.time.delayedCall(400, () => this.say("Iara", "Un hogar dulce hogar."));
  }

  update(): void {
    const cursors = this.input.keyboard!.createCursorKeys();
    this.player.handleInput({
      up: this.keys.up.isDown || cursors.up.isDown,
      down: this.keys.down.isDown || cursors.down.isDown,
      left: this.keys.left.isDown || cursors.left.isDown,
      right: this.keys.right.isDown || cursors.right.isDown,
      sprint: this.keys.sprint.isDown,
    });
    this.player.setDepth(this.player.y);

    // Pasos: suenan a intervalos mientras Iara se mueve.
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const moving = body.velocity.length() > 12;
    if (moving) {
      this.stepTimer -= this.game.loop.delta;
      if (this.stepTimer <= 0) {
        Sfx.get().footstep();
        this.stepTimer = this.keys.sprint.isDown ? 220 : 320;
      }
    } else {
      this.stepTimer = 0;
    }
  }

  // ---------- Construcción del mapa ----------

  private buildFloors(): void {
    for (let r = 1; r < MAP_H - 1; r++) {
      for (let c = 1; c < MAP_W - 1; c++) {
        this.add.image(cx(c), cy(r), "floor_wood").setDepth(-10);
      }
    }
    // Baldosa: baño (sup-izq) y cocina (centro-der)
    this.fillTile(1, 1, 5, 3);
    this.fillTile(13, 5, 18, 8);
  }

  private fillTile(c0: number, r0: number, c1: number, r1: number): void {
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        this.add.image(cx(c), cy(r), "floor_tile").setDepth(-9);
  }

  private wallAt(col: number, row: number): void {
    const w = this.walls.create(cx(col), cy(row), "wall_int") as Phaser.Physics.Arcade.Sprite;
    w.setDepth(row * TILE);
  }

  private buildWalls(): void {
    const gap = (set: number[], v: number) => set.includes(v);

    // Perímetro
    for (let c = 0; c < MAP_W; c++) {
      this.wallAt(c, 0);
      if (!gap([9, 10], c)) this.wallAt(c, MAP_H - 1); // puerta de entrada abajo-centro
    }
    for (let r = 1; r < MAP_H - 1; r++) {
      this.wallAt(0, r);
      this.wallAt(MAP_W - 1, r);
    }

    // Tabique horizontal entre habitaciones de arriba y el living (row 9)
    for (let c = 1; c <= 18; c++) if (!gap([4, 9, 10, 15], c)) this.wallAt(c, 9);

    // Tabiques verticales del piso de arriba
    for (let r = 1; r <= 8; r++) if (!gap([2, 6], r)) this.wallAt(6, r);   // izq rooms | hall
    for (let r = 1; r <= 8; r++) if (!gap([2, 6], r)) this.wallAt(12, r);  // hall | cocina/balcón

    // Tabiques horizontales del piso de arriba (baño|dorm y balcón|cocina, row 4)
    for (let c = 1; c <= 5; c++) if (!gap([3], c)) this.wallAt(c, 4);
    for (let c = 13; c <= 18; c++) if (!gap([15], c)) this.wallAt(c, 4);
  }

  // ---------- Mobiliario ----------

  private decor(key: string, x: number, y: number): Phaser.GameObjects.Image {
    return this.add.image(x, y, key).setDepth(y);
  }

  private solid(key: string, x: number, y: number, bw?: number, bh?: number): void {
    const s = this.solids.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    s.setDepth(y);
    if (bw && bh) {
      (s.body as Phaser.Physics.Arcade.StaticBody).setSize(bw, bh);
    }
  }

  private buildFurniture(): void {
    // --- BAÑO (cols 1-5, rows 1-3) ---
    this.solid("bathtub", cx(2) + 4, cy(1) + 4, 70, 34);
    this.decor("toilet", cx(4) + 6, cy(1) + 6);
    this.decor("bath_sink", cx(2), cy(3) + 2);

    // --- DORMITORIO (cols 1-6, rows 5-8) ---
    this.add.image(cx(3), cy(7) + 8, "rug").setDepth(-8); // alfombra a nivel de piso
    this.solid("bed", cx(3), cy(6), 60, 80);
    this.decor("nightstand", cx(1) + 4, cy(5) + 6);
    this.decor("nightstand", cx(4) + 6, cy(5) + 6);
    this.decor("moon", cx(4), cy(5) - 6);

    // --- HALL (cols 7-11, rows 1-8) ---
    this.decor("frame", cx(9), cy(1) - 8);
    this.decor("lamp", cx(8), cy(2));
    this.decor("plant", cx(10) + 6, cy(2));

    // --- BALCÓN/ESTUDIO (cols 13-18, rows 1-3) ---
    this.decor("window", cx(15), cy(0) + 4);
    this.decor("plant", cx(17), cy(2));

    // --- COCINA (cols 13-18, rows 5-8) ---
    this.solid("fridge", cx(13), cy(5) + 8, 30, 48);
    this.solid("counter", cx(14), cy(5));
    this.solid("counter_sink", cx(15), cy(5));
    this.solid("stove", cx(16), cy(5) + 2, 30, 40);
    this.solid("counter", cx(17), cy(5));
    for (let r = 6; r <= 8; r++) this.solid("counter", cx(18), cy(r));

    // --- LIVING / COMEDOR (cols 1-18, rows 10-13) ---
    // Comedor (izq)
    this.solid("dining_table", cx(3), cy(11) + 8, 64, 92);
    this.decor("chair", cx(2) - 4, cy(11));
    this.decor("chair", cx(4) + 4, cy(11));
    this.decor("chair", cx(2) - 4, cy(12) + 6);
    this.decor("chair", cx(4) + 4, cy(12) + 6);
    this.decor("vase", cx(3), cy(11));

    // Estar (der)
    this.solid("sofa", cx(13), cy(11), 100, 44);
    this.decor("ottoman", cx(13), cy(12) + 8);
    this.decor("cat", cx(14) + 6, cy(12) + 6);   // Marfil
    this.solid("tv_console", cx(17), cy(13) + 2, 100, 26);
    this.decor("tv", cx(17), cy(12) + 8);

    // Plantas y cuadros
    this.decor("plant", cx(1) + 4, cy(10));
    this.decor("plant", cx(18) - 4, cy(10));
    this.decor("frame", cx(6), cy(13) + 18);
    this.decor("frame", cx(8), cy(13) + 18);

    // Entrada
    this.decor("door", cx(9) + TILE / 2, cy(14) - 2);
    this.decor("doormat", cx(9) + TILE / 2, cy(13) + 6);

    this.buildInteractions();
  }

  private buildInteractions(): void {
    this.addInteraction(cx(2) + 2, cy(6) + 8, () =>
      this.say("Iara", "La cama tendida. Ale me pidió que descanse... como si pudiera."));
    this.addInteraction(cx(14) + 6, cy(12) + 6, () =>
      this.say("Marfil", "Mrrrau. (Marfil se estira en el sillón.)"));
    this.addInteraction(cx(17), cy(12) + 8, () =>
      this.say("Iara", "La tele pasa las noticias. Algo raro en el centro de la ciudad."));
    this.addInteraction(cx(15), cy(5) + 8, () =>
      this.say("Iara", "La heladera llena. Ale hizo las compras antes de salir."));
    this.addInteraction(cx(3), cy(11), () =>
      this.say("Iara", "Flores frescas en la mesa. Un detalle de él."));
    this.addInteraction(cx(9) + TILE / 2, cy(13) + 6, () =>
      this.say("Iara", "La puerta. Todavía es de noche... mejor esperar a que vuelva Ale."));
  }

  private addInteraction(x: number, y: number, run: () => void): void {
    this.interactables.push({ x, y, radius: 44, run });
  }

  private tryInteract(): void {
    const hud = this.scene.get("Hud") as HudScene;
    if (hud.dialogue.visible) { hud.dialogue.advance(); return; }
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

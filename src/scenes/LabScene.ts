import Phaser from "phaser";
import { TILE, ZOMBIE_XP_REWARD, SAVE_VERSION } from "../config";
import { Player } from "../entities/Player";
import { Zombie } from "../entities/Zombie";
import { ProgressionModel } from "../systems/ProgressionModel";
import { InventoryModel } from "../systems/InventoryModel";
import { SaveSystem } from "../systems/SaveSystem";
import { sampleDialogue } from "../data/sampleDialogue";
import type { SaveState } from "../types";
import type { HudInfo } from "./GameHost";
import type { HudScene } from "./HudScene";

const MAP_W = 20;
const MAP_H = 15;

export class LabScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private zombies!: Phaser.Physics.Arcade.Group;
  private keys!: {
    up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key;
    sprint: Phaser.Input.Keyboard.Key;
  };

  progression = new ProgressionModel();
  inventory = new InventoryModel();
  ps = this.progression.psMax();

  constructor() {
    super("Lab");
  }

  get hudInfo(): HudInfo {
    return { name: "Iara", gender: "F", place: "Laboratorio", subtitle: "Morón — pruebas" };
  }

  create(): void {
    // HUD en paralelo + estado inicial
    this.scene.launch("Hud", { host: this });
    this.ps = this.progression.psMax();
    this.registerStateEvents();

    // Piso
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, "tile_floor");
      }
    }
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

    // Paredes
    this.walls = this.physics.add.staticGroup();
    for (let x = 0; x < MAP_W; x++) {
      this.walls.create(x * TILE + TILE / 2, TILE / 2, "tile_wall");
      this.walls.create(x * TILE + TILE / 2, (MAP_H - 1) * TILE + TILE / 2, "tile_wall");
    }
    for (let y = 0; y < MAP_H; y++) {
      this.walls.create(TILE / 2, y * TILE + TILE / 2, "tile_wall");
      this.walls.create((MAP_W - 1) * TILE + TILE / 2, y * TILE + TILE / 2, "tile_wall");
    }
    this.walls.create(8 * TILE + TILE / 2, 7 * TILE + TILE / 2, "tile_wall");
    this.walls.create(12 * TILE + TILE / 2, 7 * TILE + TILE / 2, "tile_wall");

    // Player
    this.player = new Player(this, (MAP_W * TILE) / 2, (MAP_H * TILE) / 2);
    this.physics.add.collider(this.player, this.walls);

    // Zombies
    this.zombies = this.physics.add.group({ runChildUpdate: false });
    this.physics.add.collider(this.zombies, this.walls);
    this.physics.add.collider(this.zombies, this.zombies);

    // Items iniciales de prueba
    this.inventory.add("photo_pareja", 1);
    this.inventory.add("medkit", 2);

    // Input de movimiento
    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey("W"), down: kb.addKey("S"),
      left: kb.addKey("A"), right: kb.addKey("D"),
      sprint: kb.addKey("SHIFT"),
    };

    // Ataque
    kb.addKey("SPACE").on("down", () => {
      const hitbox = this.player.attack(this.time.now);
      if (hitbox) this.onPlayerAttack(hitbox);
    });

    this.setupDebug();
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

    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);
    for (const obj of this.zombies.getChildren()) {
      (obj as Zombie).think(this.time.now, playerPos);
    }
  }

  // --- Estado de juego ---

  private registerStateEvents(): void {
    this.events.on("player-damaged", (dmg: number) => {
      this.ps = Math.max(0, this.ps - dmg);
      this.events.emit("hud-update");
      if (this.ps <= 0) this.onPlayerDead();
    });
    this.events.on("xp-gained", (amount: number) => {
      this.progression.addXp(amount);
      this.ps = Math.min(this.ps, this.progression.psMax());
      this.events.emit("hud-update");
    });
  }

  private onPlayerDead(): void {
    this.player.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.ps = this.progression.psMax();
    this.events.emit("hud-update");
  }

  spawnZombie(x: number, y: number): void {
    const z = new Zombie(this, x, y);
    z.onHitPlayer = (dmg) => this.events.emit("player-damaged", dmg);
    z.onDeath = () => this.events.emit("xp-gained", ZOMBIE_XP_REWARD);
    this.zombies.add(z);
  }

  private onPlayerAttack(hitbox: Phaser.Geom.Rectangle): void {
    for (const obj of this.zombies.getChildren()) {
      const z = obj as Zombie;
      if (Phaser.Geom.Rectangle.Contains(hitbox, z.x, z.y)) {
        z.takeDamage(this.player.meleeDamage, this.player.x, this.player.y);
      }
    }
  }

  // --- Guardado ---

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
    this.flashMessage("Partida guardada");
  }

  loadGame(slot = 1): void {
    const state = SaveSystem.load(slot);
    if (!state) {
      this.flashMessage("No hay partida guardada");
      return;
    }
    this.player.setPosition(state.player.x, state.player.y);
    this.progression = ProgressionModel.fromState(state.progression);
    this.inventory = InventoryModel.fromState(state.inventory);
    this.ps = state.player.ps;
    this.events.emit("hud-update");
    this.flashMessage("Partida cargada");
  }

  private flashMessage(msg: string): void {
    const t = this.add.text(this.scale.width / 2, 56, msg, {
      color: "#ffffff", fontSize: "14px", backgroundColor: "#000000c0",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setPadding(4);
    this.time.delayedCall(1200, () => t.destroy());
  }

  // --- Debug ---

  private setupDebug(): void {
    const help = [
      "WASD/flechas: mover · SHIFT: correr · ESPACIO: atacar",
      "Z: spawn zombie · X: +50 XP · C: -10 PS · V: curar(+20)",
      "I: mochila · T: diálogo · G: guardar · L: cargar",
    ].join("\n");
    this.add.text(8, 28, help, {
      color: "#dddddd", fontSize: "11px", backgroundColor: "#00000080",
    }).setPadding(4).setScrollFactor(0).setDepth(100);

    const kb = this.input.keyboard!;
    kb.addKey("Z").on("down", () => this.spawnZombie(
      Phaser.Math.Between(2 * TILE, (MAP_W - 2) * TILE),
      Phaser.Math.Between(2 * TILE, (MAP_H - 2) * TILE),
    ));
    kb.addKey("X").on("down", () => this.events.emit("xp-gained", 50));
    kb.addKey("C").on("down", () => this.events.emit("player-damaged", 10));
    kb.addKey("V").on("down", () => {
      this.ps = Math.min(this.progression.psMax(), this.ps + 20);
      this.events.emit("hud-update");
    });
    kb.addKey("G").on("down", () => this.saveGame());
    kb.addKey("L").on("down", () => this.loadGame());
    kb.addKey("T").on("down", () => {
      const hud = this.scene.get("Hud") as HudScene;
      if (!hud.dialogue.visible) hud.dialogue.start(sampleDialogue, "start");
    });
  }
}

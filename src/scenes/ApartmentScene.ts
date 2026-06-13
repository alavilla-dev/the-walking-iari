import Phaser from "phaser";
import { SAVE_VERSION } from "../config";
import { Player } from "../entities/Player";
import { Cat } from "../entities/Cat";
import { ProgressionModel } from "../systems/ProgressionModel";
import { InventoryModel } from "../systems/InventoryModel";
import { SaveSystem } from "../systems/SaveSystem";
import { Sfx } from "../systems/Sfx";
import { Cutscene } from "../systems/Cutscene";
import { introCap1 } from "./cutscenes/introCap1";
import type { SaveState, DialogueScript } from "../types";
import type { HudInfo } from "./GameHost";
import type { HudScene } from "./HudScene";

// Render del depto como fondo. Colisiones/profundidad: del mapa de Ale si está, si no perímetro.
const STRIP = 8; // alto (px del arte) de cada franja de profundidad
const DEBUG_COLLIDERS = false;

interface Interactable { x: number; y: number; radius: number; run: () => void; }

export class ApartmentScene extends Phaser.Scene {
  private player!: Player;
  private cats: Cat[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private interactables: Interactable[] = [];
  private cutscene = new Cutscene(this);
  private stepTimer = 0;
  private S = 1; private ox = 0; private oy = 0;
  private bgW = 1024; private bgH = 1024;
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
    return { name: "Iara", gender: "F", place: "Depto. Casullo 856", subtitle: "Morón — Buenos Aires" };
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

    // Dimensiones del render (dinámicas: sirve para cualquier depto).
    const src = this.textures.get("apartment_bg").getSourceImage();
    this.bgW = src.width; this.bgH = src.height;
    const W = this.scale.width, H = this.scale.height;
    this.S = Math.min(W / this.bgW, H / this.bgH);
    this.ox = (W - this.bgW * this.S) / 2;
    this.oy = (H - this.bgH * this.S) / 2;
    this.cameras.main.setBackgroundColor("#0b0a0d");

    // Fondo (render completo).
    this.add.image(this.ox, this.oy, "apartment_bg").setOrigin(0, 0).setScale(this.S).setDepth(-100);
    // Capa de profundidad: franjas del frente (paredes/muebles) ordenadas por su Y.
    this.buildForeground();

    this.physics.world.setBounds(this.ox, this.oy, this.bgW * this.S, this.bgH * this.S);
    this.walls = this.physics.add.staticGroup();
    this.buildColliders();

    const start = { x: W / 2, y: this.oy + this.bgH * this.S * 0.55 };
    this.player = new Player(this, start.x, start.y);
    this.player.setScale(0.85);
    this.physics.add.collider(this.player, this.walls);

    // Zoom + cámara que sigue a Iara (el depto se va "auto-descubriendo").
    this.cameras.main.setBounds(this.ox, this.oy, this.bgW * this.S, this.bgH * this.S);
    this.cameras.main.setZoom(1.7);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Gatos: Marfil (blanco, frenético) y Venus (negro, tranquilo).
    this.cats = [
      new Cat(this, this.cvt(520, 800).x, this.cvt(520, 800).y, "cat_marfil", { frenetic: true, high: true }),
      new Cat(this, this.cvt(800, 880).x, this.cvt(800, 880).y, "cat_venus", { frenetic: false, high: false }),
    ];
    for (const c of this.cats) this.physics.add.collider(c, this.walls);

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

  // ---------- Profundidad (capa frontal en franjas, y-sorting) ----------

  private buildForeground(): void {
    if (!this.textures.exists("apartment_fg")) return; // sin mapa todavía
    for (let sy = 0; sy < this.bgH; sy += STRIP) {
      const h = Math.min(STRIP, this.bgH - sy);
      const img = this.add.image(this.ox, this.oy, "apartment_fg").setOrigin(0, 0).setScale(this.S);
      img.setCrop(0, sy, this.bgW, h);
      img.setDepth(this.oy + (sy + h) * this.S); // profundidad = base de la franja
    }
  }

  // ---------- Colisiones (del mapa de Ale; si no hay, perímetro temporal) ----------

  private wall(ix: number, iy: number, iw: number, ih: number): void {
    const x = ix * this.S + this.ox, y = iy * this.S + this.oy;
    const w = iw * this.S, h = ih * this.S;
    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0);
    this.physics.add.existing(zone, true);
    this.walls.add(zone);
    if (DEBUG_COLLIDERS) this.add.rectangle(x, y, w, h, 0xff0000, 0.3).setOrigin(0, 0).setDepth(900);
  }

  private buildColliders(): void {
    if (this.cache.json.exists("apartment_collision")) {
      const rects = this.cache.json.get("apartment_collision") as number[][];
      for (const [ix, iy, iw, ih] of rects) this.wall(ix, iy, iw, ih);
      return;
    }
    // Sin mapa todavía: perímetro (inset) para que no se vaya del depto.
    const m = 0.06, W = this.bgW, H = this.bgH, t = 26;
    this.wall(W * m, H * m, W * (1 - 2 * m), t);
    this.wall(W * m, H * (1 - m) - t, W * (1 - 2 * m), t);
    this.wall(W * m, H * m, t, H * (1 - 2 * m));
    this.wall(W * (1 - m) - t, H * m, t, H * (1 - 2 * m));
  }

  // ---------- Interacciones ----------

  private buildInteractions(): void {
    const add = (ix: number, iy: number, run: () => void) => {
      const p = this.cvt(ix, iy);
      this.interactables.push({ x: p.x, y: p.y, radius: 60, run });
    };
    // Posiciones aprox. del render nuevo (se afinan junto con el mapa de colisión/eventos).
    add(260, 150, () => this.say("Iara", "La cama. Ale me pidió que descanse... como si pudiera."));
    add(1080, 160, () => this.say("Iara", "El baño. Una ducha no me vendría mal."));
    add(1050, 500, () => this.say("Iara", "La heladera llena. Ale hizo las compras antes de salir."));
    add(260, 880, () => this.say("Iara", "Flores frescas en la mesa. Un detalle de él."));
    add(625, 1170, () => this.say("Iara", "La puerta. Todavía es de noche... mejor esperar a que vuelva Ale."));
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

  private controlHint(): void { /* ayuda en pantalla: irá en el HUD (no se zoomea) */ }

  private async startIntro(): Promise<void> {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.player.setVelocity(0, 0);

    const center = { x: this.player.x, y: this.player.y };
    const tv = { x: this.player.x + 40, y: this.player.y - 50 };
    await this.cutscene.play(introCap1(this.player, tv, center));

    body.enable = true;
    body.reset(this.player.x, this.player.y);
  }

  update(time: number): void {
    // Profundidad de Iara según la Y de sus pies (y-sorting con la capa frontal).
    this.player.setDepth(this.player.y + this.player.displayHeight * 0.42);
    // Gatos (deambulan y maúllan al acercarse).
    const pv = new Phaser.Math.Vector2(this.player.x, this.player.y);
    for (const c of this.cats) c.tick(time, pv);
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

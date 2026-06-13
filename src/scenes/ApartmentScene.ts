import Phaser from "phaser";
import { SAVE_VERSION } from "../config";
import { logicalW, logicalH, crispWorld } from "../ui/uikit";
import { collisionRects, loadDepthMap, sampleDepth, furnitureLayer, type DepthMap } from "../systems/ColorMap";
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
  private depthMap: DepthMap | null = null; // degradado gris para y-sorting
  private tvPos!: { x: number; y: number };  // posición de la tele (para la música)
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
    return {
      name: "Iara", gender: "F",
      place: "Depto. Casullo 856", subtitle: "Morón — Buenos Aires",
      objective: "Esperar a que Ale vuelva. Descansar en el depto.",
    };
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
    const W = logicalW(this), H = logicalH(this);
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
    this.player.setScale(0.8);
    this.physics.add.collider(this.player, this.walls);

    // Zoom + cámara que sigue a Iara (el depto se va "auto-descubriendo").
    this.cameras.main.setBounds(this.ox, this.oy, this.bgW * this.S, this.bgH * this.S);
    crispWorld(this, 1.7);
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
    kb.addKey("K").on("down", () => this.toggleColliderDebug());
    Sfx.get().unlock();
    Sfx.get().startTechno(); // base de techno lista (vol 0; sube por cercanía a la tele)
    this.events.once("shutdown", () => Sfx.get().stopTechno());

    this.buildInteractions();

    const skipIntro = typeof window !== "undefined" && window.location.hash === "#apt";
    if (skipIntro) this.controlHint();
    else this.startIntro();
  }

  // ---------- Profundidad / y-sorting (muebles recortados del mapa de color) ----------

  private buildForeground(): void {
    // Mapa de profundidad (degradado gris) para ordenar a Iara y los gatos.
    this.depthMap = loadDepthMap(this, "apartment_depth_map");

    // Muebles: cada blob rojo del mapa de colisión se recorta del render y se
    // coloca con una profundidad fija (gris del piso en su base) → tapa o no a Iara.
    if (this.depthMap && this.textures.exists("apartment_collision_map")) {
      const pieces = furnitureLayer(this, "apartment_collision_map", "apartment_bg", this.depthMap, 4);
      for (const p of pieces) {
        this.add.image(this.ox + p.rx * this.S, this.oy + p.ry * this.S, p.key)
          .setOrigin(0, 0)
          .setScale(this.S)
          .setDepth(p.depth);
      }
      return;
    }

    // Fallback: capa frontal en franjas (si algún día hay apartment_fg).
    if (!this.textures.exists("apartment_fg")) return;
    for (let sy = 0; sy < this.bgH; sy += STRIP) {
      const h = Math.min(STRIP, this.bgH - sy);
      const img = this.add.image(this.ox, this.oy, "apartment_fg").setOrigin(0, 0).setScale(this.S);
      img.setCrop(0, sy, this.bgW, h);
      img.setDepth(this.oy + (sy + h) * this.S);
    }
  }

  /** Profundidad (0–255) bajo los pies de un objeto, leída del degradado gris. */
  private depthAtFeet(worldX: number, feetY: number): number {
    if (!this.depthMap) return feetY;
    const r2m = this.depthMap.w / this.bgW; // render → mapa
    const ix = ((worldX - this.ox) / this.S) * r2m;
    const iy = ((feetY - this.oy) / this.S) * r2m;
    return sampleDepth(this.depthMap, ix, iy);
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
    // Mapa de colisión (rojo = mueble, negro = pared/exterior) → hitboxes estáticas.
    if (this.textures.exists("apartment_collision_map")) {
      const src = this.textures.get("apartment_collision_map").getSourceImage() as { width: number };
      const m2r = this.bgW / src.width; // mapa → render
      for (const r of collisionRects(this, "apartment_collision_map", 6)) {
        this.wall(r.x * m2r, r.y * m2r, r.w * m2r, r.h * m2r);
      }
      return;
    }
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

  /** Dibuja/oculta las hitboxes generadas (debug, tecla K). */
  private colliderDebug?: Phaser.GameObjects.Graphics;
  private toggleColliderDebug(): void {
    if (this.colliderDebug) { this.colliderDebug.destroy(); this.colliderDebug = undefined; return; }
    const g = this.add.graphics().setDepth(900);
    g.fillStyle(0xff0000, 0.28);
    for (const z of this.walls.getChildren()) {
      const zone = z as Phaser.GameObjects.Zone;
      g.fillRect(zone.x, zone.y, zone.width, zone.height);
    }
    this.colliderDebug = g;
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

    // La tele (en el living, frente al sillón): deja sonando una base de techno.
    this.tvPos = this.cvt(720, 940);
    add(720, 940, () => this.say("Iara", "La tele prendida frente al sillón, con una base de techno bajita. A Ale le gusta dejarla así."));
  }

  private tryInteract(): void {
    const hud = this.scene.get("Hud") as HudScene;
    if (hud.dialogue.visible) { hud.dialogue.advance(); return; }
    if (this.cutscene.active) return;
    // Gato cerca → maúlla (ESPACIO/E).
    for (const c of this.cats) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) < 80) { c.meowNow(); return; }
    }
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
    this.player.renderLook(time / 1000);

    // Música de la tele: base de techno que sube de volumen al acercarse.
    const dTv = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.tvPos.x, this.tvPos.y);
    Sfx.get().setTechnoVolume(Phaser.Math.Clamp(1 - dTv / 180, 0, 1));

    // Y-sorting: profundidad = degradado gris bajo los pies (+0.5 para ganar
    // empates contra el mueble en cuyo piso está parada).
    this.player.setDepth(this.depthAtFeet(this.player.x, this.player.y + this.player.displayHeight * 0.42) + 0.5);
    // Gatos (deambulan; maúllan con ESPACIO al estar cerca).
    for (const c of this.cats) {
      c.tick(time);
      c.setDepth(this.depthAtFeet(c.x, c.y + c.displayHeight * 0.42));
    }
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

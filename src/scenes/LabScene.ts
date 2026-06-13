import Phaser from "phaser";
import { TILE, SAVE_VERSION, AIM_SPREAD_MAX_DEG, AIM_SPREAD_MIN_DEG } from "../config";
import { Player } from "../entities/Player";
import { Zombie, type ZombieKind } from "../entities/Zombie";
import { Bullet } from "../entities/Bullet";
import { Vfx } from "../systems/Vfx";
import { Sfx } from "../systems/Sfx";
import { getWeapon } from "../data/weapons";
import { getItemDef } from "../data/items";
import { WaveManager } from "../systems/WaveManager";
import { createLookTexture, type LookTexture } from "../look/LookTexture";
import { CHARACTERS } from "../look/characters";
import { ProgressionModel } from "../systems/ProgressionModel";
import { InventoryModel } from "../systems/InventoryModel";
import { SaveSystem } from "../systems/SaveSystem";
import { sampleDialogue } from "../data/sampleDialogue";
import { FOG_ENABLED } from "../config";
import { crispText, logicalW, crispWorld } from "../ui/uikit";
import { FogOfWar } from "../systems/FogOfWar";
import { Loadout } from "../systems/Loadout";
import type { SaveState, DialogueScript } from "../types";
import type { HudInfo, WeaponHud } from "./GameHost";
import type { HudScene } from "./HudScene";

const MAP_W = 20;
const MAP_H = 15;

export class LabScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private zombies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.GameObjects.Group;
  private fog?: FogOfWar;
  private ale!: Phaser.Physics.Arcade.Image;
  private aleLook!: LookTexture;
  private alePrompt!: Phaser.GameObjects.Text;
  private crosshair!: Phaser.GameObjects.Graphics;
  private loadout = new Loadout(); // arranca con cuchillo
  private lastDry = 0;
  private pickups: { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; kind: "weapon" | "ammo"; id: string }[] = [];
  private waves!: WaveManager;
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
    return {
      name: "Iara", gender: "F",
      place: "Laboratorio", subtitle: "Morón — pruebas",
      objective: "Zona de pruebas: eliminá a los zombies.",
    };
  }

  create(): void {
    // HUD en paralelo + estado inicial
    this.scene.launch("Hud", { host: this });
    this.ps = this.progression.psMax();
    this.registerStateEvents();

    // Piso (al fondo, para que las manchas de sangre queden por encima).
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, "tile_floor").setDepth(-100);
      }
    }
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

    // Cámara: el mapa (640x480) llena el canvas con supersampling (zoom = RENDER_SCALE).
    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    crispWorld(this);
    this.cameras.main.centerOn((MAP_W * TILE) / 2, (MAP_H * TILE) / 2);

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
    this.player.setScale(1.3);
    this.physics.add.collider(this.player, this.walls);

    // Ale (NPC, hero_alejandro) parado en un rincón del laboratorio.
    this.aleLook = createLookTexture(this, CHARACTERS.hero_alejandro, 1);
    this.aleLook.draw("down", "idle", 0);
    this.ale = this.physics.add.staticImage(4 * TILE, 4 * TILE, this.aleLook.key);
    this.ale.setScale(1.3).refreshBody();
    this.physics.add.collider(this.player, this.ale);
    this.alePrompt = crispText(this, this.ale.x, this.ale.y - 34, "E: hablar", {
      color: "#e8b45a", fontSize: "10px", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(620).setVisible(false);
    this.input.keyboard!.addKey("E").on("down", () => this.talkToAle());

    // Zombies
    this.zombies = this.physics.add.group({ runChildUpdate: false });
    this.physics.add.collider(this.zombies, this.walls);
    this.physics.add.collider(this.zombies, this.zombies);

    // Balas: grupo NORMAL (no de física) para no resetear su velocidad al agregarlas.
    this.bullets = this.add.group();
    this.physics.add.overlap(this.bullets, this.zombies, (b, z) => this.onBulletHit(b as Bullet, z as Zombie));
    this.physics.add.overlap(this.bullets, this.walls, (b) => (b as Bullet).destroy());

    // Items iniciales: el cuchillo ya equipado + algo de prueba.
    this.inventory.add("knife", 1);
    this.inventory.add("photo_pareja", 1);
    this.inventory.add("medkit", 2);

    // Loot de armas y munición tirados en el laboratorio.
    this.spawnPickup("pistol", 15 * TILE, 3 * TILE);
    this.spawnPickup("shotgun", 3 * TILE, 11 * TILE);
    this.spawnPickup("bat", 16 * TILE, 11 * TILE);
    this.spawnAmmo(10 * TILE, 3 * TILE);
    this.spawnAmmo(6 * TILE, 11 * TILE);

    // Input de movimiento
    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey("W"), down: kb.addKey("S"),
      left: kb.addKey("A"), right: kb.addKey("D"),
      sprint: kb.addKey("SHIFT"),
    };

    // Armas: cambiar con 1..5 (las que tengas), recargar con R, usar con clic.
    ["ONE", "TWO", "THREE", "FOUR", "FIVE"].forEach((name, i) => {
      kb.addKey(name).on("down", () => {
        if (i < this.loadout.slots.length && this.loadout.select(i)) this.onWeaponChanged();
      });
    });
    kb.addKey("R").on("down", () => this.startReload());
    kb.addKey("Q").on("down", () => this.useMedkit());
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.loadout.cycle(dy > 0 ? 1 : -1);
      this.onWeaponChanged();
    });

    if (FOG_ENABLED) this.fog = new FogOfWar(this, 0, 0, MAP_W * TILE, MAP_H * TILE);

    // Mirita (sólo armas de fuego); ocultamos el cursor del sistema.
    this.crosshair = this.add.graphics().setDepth(900);
    this.events.once("shutdown", () => this.input.setDefaultCursor("default"));
    this.onWeaponChanged();

    // Oleadas en MODO HISTORIA: no aparecen solas; se disparan a pedido (tecla H
    // de prueba, o desde un beat del guión llamando this.waves.trigger(...)).
    this.waves = new WaveManager({
      spawn: (kind, x, y) => this.spawnZombie(x, y, kind),
      randomSpawnPoint: () => this.randomSpawnPoint(),
    });

    this.setupDebug();
  }

  weaponInfo(): WeaponHud {
    const w = this.loadout.current();
    const a = this.loadout.ammoOf();
    return {
      id: w.id, name: w.name, icon: w.icon, kind: w.kind,
      mag: a?.mag, reserve: a?.reserve, reloading: this.loadout.reloading,
    };
  }

  /** Equipa un arma por id desde la Mochila (la debe tener en el loadout). */
  equipWeapon(id: string): boolean {
    const i = this.loadout.slots.indexOf(id);
    if (i < 0 || !this.loadout.select(i)) return false;
    this.onWeaponChanged();
    return true;
  }

  /** Loot de un arma tirada en el piso. */
  private spawnPickup(id: string, x: number, y: number): void {
    this.makePickup("weapon", id, getWeapon(id).icon, getWeapon(id).name, x, y, "#e8b45a");
  }

  /** Loot de una caja de munición. */
  private spawnAmmo(x: number, y: number): void {
    this.makePickup("ammo", "ammo", "ammo_box", "Munición", x, y, "#cfe06a");
  }

  private makePickup(kind: "weapon" | "ammo", id: string, icon: string, name: string, x: number, y: number, color: string): void {
    const img = this.add.image(x, y, icon);
    this.tweens.add({ targets: img, y: y - 3, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const label = crispText(this, x, y + 14, name, { color, fontSize: "8px" }).setOrigin(0.5);
    this.pickups.push({ img, label, kind, id });
  }

  /** Recoge un loot si Iara está encima. */
  private checkPickups(): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, pk.img.x, pk.img.y) > 24) continue;
      if (pk.kind === "weapon") {
        const isNew = this.loadout.acquire(pk.id);
        this.inventory.add(pk.id, 1);
        this.equipWeapon(pk.id);
        this.flashMessage(`${isNew ? "Conseguiste" : "Tenés"}: ${getWeapon(pk.id).name}`);
      } else {
        this.loadout.refillAmmo(2);
        this.events.emit("weapon-update");
        this.flashMessage("Munición recogida");
      }
      Sfx.get().confirm();
      pk.img.destroy();
      pk.label.destroy();
      this.pickups.splice(i, 1);
    }
  }

  // ---- Curación ----

  /** Usa un botiquín: cura PS si hay y no está llena. */
  private useMedkit(): void {
    if (!this.inventory.has("medkit")) { this.flashMessage("Sin botiquines"); return; }
    if (this.ps >= this.progression.psMax()) { this.flashMessage("PS al máximo"); return; }
    const heal = getItemDef("medkit").healAmount ?? 20;
    this.ps = Math.min(this.progression.psMax(), this.ps + heal);
    this.inventory.remove("medkit", 1);
    Sfx.get().heal();
    Vfx.healFlash(this);
    this.events.emit("hud-update");
    this.flashMessage(`+${heal} PS`);
  }

  useItem(id: string): void {
    if (id === "medkit") this.useMedkit();
  }

  // ---- Oleadas ----

  private randomSpawnPoint(): { x: number; y: number } {
    // Punto al azar lejos de Iara (al menos 4 tiles).
    for (let tries = 0; tries < 12; tries++) {
      const x = Phaser.Math.Between(2 * TILE, (MAP_W - 2) * TILE);
      const y = Phaser.Math.Between(2 * TILE, (MAP_H - 2) * TILE);
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > 4 * TILE) return { x, y };
    }
    return { x: 2 * TILE, y: 2 * TILE };
  }

  /** Al cambiar de arma: mira/cursor según tipo y refresco del HUD. */
  private onWeaponChanged(): void {
    const ranged = this.loadout.current().kind === "ranged";
    this.crosshair.setVisible(ranged);
    this.input.setDefaultCursor(ranged ? "none" : "default");
    this.events.emit("weapon-update");
  }

  /** Dispersión angular (rad) actual según la puntería del jugador. */
  private aimSpread(): number {
    const acc = this.progression.aim(); // 0..1
    return Phaser.Math.DegToRad(Phaser.Math.Linear(AIM_SPREAD_MAX_DEG, AIM_SPREAD_MIN_DEG, acc));
  }

  /** Mira fija y prolija: anillo + 4 marcas + punto, con contorno para contraste. */
  private drawCrosshair(): void {
    const p = this.input.activePointer;
    const x = p.worldX, y = p.worldY;
    const g = this.crosshair;
    const ring = 7, gap = 3, tick = 5;
    g.clear();

    const reticle = (color: number, alpha: number, w: number) => {
      g.lineStyle(w, color, alpha);
      g.strokeCircle(x, y, ring);
      g.lineBetween(x, y - ring - gap, x, y - ring - gap - tick);
      g.lineBetween(x, y + ring + gap, x, y + ring + gap + tick);
      g.lineBetween(x - ring - gap, y, x - ring - gap - tick, y);
      g.lineBetween(x + ring + gap, y, x + ring + gap + tick, y);
    };
    reticle(0x000000, 0.45, 3);    // contorno oscuro
    reticle(0xffe7a0, 0.95, 1.2);  // ámbar claro
    g.fillStyle(0xffffff, 1).fillCircle(x, y, 1.3); // punto central
  }

  update(): void {
    this.waves.update(this.game.loop.delta);
    this.fog?.reveal(this.player.x, this.player.y, this.player.facingAngle);
    const cursors = this.input.keyboard!.createCursorKeys();
    this.player.handleInput({
      up: this.keys.up.isDown || cursors.up.isDown,
      down: this.keys.down.isDown || cursors.down.isDown,
      left: this.keys.left.isDown || cursors.left.isDown,
      right: this.keys.right.isDown || cursors.right.isDown,
      sprint: this.keys.sprint.isDown,
    });

    if (this.crosshair.visible) this.drawCrosshair();
    // Usar el arma equipada (clic izquierdo sostenido).
    if (this.input.activePointer.leftButtonDown()) this.useWeapon();

    const tSec = this.time.now / 1000;
    this.player.renderLook(tSec);
    this.aleLook.draw("down", "idle", tSec);

    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);
    for (const obj of this.zombies.getChildren()) {
      const z = obj as Zombie;
      z.think(this.time.now, playerPos);
      z.renderLook(tSec);
    }

    // Prompt de Ale cuando Iara está cerca.
    const nearAle = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.ale.x, this.ale.y) < 56;
    this.alePrompt.setVisible(nearAle);

    this.checkPickups();
  }

  private talkToAle(): void {
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.ale.x, this.ale.y) >= 56) return;
    const hud = this.scene.get("Hud") as HudScene;
    if (hud.dialogue.visible) { hud.dialogue.advance(); return; }
    const script: DialogueScript = {
      a1: { id: "a1", speaker: "Ale", text: "Iara, no te separes de mí. Esto se está poniendo feo.", next: "a2" },
      a2: { id: "a2", speaker: "Ale", text: "Si ves uno de esos... apuntá a la cabeza y no dudes.", next: null },
    };
    hud.dialogue.start(script, "a1");
  }

  /** Usa el arma equipada apuntando al cursor (golpe o disparo según el tipo). */
  private useWeapon(): void {
    const def = this.loadout.current();
    const p = this.input.activePointer;
    const aim = Phaser.Math.Angle.Between(this.player.x, this.player.y, p.worldX, p.worldY);

    if (def.kind === "melee") {
      const hitbox = this.player.meleeSwing(this.time.now, def, aim);
      if (hitbox) this.onMeleeHit(hitbox, def);
      return;
    }

    // Arma de fuego: necesita balas en el cargador.
    if (!this.loadout.canFire()) {
      if (this.loadout.reloading) return;
      if (this.loadout.needsReload()) { this.startReload(); return; }
      // Sin balas y sin reserva → gatillo vacío (con throttle para no spamear).
      if (this.time.now - this.lastDry > 350) { Sfx.get().dryFire(); this.lastDry = this.time.now; }
      return;
    }
    const muzzle = this.player.fireRanged(this.time.now, aim, def);
    if (!muzzle) return;
    this.loadout.consume();
    this.events.emit("weapon-update");

    // Dispersión = puntería + dispersión propia del arma; una desviación por perdigón.
    const spread = this.aimSpread() + Phaser.Math.DegToRad(def.spreadDeg ?? 0);
    const pellets = def.pellets ?? 1;
    for (let i = 0; i < pellets; i++) {
      // Uniforme dentro del cono → con mala puntería va literalmente para cualquier lado.
      const dev = (Math.random() * 2 - 1) * spread;
      const angle = muzzle.angle + dev;
      this.bullets.add(new Bullet(this, muzzle.x, muzzle.y, angle, def.damage, def.knockback));
    }
    Vfx.muzzle(this, muzzle.x, muzzle.y, muzzle.angle);
    Vfx.shake(this, def.pellets && def.pellets > 1 ? 110 : 60, 0.004);
    if (this.loadout.ammoOf()?.mag === 0) this.startReload();
  }

  private onBulletHit(bullet: Bullet, zombie: Zombie): void {
    if (!bullet.active || !zombie.active) return;
    zombie.takeDamage(bullet.damage, bullet.originX2, bullet.originY2, bullet.knockback);
    Vfx.damageNumber(this, zombie.x, zombie.y, bullet.damage);
    Vfx.shake(this, 50, 0.0035);
    bullet.destroy();
  }

  private onMeleeHit(hitbox: Phaser.Geom.Rectangle, def: { damage: number; knockback: number }): void {
    let hit = false;
    for (const obj of this.zombies.getChildren()) {
      const z = obj as Zombie;
      if (z.active && Phaser.Geom.Rectangle.Contains(hitbox, z.x, z.y)) {
        z.takeDamage(def.damage, this.player.x, this.player.y, def.knockback);
        Vfx.damageNumber(this, z.x, z.y, def.damage, true);
        hit = true;
      }
    }
    if (hit) Vfx.shake(this, 90, 0.006);
  }

  /** Inicia la recarga del arma de fuego actual (si hace falta y hay reserva). */
  private startReload(): void {
    if (this.loadout.reloading || !this.loadout.needsReload()) return;
    const def = this.loadout.current();
    this.loadout.reloading = true;
    Sfx.get().reloadSound();
    this.events.emit("weapon-update");
    this.time.delayedCall(def.reloadMs ?? 900, () => {
      this.loadout.reload();
      this.loadout.reloading = false;
      this.events.emit("weapon-update");
    });
  }

  // --- Estado de juego ---

  private registerStateEvents(): void {
    this.events.on("player-damaged", (dmg: number) => {
      this.ps = Math.max(0, this.ps - dmg);
      this.events.emit("hud-update");
      if (this.ps <= 0) this.onPlayerDead();
    });
    this.events.on("xp-gained", (amount: number) => {
      const res = this.progression.addXp(amount);
      if (res.leveledUp) {
        this.ps = this.progression.psMax(); // recompensa: cura total al subir de nivel
        Sfx.get().levelUp();
        Vfx.shake(this, 120, 0.004);
        this.flashMessage(`¡Nivel ${this.progression.level}!`);
      } else {
        this.ps = Math.min(this.ps, this.progression.psMax());
      }
      this.events.emit("hud-update");
    });
  }

  private onPlayerDead(): void {
    this.player.setPosition((MAP_W * TILE) / 2, (MAP_H * TILE) / 2);
    this.ps = this.progression.psMax();
    this.events.emit("hud-update");
  }

  spawnZombie(x: number, y: number, kind: ZombieKind = "walker"): void {
    const z = new Zombie(this, x, y, kind);
    z.onHitPlayer = (dmg, zx, zy) => this.onZombieHitPlayer(dmg, zx, zy);
    z.onDeath = (xp) => this.events.emit("xp-gained", xp);
    this.zombies.add(z);
  }

  /** Un zombie muerde a Iara: knockback + i-frames; sólo daña si no es invulnerable. */
  private onZombieHitPlayer(dmg: number, zx: number, zy: number): void {
    if (!this.player.hurt(zx, zy)) return; // en i-frames: sin daño
    this.events.emit("player-damaged", dmg);
    Vfx.hurtFlash(this);
    Vfx.shake(this, 140, 0.008);
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
    const t = crispText(this, logicalW(this) / 2, 56, msg, {
      color: "#ffffff", fontSize: "14px", backgroundColor: "#000000c0",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setPadding(4);
    this.time.delayedCall(1200, () => t.destroy());
  }

  // --- Debug ---

  private setupDebug(): void {
    const help = [
      "MOVER: WASD/flechas · SHIFT: correr · CLIC: usar arma",
      "1-4: cambiar arma · RUEDA: ciclar · R: recargar · Q: curar",
      "I: mochila (equipar/usar) · loot en el piso",
      "Z/N/B: spawn manual · H: oleada de prueba · X: +XP · G/L: guardar/cargar",
    ].join("\n");
    crispText(this, 8, 28, help, {
      color: "#dddddd", fontSize: "10px", backgroundColor: "#000000a0",
    }).setPadding(4).setScrollFactor(0).setDepth(1000);

    const kb = this.input.keyboard!;
    const spawn = (kind: ZombieKind) => this.spawnZombie(
      Phaser.Math.Between(2 * TILE, (MAP_W - 2) * TILE),
      Phaser.Math.Between(2 * TILE, (MAP_H - 2) * TILE),
      kind,
    );
    kb.addKey("Z").on("down", () => spawn("walker"));
    kb.addKey("N").on("down", () => spawn("runner"));
    kb.addKey("B").on("down", () => spawn("brute"));
    kb.addKey("H").on("down", () => { this.waves.trigger(8); this.flashMessage("¡Oleada!"); });
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

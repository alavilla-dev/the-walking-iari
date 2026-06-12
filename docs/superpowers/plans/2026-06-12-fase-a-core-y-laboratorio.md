# The Walking Iari — Fase A: Core Systems + Laboratorio de Gameplay — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el motor del juego y un laboratorio de gameplay jugable (sandbox sin historia) donde probar movimiento, combate cuerpo a cuerpo, zombies, mochila, progresión, HUD, diálogos y guardado.

**Architecture:** Phaser 3 para render/escenas; la lógica de juego pura (inventario, progresión, guardado, diálogos, IA de zombie) vive en módulos **sin dependencia de Phaser**, testeables con Vitest. Las escenas y entidades de Phaser consumen esos módulos. Assets = texturas placeholder generadas por código (swap a LimeZu en el futuro sin tocar lógica).

**Tech Stack:** TypeScript · Phaser 3 · Vite (dev/build) · Vitest + jsdom (tests).

---

## File Structure

```
the-walking-iari/
  index.html                  # punto de entrada web
  package.json                # deps y scripts
  tsconfig.json               # config TypeScript
  vite.config.ts              # config Vite + Vitest (jsdom)
  src/
    main.ts                   # bootstrap del juego Phaser
    config.ts                 # constantes de juego (velocidades, tile, daño)
    types.ts                  # tipos compartidos (Direction, ItemDef, SaveState...)
    data/
      items.ts                # definiciones de items (ITEM_DEFS)
      sampleDialogue.ts       # guion de diálogo de prueba
    systems/                  # LÓGICA PURA (sin Phaser, testeable)
      ProgressionModel.ts
      InventoryModel.ts
      SaveSystem.ts
      DialogueRunner.ts
      ZombieBrain.ts
    assets/
      placeholders.ts         # genera texturas placeholder
    entities/
      Player.ts               # sprite del jugador (Phaser)
      Zombie.ts               # sprite del zombie (Phaser, usa ZombieBrain)
    scenes/
      BootScene.ts
      PreloadScene.ts
      LabScene.ts             # el laboratorio de gameplay
      HudScene.ts             # capa de HUD encima del Lab
    ui/
      DialogueBox.ts
      InventoryPanel.ts
  tests/
    progression.test.ts
    inventory.test.ts
    save.test.ts
    dialogue.test.ts
    zombieBrain.test.ts
```

---

## Task 1: Scaffolding del proyecto (Vite + TS + Phaser + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `tests/smoke.test.ts`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "the-walking-iari",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "phaser": "^3.90.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["vitest/globals"],
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Crear `vite.config.ts`** (incluye config de Vitest con jsdom)

```typescript
/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
  },
});
```

- [ ] **Step 4: Crear `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Walking Iari</title>
    <style>
      html, body { margin: 0; background: #0d0d12; height: 100%; }
      #game { display: flex; justify-content: center; align-items: center; height: 100vh; }
      canvas { image-rendering: pixelated; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Crear `src/main.ts` (placeholder temporal)**

```typescript
// Reemplazado en Task 9 por el bootstrap real de Phaser.
console.log("The Walking Iari — boot");
```

- [ ] **Step 6: Crear `tests/smoke.test.ts`**

```typescript
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("el entorno de test corre", () => {
    expect(1 + 1).toBe(2);
  });
  it("localStorage existe (jsdom)", () => {
    localStorage.setItem("k", "v");
    expect(localStorage.getItem("k")).toBe("v");
  });
});
```

- [ ] **Step 7: Instalar dependencias**

Run: `npm install`
Expected: instala sin errores; se crea `node_modules/` y `package-lock.json`.

- [ ] **Step 8: Correr el test smoke**

Run: `npm test`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + TS + Phaser + Vitest"
```

---

## Task 2: Constantes y tipos compartidos

**Files:**
- Create: `src/config.ts`, `src/types.ts`

- [ ] **Step 1: Crear `src/config.ts`**

```typescript
export const TILE = 32;

// Jugador
export const PLAYER_BASE_PS = 20;        // PS a nivel 1 (coincide con la referencia)
export const PLAYER_SPEED = 120;         // px/s
export const SPRINT_MULT = 1.6;
export const MELEE_RANGE = 40;           // alcance del ataque c. a c.
export const MELEE_DAMAGE = 25;
export const MELEE_COOLDOWN = 400;       // ms

// Zombie
export const ZOMBIE_SPEED = 40;          // lento
export const ZOMBIE_CHASE_RANGE = 200;
export const ZOMBIE_ATTACK_RANGE = 28;
export const ZOMBIE_DAMAGE = 5;
export const ZOMBIE_ATTACK_COOLDOWN = 1000; // ms
export const ZOMBIE_BASE_PS = 50;
export const ZOMBIE_XP_REWARD = 20;

// Progresión
export const XP_PER_LEVEL_FACTOR = 50;   // xpToNext(level) = level * 50
export const PS_PER_LEVEL = 5;           // psMax = PLAYER_BASE_PS + (level-1)*PS_PER_LEVEL
export const SKILL_POINTS_PER_LEVEL = 1;

// Guardado
export const SAVE_VERSION = 1;
export const SAVE_KEY_PREFIX = "twi_save_";
```

- [ ] **Step 2: Crear `src/types.ts`**

```typescript
export type Direction = "up" | "down" | "left" | "right";

export type ItemType = "weapon" | "heal" | "narrative" | "key";

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  stackable: boolean;
  healAmount?: number; // sólo type === "heal"
}

export interface ProgressionState {
  level: number;
  xp: number;
  skillPoints: number;
}

export interface InventoryEntry {
  id: string;
  qty: number;
}

export interface SaveState {
  version: number;
  savedAt: number;
  player: { x: number; y: number; ps: number };
  progression: ProgressionState;
  inventory: InventoryEntry[];
  flags: Record<string, boolean>;
}

// Diálogos
export interface DialogueOption {
  text: string;
  goto: string | null; // id del siguiente nodo, o null para terminar
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  options?: DialogueOption[]; // si no hay, avanza con `next`
  next?: string | null;
}

export type DialogueScript = Record<string, DialogueNode>;
```

- [ ] **Step 3: Verificar tipado**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: shared config constants and types"
```

---

## Task 3: ProgressionModel (TDD)

**Files:**
- Create: `src/systems/ProgressionModel.ts`
- Test: `tests/progression.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { describe, it, expect } from "vitest";
import { ProgressionModel } from "../src/systems/ProgressionModel";

describe("ProgressionModel", () => {
  it("nivel 1 arranca con PS max base y sin xp", () => {
    const p = new ProgressionModel();
    expect(p.level).toBe(1);
    expect(p.xp).toBe(0);
    expect(p.psMax()).toBe(20);
    expect(p.skillPoints).toBe(0);
  });

  it("xpToNext escala con el nivel", () => {
    const p = new ProgressionModel();
    expect(p.xpToNext()).toBe(50); // 1 * 50
  });

  it("sube de nivel al alcanzar el umbral y otorga PS y skill point", () => {
    const p = new ProgressionModel();
    const events = p.addXp(50);
    expect(p.level).toBe(2);
    expect(p.xp).toBe(0);
    expect(p.psMax()).toBe(25);
    expect(p.skillPoints).toBe(1);
    expect(events.leveledUp).toBe(true);
    expect(events.levelsGained).toBe(1);
  });

  it("acumula xp parcial sin subir de nivel", () => {
    const p = new ProgressionModel();
    const events = p.addXp(30);
    expect(p.level).toBe(1);
    expect(p.xp).toBe(30);
    expect(events.leveledUp).toBe(false);
  });

  it("maneja múltiples niveles de un solo golpe", () => {
    const p = new ProgressionModel();
    // L1->L2 cuesta 50, L2->L3 cuesta 100 => 150 total = exactamente nivel 3
    const events = p.addXp(150);
    expect(p.level).toBe(3);
    expect(p.xp).toBe(0);
    expect(events.levelsGained).toBe(2);
  });

  it("serializa y restaura su estado", () => {
    const p = new ProgressionModel();
    p.addXp(70); // L2 con 20 xp
    const state = p.toState();
    const p2 = ProgressionModel.fromState(state);
    expect(p2.level).toBe(2);
    expect(p2.xp).toBe(20);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npx vitest run tests/progression.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `src/systems/ProgressionModel.ts`**

```typescript
import {
  PLAYER_BASE_PS,
  PS_PER_LEVEL,
  XP_PER_LEVEL_FACTOR,
  SKILL_POINTS_PER_LEVEL,
} from "../config";
import type { ProgressionState } from "../types";

export interface XpResult {
  leveledUp: boolean;
  levelsGained: number;
}

export class ProgressionModel {
  level = 1;
  xp = 0;
  skillPoints = 0;

  xpToNext(): number {
    return this.level * XP_PER_LEVEL_FACTOR;
  }

  psMax(): number {
    return PLAYER_BASE_PS + (this.level - 1) * PS_PER_LEVEL;
  }

  addXp(amount: number): XpResult {
    let levelsGained = 0;
    this.xp += amount;
    while (this.xp >= this.xpToNext()) {
      this.xp -= this.xpToNext();
      this.level += 1;
      this.skillPoints += SKILL_POINTS_PER_LEVEL;
      levelsGained += 1;
    }
    return { leveledUp: levelsGained > 0, levelsGained };
  }

  toState(): ProgressionState {
    return { level: this.level, xp: this.xp, skillPoints: this.skillPoints };
  }

  static fromState(s: ProgressionState): ProgressionModel {
    const p = new ProgressionModel();
    p.level = s.level;
    p.xp = s.xp;
    p.skillPoints = s.skillPoints;
    return p;
  }
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npx vitest run tests/progression.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ProgressionModel (xp, niveles, PS, skill points)"
```

---

## Task 4: InventoryModel + definiciones de items (TDD)

**Files:**
- Create: `src/data/items.ts`, `src/systems/InventoryModel.ts`
- Test: `tests/inventory.test.ts`

- [ ] **Step 1: Crear `src/data/items.ts`**

```typescript
import type { ItemDef } from "../types";

export const ITEM_DEFS: Record<string, ItemDef> = {
  knife: {
    id: "knife",
    name: "Cuchillo de cocina",
    type: "weapon",
    description: "Filoso. Mejor que las manos.",
    stackable: false,
  },
  bat: {
    id: "bat",
    name: "Bate",
    type: "weapon",
    description: "Contundente y confiable.",
    stackable: false,
  },
  medkit: {
    id: "medkit",
    name: "Botiquín",
    type: "heal",
    description: "Recupera 20 PS.",
    stackable: true,
    healAmount: 20,
  },
  photo_pareja: {
    id: "photo_pareja",
    name: "Foto de Ale e Iara",
    type: "narrative",
    description: "Una foto de los dos. La llevás siempre.",
    stackable: false,
  },
  llave_depto: {
    id: "llave_depto",
    name: "Llave del depto",
    type: "key",
    description: "Abre la puerta del departamento.",
    stackable: false,
  },
};

export function getItemDef(id: string): ItemDef {
  const def = ITEM_DEFS[id];
  if (!def) throw new Error(`Item desconocido: ${id}`);
  return def;
}
```

- [ ] **Step 2: Escribir el test que falla**

```typescript
import { describe, it, expect } from "vitest";
import { InventoryModel } from "../src/systems/InventoryModel";

describe("InventoryModel", () => {
  it("agrega un item y lo cuenta", () => {
    const inv = new InventoryModel();
    inv.add("medkit", 2);
    expect(inv.count("medkit")).toBe(2);
    expect(inv.has("medkit")).toBe(true);
  });

  it("apila items stackables y no-stackables máximo 1", () => {
    const inv = new InventoryModel();
    inv.add("medkit", 1);
    inv.add("medkit", 3);
    expect(inv.count("medkit")).toBe(4);
    inv.add("knife", 1);
    inv.add("knife", 1);
    expect(inv.count("knife")).toBe(1); // no stackable
  });

  it("remueve items y limpia entradas vacías", () => {
    const inv = new InventoryModel();
    inv.add("medkit", 2);
    expect(inv.remove("medkit", 1)).toBe(true);
    expect(inv.count("medkit")).toBe(1);
    expect(inv.remove("medkit", 5)).toBe(false); // no alcanza
    expect(inv.count("medkit")).toBe(1);
    expect(inv.remove("medkit", 1)).toBe(true);
    expect(inv.has("medkit")).toBe(false);
  });

  it("lista entradas con su definición", () => {
    const inv = new InventoryModel();
    inv.add("photo_pareja", 1);
    const list = inv.list();
    expect(list).toHaveLength(1);
    expect(list[0].def.name).toBe("Foto de Ale e Iara");
    expect(list[0].qty).toBe(1);
  });

  it("serializa y restaura", () => {
    const inv = new InventoryModel();
    inv.add("medkit", 2);
    inv.add("knife", 1);
    const inv2 = InventoryModel.fromState(inv.toState());
    expect(inv2.count("medkit")).toBe(2);
    expect(inv2.count("knife")).toBe(1);
  });
});
```

- [ ] **Step 3: Correr el test (debe fallar)**

Run: `npx vitest run tests/inventory.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implementar `src/systems/InventoryModel.ts`**

```typescript
import { getItemDef } from "../data/items";
import type { ItemDef, InventoryEntry } from "../types";

export class InventoryModel {
  private items = new Map<string, number>();

  add(id: string, qty = 1): void {
    const def = getItemDef(id);
    const current = this.items.get(id) ?? 0;
    if (!def.stackable) {
      this.items.set(id, 1);
      return;
    }
    this.items.set(id, current + qty);
  }

  remove(id: string, qty = 1): boolean {
    const current = this.items.get(id) ?? 0;
    if (current < qty) return false;
    const left = current - qty;
    if (left <= 0) this.items.delete(id);
    else this.items.set(id, left);
    return true;
  }

  has(id: string): boolean {
    return (this.items.get(id) ?? 0) > 0;
  }

  count(id: string): number {
    return this.items.get(id) ?? 0;
  }

  list(): { def: ItemDef; qty: number }[] {
    return [...this.items.entries()].map(([id, qty]) => ({
      def: getItemDef(id),
      qty,
    }));
  }

  toState(): InventoryEntry[] {
    return [...this.items.entries()].map(([id, qty]) => ({ id, qty }));
  }

  static fromState(entries: InventoryEntry[]): InventoryModel {
    const inv = new InventoryModel();
    for (const e of entries) inv.items.set(e.id, e.qty);
    return inv;
  }
}
```

- [ ] **Step 5: Correr el test (debe pasar)**

Run: `npx vitest run tests/inventory.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: InventoryModel + definiciones de items"
```

---

## Task 5: SaveSystem (TDD)

**Files:**
- Create: `src/systems/SaveSystem.ts`
- Test: `tests/save.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { SaveSystem } from "../src/systems/SaveSystem";
import type { SaveState } from "../src/types";

function sampleState(): SaveState {
  return {
    version: 1,
    savedAt: 123,
    player: { x: 10, y: 20, ps: 18 },
    progression: { level: 2, xp: 30, skillPoints: 1 },
    inventory: [{ id: "medkit", qty: 2 }],
    flags: { intro_vista: true },
  };
}

describe("SaveSystem", () => {
  beforeEach(() => localStorage.clear());

  it("guarda y carga un slot", () => {
    SaveSystem.save(1, sampleState());
    const loaded = SaveSystem.load(1);
    expect(loaded).not.toBeNull();
    expect(loaded!.player.ps).toBe(18);
    expect(loaded!.inventory[0].id).toBe("medkit");
  });

  it("devuelve null si el slot está vacío", () => {
    expect(SaveSystem.load(3)).toBeNull();
  });

  it("lista slots ocupados", () => {
    SaveSystem.save(1, sampleState());
    SaveSystem.save(2, sampleState());
    expect(SaveSystem.listSlots().sort()).toEqual([1, 2]);
  });

  it("borra un slot", () => {
    SaveSystem.save(1, sampleState());
    SaveSystem.delete(1);
    expect(SaveSystem.load(1)).toBeNull();
  });

  it("devuelve null si el JSON está corrupto", () => {
    localStorage.setItem("twi_save_1", "{ no es json");
    expect(SaveSystem.load(1)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npx vitest run tests/save.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/systems/SaveSystem.ts`**

```typescript
import { SAVE_KEY_PREFIX } from "../config";
import type { SaveState } from "../types";

export const SaveSystem = {
  key(slot: number): string {
    return `${SAVE_KEY_PREFIX}${slot}`;
  },

  save(slot: number, state: SaveState): void {
    localStorage.setItem(this.key(slot), JSON.stringify(state));
  },

  load(slot: number): SaveState | null {
    const raw = localStorage.getItem(this.key(slot));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as SaveState;
    } catch {
      return null;
    }
  },

  delete(slot: number): void {
    localStorage.removeItem(this.key(slot));
  },

  listSlots(): number[] {
    const slots: number[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SAVE_KEY_PREFIX)) {
        slots.push(Number(k.slice(SAVE_KEY_PREFIX.length)));
      }
    }
    return slots;
  },
};
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npx vitest run tests/save.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: SaveSystem con localStorage y slots"
```

---

## Task 6: DialogueRunner (TDD)

**Files:**
- Create: `src/systems/DialogueRunner.ts`, `src/data/sampleDialogue.ts`
- Test: `tests/dialogue.test.ts`

- [ ] **Step 1: Crear `src/data/sampleDialogue.ts`**

```typescript
import type { DialogueScript } from "../types";

export const sampleDialogue: DialogueScript = {
  start: {
    id: "start",
    speaker: "Iara",
    text: "¿Probamos el laboratorio?",
    options: [
      { text: "¡Dale!", goto: "si" },
      { text: "Mejor después", goto: "no" },
    ],
  },
  si: {
    id: "si",
    speaker: "Iara",
    text: "Genial, a romper zombies.",
    next: null,
  },
  no: {
    id: "no",
    speaker: "Iara",
    text: "Bueno, acá te espero.",
    next: null,
  },
};
```

- [ ] **Step 2: Escribir el test que falla**

```typescript
import { describe, it, expect } from "vitest";
import { DialogueRunner } from "../src/systems/DialogueRunner";
import { sampleDialogue } from "../src/data/sampleDialogue";

describe("DialogueRunner", () => {
  it("arranca en el nodo inicial", () => {
    const r = new DialogueRunner(sampleDialogue);
    r.start("start");
    expect(r.current()?.speaker).toBe("Iara");
    expect(r.current()?.text).toContain("laboratorio");
    expect(r.isFinished()).toBe(false);
  });

  it("elegir una opción navega al nodo destino", () => {
    const r = new DialogueRunner(sampleDialogue);
    r.start("start");
    r.choose(0); // "¡Dale!" -> "si"
    expect(r.current()?.id).toBe("si");
  });

  it("avanzar un nodo sin opciones con next null termina", () => {
    const r = new DialogueRunner(sampleDialogue);
    r.start("si");
    r.advance();
    expect(r.isFinished()).toBe(true);
    expect(r.current()).toBeNull();
  });

  it("hasOptions distingue nodos de elección", () => {
    const r = new DialogueRunner(sampleDialogue);
    r.start("start");
    expect(r.hasOptions()).toBe(true);
    r.choose(1);
    expect(r.hasOptions()).toBe(false);
  });
});
```

- [ ] **Step 3: Correr el test (debe fallar)**

Run: `npx vitest run tests/dialogue.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implementar `src/systems/DialogueRunner.ts`**

```typescript
import type { DialogueNode, DialogueScript } from "../types";

export class DialogueRunner {
  private currentId: string | null = null;

  constructor(private script: DialogueScript) {}

  start(id: string): void {
    if (!this.script[id]) throw new Error(`Nodo de diálogo desconocido: ${id}`);
    this.currentId = id;
  }

  current(): DialogueNode | null {
    return this.currentId ? this.script[this.currentId] : null;
  }

  isFinished(): boolean {
    return this.currentId === null;
  }

  hasOptions(): boolean {
    const node = this.current();
    return !!node?.options && node.options.length > 0;
  }

  choose(optionIndex: number): void {
    const node = this.current();
    if (!node?.options) throw new Error("El nodo actual no tiene opciones");
    const opt = node.options[optionIndex];
    if (!opt) throw new Error(`Opción inválida: ${optionIndex}`);
    this.currentId = opt.goto;
  }

  advance(): void {
    const node = this.current();
    if (!node) return;
    if (node.options) throw new Error("Usá choose() en nodos con opciones");
    this.currentId = node.next ?? null;
  }
}
```

- [ ] **Step 5: Correr el test (debe pasar)**

Run: `npx vitest run tests/dialogue.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: DialogueRunner data-driven + guion de prueba"
```

---

## Task 7: ZombieBrain — máquina de estados (TDD)

**Files:**
- Create: `src/systems/ZombieBrain.ts`
- Test: `tests/zombieBrain.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { describe, it, expect } from "vitest";
import { ZombieBrain } from "../src/systems/ZombieBrain";

describe("ZombieBrain", () => {
  it("arranca en IDLE", () => {
    const b = new ZombieBrain();
    expect(b.state).toBe("idle");
  });

  it("pasa a CHASE cuando el jugador entra en rango de persecución", () => {
    const b = new ZombieBrain();
    const action = b.decide({ distance: 150, attackCooldownReady: true });
    expect(b.state).toBe("chase");
    expect(action.move).toBe(true);
  });

  it("pasa a ATTACK en rango de ataque y respeta cooldown", () => {
    const b = new ZombieBrain();
    const a1 = b.decide({ distance: 20, attackCooldownReady: true });
    expect(b.state).toBe("attack");
    expect(a1.attack).toBe(true);
    const a2 = b.decide({ distance: 20, attackCooldownReady: false });
    expect(a2.attack).toBe(false); // en cooldown no pega
  });

  it("vuelve a IDLE si el jugador sale del rango", () => {
    const b = new ZombieBrain();
    b.decide({ distance: 150, attackCooldownReady: true });
    b.decide({ distance: 999, attackCooldownReady: true });
    expect(b.state).toBe("idle");
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npx vitest run tests/zombieBrain.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/systems/ZombieBrain.ts`**

```typescript
import { ZOMBIE_CHASE_RANGE, ZOMBIE_ATTACK_RANGE } from "../config";

export type ZombieState = "idle" | "chase" | "attack";

export interface ZombiePerception {
  distance: number;          // distancia al jugador (px)
  attackCooldownReady: boolean;
}

export interface ZombieAction {
  move: boolean;   // debe moverse hacia el jugador
  attack: boolean; // debe ejecutar un ataque este frame
}

export class ZombieBrain {
  state: ZombieState = "idle";

  decide(p: ZombiePerception): ZombieAction {
    if (p.distance <= ZOMBIE_ATTACK_RANGE) {
      this.state = "attack";
      return { move: false, attack: p.attackCooldownReady };
    }
    if (p.distance <= ZOMBIE_CHASE_RANGE) {
      this.state = "chase";
      return { move: true, attack: false };
    }
    this.state = "idle";
    return { move: false, attack: false };
  }
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npx vitest run tests/zombieBrain.test.ts`
Expected: PASS. Luego correr toda la suite: `npm test` → todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ZombieBrain (idle/chase/attack)"
```

---

## Task 8: Generador de texturas placeholder

**Files:**
- Create: `src/assets/placeholders.ts`

> Nota: las texturas se generan por código (rectángulos/círculos de colores con un marcador de dirección). Sin archivos binarios. El swap a LimeZu se hace reemplazando estas texturas por sprite sheets en el PreloadScene, sin tocar la lógica de entidades.

- [ ] **Step 1: Implementar `src/assets/placeholders.ts`**

```typescript
import Phaser from "phaser";
import { TILE } from "../config";

/**
 * Crea texturas placeholder en el TextureManager de la escena.
 * Para el jugador genera 4 texturas con un "marcador" según la dirección.
 */
export function createPlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Piso
  g.clear();
  g.fillStyle(0x3a3a44, 1).fillRect(0, 0, TILE, TILE);
  g.lineStyle(1, 0x2c2c34, 1).strokeRect(0, 0, TILE, TILE);
  g.generateTexture("tile_floor", TILE, TILE);

  // Pared
  g.clear();
  g.fillStyle(0x6b4f3a, 1).fillRect(0, 0, TILE, TILE);
  g.lineStyle(1, 0x4a3526, 1).strokeRect(0, 0, TILE, TILE);
  g.generateTexture("tile_wall", TILE, TILE);

  // Jugador (Iara) — círculo colorado con marcador direccional
  const dirs: Record<string, [number, number]> = {
    down: [16, 26],
    up: [16, 6],
    left: [6, 16],
    right: [26, 16],
  };
  for (const [dir, [mx, my]] of Object.entries(dirs)) {
    g.clear();
    g.fillStyle(0xd1603a, 1).fillCircle(16, 16, 12); // cuerpo/pelo colorado
    g.fillStyle(0xffe0b2, 1).fillCircle(16, 16, 7);  // cara
    g.fillStyle(0x222222, 1).fillCircle(mx, my, 3);  // marcador de dirección
    g.generateTexture(`player_${dir}`, 32, 32);
  }

  // Zombie — círculo verde
  g.clear();
  g.fillStyle(0x5a8f3a, 1).fillCircle(16, 16, 12);
  g.fillStyle(0x3a5f24, 1).fillCircle(16, 16, 6);
  g.generateTexture("zombie", 32, 32);

  // Gato — círculo blanco chico
  g.clear();
  g.fillStyle(0xeeeeee, 1).fillCircle(12, 12, 9);
  g.fillStyle(0xcccccc, 1).fillTriangle(5, 4, 9, 4, 7, 0);
  g.generateTexture("cat", 24, 24);

  // Retrato placeholder (HUD)
  g.clear();
  g.fillStyle(0x222230, 1).fillRect(0, 0, 48, 48);
  g.fillStyle(0xd1603a, 1).fillCircle(24, 20, 14);
  g.fillStyle(0xffe0b2, 1).fillCircle(24, 22, 9);
  g.generateTexture("portrait_iara", 48, 48);

  g.destroy();
}
```

- [ ] **Step 2: Verificar tipado**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: generador de texturas placeholder"
```

---

## Task 9: Bootstrap de Phaser + escenas Boot/Preload/Lab vacía

**Files:**
- Modify: `src/main.ts`
- Create: `src/scenes/BootScene.ts`, `src/scenes/PreloadScene.ts`, `src/scenes/LabScene.ts`

- [ ] **Step 1: Crear `src/scenes/BootScene.ts`**

```typescript
import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create(): void {
    this.scene.start("Preload");
  }
}
```

- [ ] **Step 2: Crear `src/scenes/PreloadScene.ts`**

```typescript
import Phaser from "phaser";
import { createPlaceholderTextures } from "../assets/placeholders";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }
  preload(): void {
    // Cuando tengamos LimeZu: this.load.spritesheet(...) acá.
  }
  create(): void {
    createPlaceholderTextures(this);
    this.scene.start("Lab");
  }
}
```

- [ ] **Step 3: Crear `src/scenes/LabScene.ts` (versión mínima: piso + texto)**

```typescript
import Phaser from "phaser";
import { TILE } from "../config";

export class LabScene extends Phaser.Scene {
  constructor() {
    super("Lab");
  }

  create(): void {
    // Piso de prueba 20x15 tiles
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 20; x++) {
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, "tile_floor");
      }
    }
    this.add
      .text(10, 10, "LABORATORIO — Lab vacío OK", { color: "#ffffff", fontSize: "14px" })
      .setScrollFactor(0);
  }
}
```

- [ ] **Step 4: Reemplazar `src/main.ts`**

```typescript
import Phaser from "phaser";
import { TILE } from "./config";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { LabScene } from "./scenes/LabScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 20 * TILE,
  height: 15 * TILE,
  pixelArt: true,
  backgroundColor: "#0d0d12",
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [BootScene, PreloadScene, LabScene],
});
```

- [ ] **Step 5: Verificar build de tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Verificación manual en navegador**

Run: `npm run dev`
Abrir la URL que imprime Vite (ej. `http://localhost:5173`).
Expected: se ve una grilla de piso gris y el texto "LABORATORIO — Lab vacío OK". Sin errores en la consola del navegador.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Phaser + escenas Boot/Preload/Lab"
```

---

## Task 10: Entidad Player con movimiento 8-direcciones + sprint

**Files:**
- Create: `src/entities/Player.ts`
- Modify: `src/scenes/LabScene.ts`

- [ ] **Step 1: Crear `src/entities/Player.ts`**

```typescript
import Phaser from "phaser";
import { PLAYER_SPEED, SPRINT_MULT } from "../config";
import type { Direction } from "../types";

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: Direction = "down";
  private bobTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player_down");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(12);
  }

  /** keys: objeto con estados booleanos de input. */
  handleInput(input: {
    up: boolean; down: boolean; left: boolean; right: boolean; sprint: boolean;
  }): void {
    let vx = 0;
    let vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;

    const moving = vx !== 0 || vy !== 0;
    const speed = PLAYER_SPEED * (input.sprint ? SPRINT_MULT : 1);

    // Normalizar diagonal
    const len = Math.hypot(vx, vy) || 1;
    this.setVelocity((vx / len) * speed, (vy / len) * speed);

    // Dirección de cara (prioriza eje vertical para el sprite)
    if (vy < 0) this.facing = "up";
    else if (vy > 0) this.facing = "down";
    else if (vx < 0) this.facing = "left";
    else if (vx > 0) this.facing = "right";
    if (moving) this.setTexture(`player_${this.facing}`);

    this.updateBob(moving);
  }

  private updateBob(moving: boolean): void {
    if (moving && !this.bobTween?.isPlaying()) {
      this.bobTween = this.scene.tweens.add({
        targets: this,
        scaleY: 0.92,
        duration: 120,
        yoyo: true,
        repeat: -1,
      });
    } else if (!moving && this.bobTween) {
      this.bobTween.stop();
      this.setScale(1);
      this.bobTween = undefined;
    }
  }
}
```

- [ ] **Step 2: Modificar `src/scenes/LabScene.ts` para instanciar y controlar al Player**

Reemplazar el contenido completo por:

```typescript
import Phaser from "phaser";
import { TILE } from "../config";
import { Player } from "../entities/Player";

export class LabScene extends Phaser.Scene {
  private player!: Player;
  private keys!: {
    up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key;
    sprint: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super("Lab");
  }

  create(): void {
    const w = 20, h = 15;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, "tile_floor");
      }
    }
    this.physics.world.setBounds(0, 0, w * TILE, h * TILE);

    this.player = new Player(this, (w * TILE) / 2, (h * TILE) / 2);

    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey("W"), down: kb.addKey("S"),
      left: kb.addKey("A"), right: kb.addKey("D"),
      sprint: kb.addKey("SHIFT"),
    };
    // Flechas también
    kb.addKeys("UP,DOWN,LEFT,RIGHT");

    this.add.text(10, 10, "WASD/flechas: mover · SHIFT: correr", {
      color: "#ffffff", fontSize: "12px",
    }).setScrollFactor(0).setDepth(100);
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
  }
}
```

- [ ] **Step 3: Verificación manual**

Run: `npm run dev`
Expected: Iara (círculo colorado) se mueve con WASD/flechas en 8 direcciones, el marcador apunta a la dirección, hace "bob" al caminar, corre con SHIFT, y no sale de los límites.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Player con movimiento 8-dir + sprint"
```

---

## Task 11: Paredes del laboratorio con colisión

**Files:**
- Modify: `src/scenes/LabScene.ts`

- [ ] **Step 1: Añadir un grupo estático de paredes en el borde y colisión**

En `create()`, después de crear el piso y **antes** de crear al player, agregar:

```typescript
    const walls = this.physics.add.staticGroup();
    for (let x = 0; x < w; x++) {
      walls.create(x * TILE + TILE / 2, TILE / 2, "tile_wall");
      walls.create(x * TILE + TILE / 2, (h - 1) * TILE + TILE / 2, "tile_wall");
    }
    for (let y = 0; y < h; y++) {
      walls.create(TILE / 2, y * TILE + TILE / 2, "tile_wall");
      walls.create((w - 1) * TILE + TILE / 2, y * TILE + TILE / 2, "tile_wall");
    }
    // Un par de obstáculos internos para probar colisión
    walls.create(8 * TILE + TILE / 2, 7 * TILE + TILE / 2, "tile_wall");
    walls.create(12 * TILE + TILE / 2, 7 * TILE + TILE / 2, "tile_wall");
```

Y después de crear `this.player`, agregar:

```typescript
    this.physics.add.collider(this.player, walls);
    this.walls = walls;
```

Declarar el campo en la clase:

```typescript
  private walls!: Phaser.Physics.Arcade.StaticGroup;
```

- [ ] **Step 2: Verificación manual**

Run: `npm run dev`
Expected: Iara choca contra las paredes del borde y los dos bloques internos; no los atraviesa.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: paredes con colisión en el laboratorio"
```

---

## Task 12: Combate cuerpo a cuerpo (ataque del Player)

**Files:**
- Modify: `src/entities/Player.ts`, `src/scenes/LabScene.ts`

- [ ] **Step 1: Añadir lógica de ataque a `Player`**

Añadir imports y campos en `Player.ts`:

```typescript
import { MELEE_RANGE, MELEE_DAMAGE, MELEE_COOLDOWN } from "../config";
```

Dentro de la clase `Player`, agregar:

```typescript
  private lastAttack = -Infinity;

  canAttack(time: number): boolean {
    return time - this.lastAttack >= MELEE_COOLDOWN;
  }

  /** Devuelve el rectángulo de golpe frente a Iara, o null si está en cooldown. */
  attack(time: number): Phaser.Geom.Rectangle | null {
    if (!this.canAttack(time)) return null;
    this.lastAttack = time;
    const r = MELEE_RANGE;
    let cx = this.x, cy = this.y;
    if (this.facing === "up") cy -= r;
    else if (this.facing === "down") cy += r;
    else if (this.facing === "left") cx -= r;
    else cx += r;
    // Feedback visual
    const fx = this.scene.add.circle(cx, cy, 10, 0xffffff, 0.5).setDepth(50);
    this.scene.tweens.add({ targets: fx, alpha: 0, duration: 150, onComplete: () => fx.destroy() });
    return new Phaser.Geom.Rectangle(cx - r / 2, cy - r / 2, r, r);
  }

  get meleeDamage(): number {
    return MELEE_DAMAGE;
  }
```

- [ ] **Step 2: Conectar el ataque en `LabScene`**

En `create()`, registrar la tecla de ataque (barra espaciadora) y un texto de ayuda:

```typescript
    this.input.keyboard!.addKey("SPACE").on("down", () => {
      const hitbox = this.player.attack(this.time.now);
      if (hitbox) this.onPlayerAttack(hitbox);
    });
```

Agregar el método (se completa en Task 13 al haber zombies; por ahora vacío con log):

```typescript
  private onPlayerAttack(_hitbox: Phaser.Geom.Rectangle): void {
    // Task 13 conecta esto con los zombies.
  }
```

Actualizar el texto de ayuda para incluir "ESPACIO: atacar".

- [ ] **Step 3: Verificación manual**

Run: `npm run dev`
Expected: al apretar ESPACIO aparece un destello blanco frente a Iara en la dirección que mira; respeta el cooldown (no spamea).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: ataque cuerpo a cuerpo del Player con hitbox y cooldown"
```

---

## Task 13: Entidad Zombie (usa ZombieBrain) + daño + muerte + XP

**Files:**
- Create: `src/entities/Zombie.ts`
- Modify: `src/scenes/LabScene.ts`

- [ ] **Step 1: Crear `src/entities/Zombie.ts`**

```typescript
import Phaser from "phaser";
import { ZombieBrain } from "../systems/ZombieBrain";
import {
  ZOMBIE_SPEED, ZOMBIE_BASE_PS, ZOMBIE_DAMAGE,
  ZOMBIE_ATTACK_COOLDOWN,
} from "../config";

export class Zombie extends Phaser.Physics.Arcade.Sprite {
  private brain = new ZombieBrain();
  private ps = ZOMBIE_BASE_PS;
  private lastAttack = -Infinity;
  /** callback cuando este zombie golpea al jugador */
  onHitPlayer?: (damage: number) => void;
  /** callback cuando muere (para dar XP) */
  onDeath?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "zombie");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(12);
  }

  think(time: number, player: Phaser.Math.Vector2): void {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const ready = time - this.lastAttack >= ZOMBIE_ATTACK_COOLDOWN;
    const action = this.brain.decide({ distance, attackCooldownReady: ready });

    if (action.move) {
      this.scene.physics.moveTo(this, player.x, player.y, ZOMBIE_SPEED);
    } else {
      this.setVelocity(0, 0);
    }
    if (action.attack) {
      this.lastAttack = time;
      this.onHitPlayer?.(ZOMBIE_DAMAGE);
      this.flashAttack();
    }
  }

  takeDamage(amount: number): void {
    this.ps -= amount;
    this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 60, yoyo: true });
    if (this.ps <= 0) this.die();
  }

  private die(): void {
    this.onDeath?.();
    this.destroy();
  }

  private flashAttack(): void {
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => this.clearTint());
  }
}
```

- [ ] **Step 2: Integrar zombies en `LabScene`**

Añadir imports y campos:

```typescript
import { Zombie } from "../entities/Zombie";
import { ZOMBIE_XP_REWARD } from "../config";
```

Campos de clase:

```typescript
  private zombies!: Phaser.Physics.Arcade.Group;
```

En `create()`, después de crear paredes y player:

```typescript
    this.zombies = this.physics.add.group({ runChildUpdate: false });
    this.physics.add.collider(this.zombies, this.walls);
    this.physics.add.collider(this.zombies, this.zombies);
```

Agregar un método para spawnear (lo usará el debug de Task 18):

```typescript
  spawnZombie(x: number, y: number): void {
    const z = new Zombie(this, x, y);
    z.onHitPlayer = (dmg) => this.events.emit("player-damaged", dmg);
    z.onDeath = () => this.events.emit("xp-gained", ZOMBIE_XP_REWARD);
    this.zombies.add(z);
  }
```

Completar `onPlayerAttack` (reemplaza el stub de Task 12) para dañar zombies en el hitbox:

```typescript
  private onPlayerAttack(hitbox: Phaser.Geom.Rectangle): void {
    for (const obj of this.zombies.getChildren()) {
      const z = obj as Zombie;
      if (Phaser.Geom.Rectangle.Contains(hitbox, z.x, z.y)) {
        z.takeDamage(this.player.meleeDamage);
      }
    }
  }
```

En `update()`, hacer pensar a los zombies:

```typescript
    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);
    for (const obj of this.zombies.getChildren()) {
      (obj as Zombie).think(this.time.now, playerPos);
    }
```

Spawnear un zombie de prueba al final de `create()`:

```typescript
    this.spawnZombie(4 * TILE, 4 * TILE);
```

- [ ] **Step 3: Verificación manual**

Run: `npm run dev`
Expected: el zombie verde persigue a Iara lento; si la alcanza, parpadea al atacar (el daño al jugador se conecta visualmente en Task 14). Al golpearlo con ESPACIO parpadea y, tras 2 golpes (25×2=50), muere y desaparece.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Zombie con IA, daño, muerte y recompensa de XP"
```

---

## Task 14: HudScene (lugar, Nv, barra de PS, retrato, menú) + estado del juego

**Files:**
- Create: `src/scenes/HudScene.ts`
- Modify: `src/scenes/LabScene.ts`, `src/main.ts`

> El estado vivo del juego (PS actual, progresión, inventario) lo posee `LabScene` y lo expone vía eventos; `HudScene` corre en paralelo y lee/escucha.

- [ ] **Step 1: Dar a `LabScene` estado de PS y progresión**

Añadir imports:

```typescript
import { ProgressionModel } from "../systems/ProgressionModel";
import { InventoryModel } from "../systems/InventoryModel";
```

Campos de clase:

```typescript
  progression = new ProgressionModel();
  inventory = new InventoryModel();
  ps = this.progression.psMax();
```

En `create()`, lanzar el HUD en paralelo e inicializar listeners (al principio de `create`, antes de todo lo demás):

```typescript
    this.scene.launch("Hud", { lab: this });
    this.ps = this.progression.psMax();

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
```

Agregar manejo de muerte (respawn al centro con PS lleno — el guardado real se conecta en Task 17):

```typescript
  private onPlayerDead(): void {
    this.player.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.ps = this.progression.psMax();
    this.events.emit("hud-update");
  }
```

- [ ] **Step 2: Crear `src/scenes/HudScene.ts`**

```typescript
import Phaser from "phaser";
import type { LabScene } from "./LabScene";

export class HudScene extends Phaser.Scene {
  private lab!: LabScene;
  private psBar!: Phaser.GameObjects.Graphics;
  private psText!: Phaser.GameObjects.Text;
  private lvlText!: Phaser.GameObjects.Text;
  private locText!: Phaser.GameObjects.Text;

  constructor() {
    super("Hud");
  }

  init(data: { lab: LabScene }): void {
    this.lab = data.lab;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Lugar (arriba-izq)
    this.locText = this.add
      .text(8, 6, "Laboratorio — Morón", { color: "#ffffff", fontSize: "12px", backgroundColor: "#000000a0" })
      .setPadding(4);

    // Menú (arriba-der)
    this.add
      .text(W - 8, 6, "Diario · Mochila · Guardar · Opciones", {
        color: "#cccccc", fontSize: "11px", backgroundColor: "#000000a0",
      })
      .setPadding(4)
      .setOrigin(1, 0);

    // Retrato + Nv + PS (abajo-izq)
    this.add.image(20, H - 28, "portrait_iara").setOrigin(0, 0.5);
    this.lvlText = this.add.text(52, H - 40, "Nv.1", { color: "#ffffff", fontSize: "12px" });
    this.psText = this.add.text(52, H - 12, "PS 20/20", { color: "#ffffff", fontSize: "11px" });
    this.psBar = this.add.graphics();

    this.lab.events.on("hud-update", () => this.refresh());
    this.refresh();
  }

  private refresh(): void {
    const psMax = this.lab.progression.psMax();
    const ps = this.lab.ps;
    this.lvlText.setText(`Nv.${this.lab.progression.level}`);
    this.psText.setText(`PS ${ps}/${psMax}`);

    const H = this.scale.height;
    const x = 52, y = H - 26, w = 90, h = 8;
    this.psBar.clear();
    this.psBar.fillStyle(0x333333, 1).fillRect(x, y, w, h);
    this.psBar.fillStyle(0x4caf50, 1).fillRect(x, y, w * (ps / psMax), h);
    this.psBar.lineStyle(1, 0x000000, 1).strokeRect(x, y, w, h);
  }
}
```

- [ ] **Step 3: Registrar `HudScene` en `main.ts`**

Añadir el import y agregarla al array `scene` (después de `LabScene`):

```typescript
import { HudScene } from "./scenes/HudScene";
// ...
  scene: [BootScene, PreloadScene, LabScene, HudScene],
```

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`
Expected: HUD visible — lugar arriba-izq, menú arriba-der, retrato + "Nv.1" + barra "PS 20/20" abajo-izq. Cuando el zombie pega, baja la barra de PS. Al matar zombies sube XP; al subir de nivel cambia "Nv." y la barra de PS máxima. Al morir, Iara reaparece al centro con PS lleno.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: HudScene (lugar, menú, retrato, Nv, barra de PS) + estado de juego"
```

---

## Task 15: DialogueBox UI conectada al DialogueRunner

**Files:**
- Create: `src/ui/DialogueBox.ts`
- Modify: `src/scenes/HudScene.ts`, `src/scenes/LabScene.ts`

- [ ] **Step 1: Crear `src/ui/DialogueBox.ts`**

```typescript
import Phaser from "phaser";
import { DialogueRunner } from "../systems/DialogueRunner";
import type { DialogueScript } from "../types";

export class DialogueBox {
  private container: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private runner?: DialogueRunner;
  private onClose?: () => void;

  constructor(private scene: Phaser.Scene) {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const bg = scene.add.rectangle(0, 0, W - 16, 90, 0x101018, 0.95).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0xffffff, 0.6);
    this.nameText = scene.add.text(10, 6, "", { color: "#ffd54a", fontSize: "13px" });
    this.bodyText = scene.add.text(10, 26, "", { color: "#ffffff", fontSize: "12px", wordWrap: { width: W - 40 } });
    this.container = scene.add.container(8, H - 98, [bg, this.nameText, this.bodyText]);
    this.container.setDepth(200).setScrollFactor(0).setVisible(false);
  }

  get visible(): boolean {
    return this.container.visible;
  }

  start(script: DialogueScript, startId: string, onClose?: () => void): void {
    this.runner = new DialogueRunner(script);
    this.runner.start(startId);
    this.onClose = onClose;
    this.container.setVisible(true);
    this.render();
  }

  /** Avanza (nodos sin opciones) o cierra al terminar. */
  advance(): void {
    if (!this.runner) return;
    if (this.runner.hasOptions()) return; // las opciones se eligen con selectOption
    this.runner.advance();
    if (this.runner.isFinished()) this.close();
    else this.render();
  }

  selectOption(index: number): void {
    if (!this.runner?.hasOptions()) return;
    this.runner.choose(index);
    if (this.runner.isFinished()) this.close();
    else this.render();
  }

  private render(): void {
    const node = this.runner!.current()!;
    this.nameText.setText(node.speaker);
    this.bodyText.setText(node.text);
    this.optionTexts.forEach((t) => t.destroy());
    this.optionTexts = [];
    if (node.options) {
      node.options.forEach((opt, i) => {
        const t = this.scene.add
          .text(20, 56 + i * 16, `▶ ${opt.text}`, { color: "#9fd3ff", fontSize: "12px" })
          .setInteractive({ useHandCursor: true });
        t.on("pointerdown", () => this.selectOption(i));
        this.container.add(t);
        this.optionTexts.push(t);
      });
    }
  }

  private close(): void {
    this.container.setVisible(false);
    this.optionTexts.forEach((t) => t.destroy());
    this.optionTexts = [];
    this.runner = undefined;
    this.onClose?.();
  }
}
```

- [ ] **Step 2: Instanciar la caja en `HudScene` y exponerla**

En `HudScene`, añadir import y campo:

```typescript
import { DialogueBox } from "../ui/DialogueBox";
// ...
  dialogue!: DialogueBox;
```

Al final de `create()`:

```typescript
    this.dialogue = new DialogueBox(this);
    // Avanzar diálogo con ENTER (si no tiene opciones)
    this.input.keyboard!.addKey("ENTER").on("down", () => this.dialogue.advance());
```

- [ ] **Step 3: Disparar un diálogo de prueba desde `LabScene`**

En `LabScene.create()`, añadir import:

```typescript
import { sampleDialogue } from "../data/sampleDialogue";
```

Y una tecla para probar (se moverá al debug en Task 18):

```typescript
    this.input.keyboard!.addKey("T").on("down", () => {
      const hud = this.scene.get("Hud") as import("./HudScene").HudScene;
      if (!hud.dialogue.visible) hud.dialogue.start(sampleDialogue, "start");
    });
```

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`
Expected: al apretar **T** aparece la caja de diálogo de Iara con dos opciones clickeables; al elegir una muestra la respuesta y, con ENTER, cierra.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: DialogueBox UI conectada al DialogueRunner"
```

---

## Task 16: InventoryPanel UI conectado al InventoryModel

**Files:**
- Create: `src/ui/InventoryPanel.ts`
- Modify: `src/scenes/HudScene.ts`, `src/scenes/LabScene.ts`

- [ ] **Step 1: Crear `src/ui/InventoryPanel.ts`**

```typescript
import Phaser from "phaser";
import type { InventoryModel } from "../systems/InventoryModel";

export class InventoryPanel {
  private container: Phaser.GameObjects.Container;

  constructor(private scene: Phaser.Scene, private inventory: InventoryModel) {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const bg = scene.add.rectangle(0, 0, 220, 200, 0x101018, 0.97).setOrigin(0.5);
    bg.setStrokeStyle(2, 0xffffff, 0.6);
    const title = scene.add.text(0, -85, "MOCHILA", { color: "#ffd54a", fontSize: "14px" }).setOrigin(0.5);
    this.container = scene.add.container(W / 2, H / 2, [bg, title]);
    this.container.setDepth(210).setScrollFactor(0).setVisible(false);
  }

  get visible(): boolean {
    return this.container.visible;
  }

  toggle(): void {
    if (this.container.visible) this.hide();
    else this.show();
  }

  private show(): void {
    // limpiar items previos (todo menos bg + título)
    while (this.container.length > 2) this.container.removeAt(2, true);
    const items = this.inventory.list();
    if (items.length === 0) {
      this.container.add(this.scene.add.text(0, 0, "(vacía)", { color: "#888", fontSize: "12px" }).setOrigin(0.5));
    } else {
      items.forEach((it, i) => {
        const label = `${it.def.name}${it.def.stackable ? ` x${it.qty}` : ""}`;
        const t = this.scene.add.text(-95, -60 + i * 22, `• ${label}`, {
          color: it.def.type === "narrative" ? "#ff9fce" : "#ffffff",
          fontSize: "12px",
        });
        this.container.add(t);
      });
    }
    this.container.setVisible(true);
  }

  private hide(): void {
    this.container.setVisible(false);
  }
}
```

- [ ] **Step 2: Instanciar en `HudScene`**

Import y campo:

```typescript
import { InventoryPanel } from "../ui/InventoryPanel";
// ...
  inventoryPanel!: InventoryPanel;
```

Al final de `create()`:

```typescript
    this.inventoryPanel = new InventoryPanel(this, this.lab.inventory);
    this.input.keyboard!.addKey("I").on("down", () => this.inventoryPanel.toggle());
```

- [ ] **Step 3: Dar items iniciales de prueba en `LabScene.create()`**

```typescript
    this.inventory.add("photo_pareja", 1);
    this.inventory.add("medkit", 2);
```

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`
Expected: con **I** se abre/cierra la Mochila; muestra "Foto de Ale e Iara" (en rosa, narrativo) y "Botiquín x2".

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: InventoryPanel UI (Mochila) conectado al InventoryModel"
```

---

## Task 17: Guardar / Cargar conectado al juego

**Files:**
- Modify: `src/scenes/LabScene.ts`

- [ ] **Step 1: Añadir métodos de serialización/restauración a `LabScene`**

Imports:

```typescript
import { SaveSystem } from "../systems/SaveSystem";
import { SAVE_VERSION } from "../config";
import type { SaveState } from "../types";
```

Métodos en la clase:

```typescript
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
    const t = this.add.text(this.scale.width / 2, 40, msg, {
      color: "#ffffff", fontSize: "14px", backgroundColor: "#000000c0",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
    this.time.delayedCall(1200, () => t.destroy());
  }
```

> Nota: `ProgressionModel`/`InventoryModel` ya están importados desde Task 14. Confirmá que los imports existen.

- [ ] **Step 2: Teclas de guardar/cargar (F5/F9) en `create()`**

```typescript
    this.input.keyboard!.addKey("F5").on("down", () => this.saveGame());
    this.input.keyboard!.addKey("F9").on("down", () => this.loadGame());
```

- [ ] **Step 3: Verificación manual**

Run: `npm run dev`
Pasos: mover a Iara, matar un zombie (subir algo de XP), abrir Mochila, apretar **F5** (aparece "Partida guardada"). Refrescar el navegador, apretar **F9**.
Expected: Iara reaparece en la posición guardada, con el mismo Nv/PS e inventario. (El navegador puede bloquear F5; si pasa, en Task 18 lo movemos a una tecla normal.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: guardar/cargar partida conectado al estado del juego"
```

---

## Task 18: Panel de debug del laboratorio

**Files:**
- Modify: `src/scenes/LabScene.ts`

> Centraliza atajos de prueba y los muestra en pantalla. Reemplaza/centraliza las teclas sueltas de tareas anteriores. Mueve guardar/cargar a G/L para evitar el conflicto de F5 del navegador.

- [ ] **Step 1: Añadir un cartel de ayuda y atajos de debug en `create()`**

Reemplazar el texto de ayuda existente por un bloque multilínea y registrar las teclas:

```typescript
    const help = [
      "WASD/flechas: mover · SHIFT: correr · ESPACIO: atacar",
      "Z: spawn zombie · X: +50 XP · C: -10 PS · V: curar(+20)",
      "I: mochila · T: diálogo · G: guardar · L: cargar",
    ].join("\n");
    this.add.text(8, 28, help, { color: "#dddddd", fontSize: "11px", backgroundColor: "#00000080" })
      .setPadding(4).setScrollFactor(0).setDepth(100);

    const kb = this.input.keyboard!;
    kb.addKey("Z").on("down", () => this.spawnZombie(
      Phaser.Math.Between(2 * TILE, 18 * TILE),
      Phaser.Math.Between(2 * TILE, 13 * TILE),
    ));
    kb.addKey("X").on("down", () => this.events.emit("xp-gained", 50));
    kb.addKey("C").on("down", () => this.events.emit("player-damaged", 10));
    kb.addKey("V").on("down", () => {
      this.ps = Math.min(this.progression.psMax(), this.ps + 20);
      this.events.emit("hud-update");
    });
    kb.addKey("G").on("down", () => this.saveGame());
    kb.addKey("L").on("down", () => this.loadGame());
```

- [ ] **Step 2: Quitar el spawn fijo de zombie de prueba**

Eliminar la línea `this.spawnZombie(4 * TILE, 4 * TILE);` de Task 13 (ahora se spawnea con **Z**). Eliminar también las teclas F5/F9 de Task 17 (reemplazadas por G/L) y la tecla **T** suelta si quedó duplicada fuera de este bloque.

- [ ] **Step 3: Verificación manual (recorrido completo del laboratorio)**

Run: `npm run dev`
Checklist (todo debe funcionar):
- Moverse, correr, chocar paredes.
- **Z** spawnea zombies que persiguen lento; **ESPACIO** los mata (parpadean y mueren).
- Al recibir golpes baja la barra de PS; con **C** baja a mano; con **V** se cura.
- **X** da XP y sube de nivel (cambia Nv. y PS máx).
- **I** abre la Mochila con la foto y los botiquines.
- **T** abre un diálogo con opciones.
- **G** guarda, refrescar, **L** carga y restaura todo.

- [ ] **Step 4: Correr toda la suite de tests**

Run: `npm test`
Expected: todos los tests PASS.

- [ ] **Step 5: Verificar build de producción**

Run: `npm run build`
Expected: compila sin errores de tipos y genera `dist/`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: panel de debug del laboratorio + recorrido completo"
```

---

## Definition of Done (Fase A)

- [ ] `npm test` pasa (progression, inventory, save, dialogue, zombieBrain, smoke).
- [ ] `npm run build` compila sin errores.
- [ ] El laboratorio es jugable: movimiento, sprint, colisiones, combate cuerpo a cuerpo, zombies con IA lenta, daño/muerte/respawn, XP/niveles, Mochila con items narrativos, diálogos con opciones, y guardar/cargar.
- [ ] La capa de assets es placeholder y está aislada (swap a LimeZu = reemplazar texturas en Preload + sprites de entidades, sin tocar la lógica).
- [ ] Todo commiteado.

## Próximo (Fase B — su propio plan)
Modo historia "El comienzo": tilemap real del depto (Tiled), intro nocturna scripteada, llamadas/eventos, gatos interactuables, brote, primera arma narrativa y cliffhanger en la puerta del edificio. Y, en paralelo, swap a assets LimeZu.

import type { ZombieKind } from "../entities/Zombie";

export interface WaveHooks {
  spawn: (kind: ZombieKind, x: number, y: number) => void;
  randomSpawnPoint: () => { x: number; y: number };
}

/**
 * Disparador de oleadas para MODO HISTORIA: no aparece nada solo. Se llama a
 * `trigger(size)` en el momento que el guión (o el diseñador) lo decide, y la
 * oleada se spawnea de a poco. Sin loop automático ni intermedios.
 */
export class WaveManager {
  private queue: ZombieKind[] = [];
  private timer = 0;
  /** Cantidad de oleadas disparadas hasta ahora (sube la dificultad por defecto). */
  wavesTriggered = 0;

  constructor(private hooks: WaveHooks, private gap = 350) {}

  /** Dispara una oleada de `size` zombies. `difficulty` define la mezcla. */
  trigger(size = 8, difficulty = this.wavesTriggered + 1): void {
    this.wavesTriggered += 1;
    this.queue.push(...this.compose(size, difficulty));
  }

  get pending(): number {
    return this.queue.length;
  }

  update(dt: number): void {
    if (this.queue.length === 0) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      const kind = this.queue.shift()!;
      const p = this.hooks.randomSpawnPoint();
      this.hooks.spawn(kind, p.x, p.y);
      this.timer = this.gap;
    }
  }

  /** Composición de la oleada: corredores desde dificultad 2, brutos desde 3. */
  private compose(size: number, difficulty: number): ZombieKind[] {
    const list: ZombieKind[] = [];
    for (let i = 0; i < size; i++) {
      const r = Math.random();
      if (difficulty >= 3 && r < 0.15) list.push("brute");
      else if (difficulty >= 2 && r < 0.4) list.push("runner");
      else list.push("walker");
    }
    return list;
  }
}

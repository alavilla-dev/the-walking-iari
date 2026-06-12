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

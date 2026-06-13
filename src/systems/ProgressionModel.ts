import {
  PLAYER_BASE_PS,
  PS_PER_LEVEL,
  XP_PER_LEVEL_FACTOR,
  SKILL_POINTS_PER_LEVEL,
  AIM_BASE,
  AIM_GROWTH,
  AIM_MAX,
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

  /** Puntería 0..1 según el nivel (arranca mala, mejora con cada nivel). */
  aim(): number {
    return Math.min(AIM_MAX, AIM_BASE + (this.level - 1) * AIM_GROWTH);
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

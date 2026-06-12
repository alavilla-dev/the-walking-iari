import type Phaser from "phaser";
import type { ProgressionModel } from "../systems/ProgressionModel";
import type { InventoryModel } from "../systems/InventoryModel";

export interface HudInfo {
  /** Nombre del personaje (panel inferior izq). */
  name: string;
  gender: "F" | "M";
  /** Lugar (caja superior izq), línea 1. */
  place: string;
  /** Subtítulo del lugar (línea 2). */
  subtitle: string;
}

/**
 * Cualquier escena de juego que el HUD pueda observar. Tanto LabScene como
 * ApartmentScene la implementan, así el HUD es agnóstico de la escena.
 */
export type GameHost = Phaser.Scene & {
  progression: ProgressionModel;
  inventory: InventoryModel;
  ps: number;
  hudInfo: HudInfo;
};

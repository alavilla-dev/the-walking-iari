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
  /** Objetivo actual que muestra el Diario (línea de misión). */
  objective?: string;
}

/** Arma equipada que muestra el HUD (panel inferior derecho). */
export interface WeaponHud {
  id: string;
  name: string;
  icon: string;
  kind: "melee" | "ranged";
  mag?: number;     // balas en el cargador (sólo de fuego)
  reserve?: number; // munición de reserva
  reloading?: boolean;
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
  /** Persiste el estado actual al slot dado (lo invoca el menú "Guardar" del HUD). */
  saveGame(slot?: number): void;
  /** Arma equipada (si la escena tiene combate); el HUD la muestra a la derecha. */
  weaponInfo?(): WeaponHud | null;
  /** Equipa un arma por id (desde la Mochila). Devuelve true si pudo. */
  equipWeapon?(id: string): boolean;
  /** Usa un consumible por id (botiquín, etc.) desde la Mochila. */
  useItem?(id: string): void;
};

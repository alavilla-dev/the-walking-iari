export type WeaponKind = "melee" | "ranged";

export interface WeaponDef {
  id: string;
  name: string;
  kind: WeaponKind;
  damage: number;
  cooldown: number;        // ms entre usos
  knockback: number;
  icon: string;            // textura del ícono (HUD)
  // melee
  range?: number;          // alcance del golpe (px)
  // ranged
  magSize?: number;        // balas por cargador
  reserve?: number;        // munición de reserva inicial
  pellets?: number;        // proyectiles por disparo (escopeta)
  spreadDeg?: number;      // dispersión propia del arma (se suma a la puntería)
  reloadMs?: number;       // tiempo de recarga
  sfx?: "pistol" | "shotgun"; // perfil de sonido del disparo
}

export const WEAPONS: Record<string, WeaponDef> = {
  knife: {
    id: "knife", name: "Cuchillo", kind: "melee", icon: "ic_knife",
    damage: 22, cooldown: 300, knockback: 120, range: 38,
  },
  bat: {
    id: "bat", name: "Bate", kind: "melee", icon: "ic_bat",
    damage: 40, cooldown: 560, knockback: 300, range: 46,
  },
  pistol: {
    id: "pistol", name: "Pistola", kind: "ranged", icon: "ic_pistol",
    damage: 18, cooldown: 240, knockback: 160,
    magSize: 12, reserve: 48, pellets: 1, spreadDeg: 0, reloadMs: 850, sfx: "pistol",
  },
  shotgun: {
    id: "shotgun", name: "Escopeta", kind: "ranged", icon: "ic_shotgun",
    damage: 10, cooldown: 720, knockback: 90,
    magSize: 6, reserve: 24, pellets: 6, spreadDeg: 9, reloadMs: 1300, sfx: "shotgun",
  },
};

/** Orden de los slots (teclas 1..N). */
export const WEAPON_SLOTS = ["knife", "bat", "pistol", "shotgun"];

export function getWeapon(id: string): WeaponDef {
  const w = WEAPONS[id];
  if (!w) throw new Error(`Arma desconocida: ${id}`);
  return w;
}

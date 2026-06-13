import { getWeapon, type WeaponDef } from "../data/weapons";

interface AmmoState { mag: number; reserve: number; }

/**
 * Armas que lleva Iara: slots, arma equipada y munición/recarga de las de fuego.
 * El cuchillo/bate no usan munición. Las de fuego tienen cargador + reserva.
 * Se arranca con un set inicial y se van consiguiendo más (loot) con `acquire`.
 */
export class Loadout {
  readonly slots: string[] = [];
  index = 0;
  private ammo: Record<string, AmmoState> = {};
  reloading = false;

  constructor(slots: string[] = ["knife"]) {
    for (const id of slots) this.acquire(id);
  }

  has(id: string): boolean {
    return this.slots.includes(id);
  }

  /** Agrega un arma al loadout (loot). Devuelve true si era nueva. */
  acquire(id: string): boolean {
    if (this.has(id)) return false;
    const w = getWeapon(id);
    this.slots.push(id);
    if (w.kind === "ranged") this.ammo[id] = { mag: w.magSize ?? 0, reserve: w.reserve ?? 0 };
    return true;
  }

  current(): WeaponDef {
    return getWeapon(this.slots[this.index]);
  }

  select(i: number): boolean {
    if (i < 0 || i >= this.slots.length || i === this.index) return false;
    this.index = i;
    this.reloading = false;
    return true;
  }

  cycle(dir: number): void {
    this.index = (this.index + dir + this.slots.length) % this.slots.length;
    this.reloading = false;
  }

  /** Munición del arma actual (null si es melee). */
  ammoOf(id = this.slots[this.index]): AmmoState | null {
    return this.ammo[id] ?? null;
  }

  /** Suma `mags` cargadores de reserva a cada arma de fuego que tengas. Devuelve cuánto sumó. */
  refillAmmo(mags = 1): number {
    let added = 0;
    for (const id of this.slots) {
      const a = this.ammo[id];
      if (!a) continue;
      const inc = (getWeapon(id).magSize ?? 0) * mags;
      a.reserve += inc;
      added += inc;
    }
    return added;
  }

  /** ¿Puede disparar/golpear ahora? (las de fuego necesitan balas en cargador). */
  canFire(): boolean {
    const w = this.current();
    if (w.kind === "melee") return true;
    if (this.reloading) return false;
    return (this.ammo[w.id]?.mag ?? 0) > 0;
  }

  /** Consume una bala del cargador (si corresponde). */
  consume(): void {
    const w = this.current();
    if (w.kind === "ranged" && this.ammo[w.id]) this.ammo[w.id].mag = Math.max(0, this.ammo[w.id].mag - 1);
  }

  needsReload(): boolean {
    const w = this.current();
    if (w.kind !== "ranged") return false;
    const a = this.ammo[w.id];
    return !!a && a.mag < (w.magSize ?? 0) && a.reserve > 0;
  }

  /** Pasa balas de la reserva al cargador. Devuelve true si recargó algo. */
  reload(): boolean {
    const w = this.current();
    if (w.kind !== "ranged") return false;
    const a = this.ammo[w.id];
    if (!a) return false;
    const need = (w.magSize ?? 0) - a.mag;
    const take = Math.min(need, a.reserve);
    if (take <= 0) return false;
    a.mag += take;
    a.reserve -= take;
    return true;
  }
}

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

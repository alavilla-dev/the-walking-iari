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

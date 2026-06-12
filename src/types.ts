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

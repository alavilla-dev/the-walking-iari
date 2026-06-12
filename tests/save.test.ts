import { describe, it, expect, beforeEach } from "vitest";
import { SaveSystem } from "../src/systems/SaveSystem";
import type { SaveState } from "../src/types";

function sampleState(): SaveState {
  return {
    version: 1,
    savedAt: 123,
    player: { x: 10, y: 20, ps: 18 },
    progression: { level: 2, xp: 30, skillPoints: 1 },
    inventory: [{ id: "medkit", qty: 2 }],
    flags: { intro_vista: true },
  };
}

describe("SaveSystem", () => {
  beforeEach(() => localStorage.clear());

  it("guarda y carga un slot", () => {
    SaveSystem.save(1, sampleState());
    const loaded = SaveSystem.load(1);
    expect(loaded).not.toBeNull();
    expect(loaded!.player.ps).toBe(18);
    expect(loaded!.inventory[0].id).toBe("medkit");
  });

  it("devuelve null si el slot está vacío", () => {
    expect(SaveSystem.load(3)).toBeNull();
  });

  it("lista slots ocupados", () => {
    SaveSystem.save(1, sampleState());
    SaveSystem.save(2, sampleState());
    expect(SaveSystem.listSlots().sort()).toEqual([1, 2]);
  });

  it("borra un slot", () => {
    SaveSystem.save(1, sampleState());
    SaveSystem.delete(1);
    expect(SaveSystem.load(1)).toBeNull();
  });

  it("devuelve null si el JSON está corrupto", () => {
    localStorage.setItem("twi_save_1", "{ no es json");
    expect(SaveSystem.load(1)).toBeNull();
  });
});

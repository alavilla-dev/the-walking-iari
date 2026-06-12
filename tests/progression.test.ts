import { describe, it, expect } from "vitest";
import { ProgressionModel } from "../src/systems/ProgressionModel";

describe("ProgressionModel", () => {
  it("nivel 1 arranca con PS max base y sin xp", () => {
    const p = new ProgressionModel();
    expect(p.level).toBe(1);
    expect(p.xp).toBe(0);
    expect(p.psMax()).toBe(20);
    expect(p.skillPoints).toBe(0);
  });

  it("xpToNext escala con el nivel", () => {
    const p = new ProgressionModel();
    expect(p.xpToNext()).toBe(50); // 1 * 50
  });

  it("sube de nivel al alcanzar el umbral y otorga PS y skill point", () => {
    const p = new ProgressionModel();
    const events = p.addXp(50);
    expect(p.level).toBe(2);
    expect(p.xp).toBe(0);
    expect(p.psMax()).toBe(25);
    expect(p.skillPoints).toBe(1);
    expect(events.leveledUp).toBe(true);
    expect(events.levelsGained).toBe(1);
  });

  it("acumula xp parcial sin subir de nivel", () => {
    const p = new ProgressionModel();
    const events = p.addXp(30);
    expect(p.level).toBe(1);
    expect(p.xp).toBe(30);
    expect(events.leveledUp).toBe(false);
  });

  it("maneja múltiples niveles de un solo golpe", () => {
    const p = new ProgressionModel();
    // L1->L2 cuesta 50, L2->L3 cuesta 100 => 150 total = exactamente nivel 3
    const events = p.addXp(150);
    expect(p.level).toBe(3);
    expect(p.xp).toBe(0);
    expect(events.levelsGained).toBe(2);
  });

  it("serializa y restaura su estado", () => {
    const p = new ProgressionModel();
    p.addXp(70); // L2 con 20 xp
    const state = p.toState();
    const p2 = ProgressionModel.fromState(state);
    expect(p2.level).toBe(2);
    expect(p2.xp).toBe(20);
  });
});

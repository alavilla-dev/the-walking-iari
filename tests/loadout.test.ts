import { describe, it, expect } from "vitest";
import { Loadout } from "../src/systems/Loadout";

describe("Loadout", () => {
  it("arranca con el primer slot equipado", () => {
    const l = new Loadout(["knife", "pistol"]);
    expect(l.current().id).toBe("knife");
  });

  it("el cuchillo siempre puede usarse y no tiene munición", () => {
    const l = new Loadout(["knife"]);
    expect(l.canFire()).toBe(true);
    expect(l.ammoOf()).toBeNull();
  });

  it("la pistola consume balas y no dispara con el cargador vacío", () => {
    const l = new Loadout(["pistol"]);
    const mag = l.ammoOf()!.mag;
    for (let i = 0; i < mag; i++) {
      expect(l.canFire()).toBe(true);
      l.consume();
    }
    expect(l.canFire()).toBe(false);
  });

  it("recargar pasa balas de la reserva al cargador", () => {
    const l = new Loadout(["pistol"]);
    const a = l.ammoOf()!;
    const reserveBefore = a.reserve;
    a.mag = 0;
    expect(l.needsReload()).toBe(true);
    expect(l.reload()).toBe(true);
    expect(l.ammoOf()!.mag).toBeGreaterThan(0);
    expect(l.ammoOf()!.reserve).toBeLessThan(reserveBefore);
  });

  it("cambia de arma con select y cycle (con wrap)", () => {
    const l = new Loadout(["knife", "pistol", "shotgun"]);
    expect(l.select(2)).toBe(true);
    expect(l.current().id).toBe("shotgun");
    l.cycle(1);
    expect(l.current().id).toBe("knife");
    l.cycle(-1);
    expect(l.current().id).toBe("shotgun");
  });
});

import { describe, it, expect } from "vitest";
import { InventoryModel } from "../src/systems/InventoryModel";

describe("InventoryModel", () => {
  it("agrega un item y lo cuenta", () => {
    const inv = new InventoryModel();
    inv.add("medkit", 2);
    expect(inv.count("medkit")).toBe(2);
    expect(inv.has("medkit")).toBe(true);
  });

  it("apila items stackables y no-stackables máximo 1", () => {
    const inv = new InventoryModel();
    inv.add("medkit", 1);
    inv.add("medkit", 3);
    expect(inv.count("medkit")).toBe(4);
    inv.add("knife", 1);
    inv.add("knife", 1);
    expect(inv.count("knife")).toBe(1); // no stackable
  });

  it("remueve items y limpia entradas vacías", () => {
    const inv = new InventoryModel();
    inv.add("medkit", 2);
    expect(inv.remove("medkit", 1)).toBe(true);
    expect(inv.count("medkit")).toBe(1);
    expect(inv.remove("medkit", 5)).toBe(false); // no alcanza
    expect(inv.count("medkit")).toBe(1);
    expect(inv.remove("medkit", 1)).toBe(true);
    expect(inv.has("medkit")).toBe(false);
  });

  it("lista entradas con su definición", () => {
    const inv = new InventoryModel();
    inv.add("photo_pareja", 1);
    const list = inv.list();
    expect(list).toHaveLength(1);
    expect(list[0].def.name).toBe("Foto de Ale e Iara");
    expect(list[0].qty).toBe(1);
  });

  it("serializa y restaura", () => {
    const inv = new InventoryModel();
    inv.add("medkit", 2);
    inv.add("knife", 1);
    const inv2 = InventoryModel.fromState(inv.toState());
    expect(inv2.count("medkit")).toBe(2);
    expect(inv2.count("knife")).toBe(1);
  });
});

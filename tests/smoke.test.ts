import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("el entorno de test corre", () => {
    expect(1 + 1).toBe(2);
  });
  it("localStorage existe (jsdom)", () => {
    localStorage.setItem("k", "v");
    expect(localStorage.getItem("k")).toBe("v");
  });
});

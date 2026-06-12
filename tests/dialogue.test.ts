import { describe, it, expect } from "vitest";
import { DialogueRunner } from "../src/systems/DialogueRunner";
import { sampleDialogue } from "../src/data/sampleDialogue";

describe("DialogueRunner", () => {
  it("arranca en el nodo inicial", () => {
    const r = new DialogueRunner(sampleDialogue);
    r.start("start");
    expect(r.current()?.speaker).toBe("Iara");
    expect(r.current()?.text).toContain("laboratorio");
    expect(r.isFinished()).toBe(false);
  });

  it("elegir una opción navega al nodo destino", () => {
    const r = new DialogueRunner(sampleDialogue);
    r.start("start");
    r.choose(0); // "¡Dale!" -> "si"
    expect(r.current()?.id).toBe("si");
  });

  it("avanzar un nodo sin opciones con next null termina", () => {
    const r = new DialogueRunner(sampleDialogue);
    r.start("si");
    r.advance();
    expect(r.isFinished()).toBe(true);
    expect(r.current()).toBeNull();
  });

  it("hasOptions distingue nodos de elección", () => {
    const r = new DialogueRunner(sampleDialogue);
    r.start("start");
    expect(r.hasOptions()).toBe(true);
    r.choose(1);
    expect(r.hasOptions()).toBe(false);
  });
});

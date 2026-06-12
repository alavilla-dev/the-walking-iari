import { describe, it, expect } from "vitest";
import { ZombieBrain } from "../src/systems/ZombieBrain";

describe("ZombieBrain", () => {
  it("arranca en IDLE", () => {
    const b = new ZombieBrain();
    expect(b.state).toBe("idle");
  });

  it("pasa a CHASE cuando el jugador entra en rango de persecución", () => {
    const b = new ZombieBrain();
    const action = b.decide({ distance: 150, attackCooldownReady: true });
    expect(b.state).toBe("chase");
    expect(action.move).toBe(true);
  });

  it("pasa a ATTACK en rango de ataque y respeta cooldown", () => {
    const b = new ZombieBrain();
    const a1 = b.decide({ distance: 20, attackCooldownReady: true });
    expect(b.state).toBe("attack");
    expect(a1.attack).toBe(true);
    const a2 = b.decide({ distance: 20, attackCooldownReady: false });
    expect(a2.attack).toBe(false); // en cooldown no pega
  });

  it("vuelve a IDLE si el jugador sale del rango", () => {
    const b = new ZombieBrain();
    b.decide({ distance: 150, attackCooldownReady: true });
    b.decide({ distance: 999, attackCooldownReady: true });
    expect(b.state).toBe("idle");
  });
});

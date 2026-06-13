import { describe, it, expect } from "vitest";
import { WaveManager } from "../src/systems/WaveManager";

function makeManager() {
  const state = { spawned: [] as string[] };
  const wm = new WaveManager({
    spawn: (kind) => { state.spawned.push(kind); },
    randomSpawnPoint: () => ({ x: 0, y: 0 }),
  });
  return { wm, state };
}

describe("WaveManager (modo historia: disparable)", () => {
  it("no spawnea nada por sí solo", () => {
    const { wm, state } = makeManager();
    for (let i = 0; i < 50; i++) wm.update(400);
    expect(state.spawned.length).toBe(0);
  });

  it("al disparar una oleada, spawnea esa cantidad con el tiempo", () => {
    const { wm, state } = makeManager();
    wm.trigger(5);
    expect(wm.pending).toBe(5);
    for (let i = 0; i < 40; i++) wm.update(400);
    expect(state.spawned.length).toBe(5);
    expect(wm.pending).toBe(0);
  });

  it("cuenta las oleadas disparadas", () => {
    const { wm } = makeManager();
    wm.trigger(3);
    wm.trigger(3);
    expect(wm.wavesTriggered).toBe(2);
  });
});

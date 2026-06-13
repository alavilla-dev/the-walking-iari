/**
 * example.ts — Ejemplo mínimo de integración del Look System.
 *
 * Necesitás un <canvas id="game"> en tu HTML. Compilá con tu bundler
 * (Vite, esbuild, tsc...) e importá este archivo.
 *
 *   <canvas id="game" width="800" height="600"></canvas>
 *   <script type="module" src="/example.ts"></script>
 */

import { Character, spawn, attachKeyboard, CHARACTERS, NPCS, ZOMBIES, type Direction } from "./characters";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;          // pixel-art nítido
canvas.style.imageRendering = "pixelated";

const SCALE = 3;

// --- Jugador (héroe) -------------------------------------------------------
const player: Character = spawn("hero_iara", canvas.width / 2, canvas.height / 2, {
  scale: SCALE, speed: 80, runSpeed: 150,
});
attachKeyboard(player);   // flechas/WASD mover · Shift correr · Espacio disparar · J cuchillo

// --- Zombies y NPCs que deambulan -----------------------------------------
interface Wanderer { ch: Character; timer: number; }
const wanderers: Wanderer[] = [];

function randDir(): Direction {
  return (["up", "down", "left", "right"] as Direction[])[Math.floor(Math.random() * 4)];
}

function addWanderer(id: string) {
  const ch = spawn(id, Math.random() * canvas.width, Math.random() * canvas.height, { scale: SCALE, speed: 35 });
  wanderers.push({ ch, timer: 0 });
}

// 5 zombies y 6 NPCs al azar
for (let i = 0; i < 5; i++) addWanderer(ZOMBIES[Math.floor(Math.random() * ZOMBIES.length)].id);
for (let i = 0; i < 6; i++) addWanderer(NPCS[Math.floor(Math.random() * NPCS.length)].id);

// IA tonta: cada tanto cambian de dirección o se quedan quietos
function steer(w: Wanderer, dt: number) {
  w.timer -= dt;
  if (w.timer <= 0) {
    w.timer = 1 + Math.random() * 2;
    (["up", "down", "left", "right"] as Direction[]).forEach((d) => w.ch.release(d));
    if (Math.random() > 0.35) w.ch.press(randDir());   // 65% se mueve, 35% se queda quieto
  }
}

// --- Loop ------------------------------------------------------------------
let last = performance.now();
function frame(now: number) {
  const dt = (now - last) / 1000;
  last = now;

  player.update(dt);
  player.clamp(0, 0, canvas.width, canvas.height);

  for (const w of wanderers) {
    steer(w, dt);
    w.ch.update(dt);
    w.ch.clamp(0, 0, canvas.width, canvas.height);
  }

  // dibujar
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#33421f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // orden por profundidad: los de "y" menor se dibujan primero (quedan detrás)
  const all = [player, ...wanderers.map((w) => w.ch)].sort((a, b) => a.y - b.y);
  for (const c of all) c.draw(ctx);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// (opcional) lista de todos los ids disponibles para tu editor de niveles:
// console.log(Object.keys(CHARACTERS));

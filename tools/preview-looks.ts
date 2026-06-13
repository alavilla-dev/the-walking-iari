/**
 * Renderiza personajes del Look System a un PNG usando un shim mínimo de
 * Canvas2D (solo soporta translate/scale/fillStyle/fillRect, que es todo lo que
 * usa drawCharacter). Sirve para verificar el look sin abrir el juego.
 *
 *   npx vite-node tools/preview-looks.ts
 */
import { PNG } from "pngjs";
import fs from "fs";
import { drawCharacter, CHARACTERS, SPRITE_W, SPRITE_H } from "../src/look/characters";
import type { Direction, AnimState } from "../src/look/characters";

class MiniCtx {
  buf: Uint8ClampedArray;
  a = 1; d = 1; e = 0; f = 0;
  private stack: number[][] = [];
  fillStyle = "#000000";
  imageSmoothingEnabled = false;
  constructor(public W: number, public H: number) { this.buf = new Uint8ClampedArray(W * H * 4); }
  save() { this.stack.push([this.a, this.d, this.e, this.f]); }
  restore() { const s = this.stack.pop(); if (s) [this.a, this.d, this.e, this.f] = s; }
  translate(x: number, y: number) { this.e += this.a * x; this.f += this.d * y; }
  scale(x: number, y: number) { this.a *= x; this.d *= y; }
  private parse(s: string): [number, number, number, number] {
    if (s[0] === "#") {
      const n = parseInt(s.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
    }
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(",").map((v) => parseFloat(v)); return [p[0], p[1], p[2], p[3] ?? 1]; }
    return [255, 0, 255, 1];
  }
  fillRect(x: number, y: number, w: number, h: number) {
    const X0 = this.a * x + this.e, X1 = this.a * (x + w) + this.e;
    const Y0 = this.d * y + this.f, Y1 = this.d * (y + h) + this.f;
    const l = Math.round(Math.min(X0, X1)), r = Math.round(Math.max(X0, X1));
    const t = Math.round(Math.min(Y0, Y1)), b = Math.round(Math.max(Y0, Y1));
    const [cr, cg, cb, ca] = this.parse(this.fillStyle);
    for (let py = Math.max(0, t); py < Math.min(this.H, b); py++) {
      for (let px = Math.max(0, l); px < Math.min(this.W, r); px++) {
        const i = (py * this.W + px) * 4;
        const na = 1 - ca;
        this.buf[i] = cr * ca + this.buf[i] * na;
        this.buf[i + 1] = cg * ca + this.buf[i + 1] * na;
        this.buf[i + 2] = cb * ca + this.buf[i + 2] * na;
        this.buf[i + 3] = Math.min(255, this.buf[i + 3] + ca * 255);
      }
  }
  }
}

const SCALE = 5;
const cw = SPRITE_W * SCALE, ch = SPRITE_H * SCALE;
const PAD = 12;

// Filas: (id, [poses]) — cada pose = [dir, state, t]
const rows: [string, [Direction, AnimState, number][]][] = [
  ["hero_iara", [["down", "idle", 0], ["left", "walk", 0.3], ["up", "walk", 0.3], ["right", "run", 0.2], ["down", "shoot", 0.1], ["down", "knife", 0.1]]],
  ["hero_alejandro", [["down", "idle", 0], ["left", "walk", 0.3], ["up", "walk", 0.3], ["right", "run", 0.2], ["down", "shoot", 0.1], ["down", "knife", 0.1]]],
  ["z_oficinista", [["down", "idle", 0], ["left", "walk", 0.3], ["up", "walk", 0.5], ["right", "walk", 0.7], ["down", "walk", 0.2], ["down", "walk", 0.9]]],
  ["z_corredor", [["down", "idle", 0], ["left", "walk", 0.3], ["up", "walk", 0.5], ["right", "walk", 0.7], ["down", "walk", 0.2], ["down", "walk", 0.9]]],
  ["z_obrero", [["down", "idle", 0], ["left", "walk", 0.3], ["up", "walk", 0.5], ["right", "walk", 0.7], ["down", "walk", 0.2], ["down", "walk", 0.9]]],
];

const cols = Math.max(...rows.map((r) => r[1].length));
const W = PAD + cols * (cw + PAD);
const H = PAD + rows.length * (ch + PAD);
const ctx = new MiniCtx(W, H);
// fondo
for (let i = 0; i < W * H; i++) { ctx.buf[i * 4] = 0x2a; ctx.buf[i * 4 + 1] = 0x2c; ctx.buf[i * 4 + 2] = 0x34; ctx.buf[i * 4 + 3] = 0xff; }

rows.forEach(([id, poses], ri) => {
  poses.forEach(([dir, state, t], ci) => {
    const x = PAD + ci * (cw + PAD);
    const y = PAD + ri * (ch + PAD);
    drawCharacter(ctx as unknown as CanvasRenderingContext2D, CHARACTERS[id], dir, state, t, SCALE, x, y);
  });
});

const png = new PNG({ width: W, height: H });
png.data.set(ctx.buf);
fs.writeFileSync("preview-looks.png", PNG.sync.write(png));
console.log("OK -> preview-looks.png", `${W}x${H}`);

import Phaser from "phaser";
import { VISION_RADIUS, FOG_DIM } from "../config";

const DARK = 0x05060a;
const BRUSH_KEY = "fog_cone";
const HALF_ANGLE = 1.0;   // semiapertura del cono (rad) ≈ 57°
const AMBIENT = 0.42;     // fracción del radio que se ve siempre alrededor de Iara

/**
 * Pincel de "linterna": un cono suave hacia +x más un círculo ambiente chico
 * alrededor del centro. Bordes difuminados (smoothstep). Se rota según hacia
 * dónde mira Iara al estampar.
 */
function ensureConeBrush(scene: Phaser.Scene, r: number): void {
  if (scene.textures.exists(BRUSH_KEY)) return;
  const d = r * 2;
  const canvas = document.createElement("canvas");
  canvas.width = d; canvas.height = d;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(d, d);
  const r0 = r * AMBIENT;
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const dx = x - r, dy = y - r;
      const dist = Math.hypot(dx, dy);
      const amb = Math.max(0, 1 - dist / r0);
      const ang = Math.abs(Math.atan2(dy, dx));               // 0 = +x (adelante)
      const angW = Math.max(0, 1 - ang / HALF_ANGLE);
      const radW = Math.max(0, 1 - dist / r);
      let inten = Math.max(amb, angW * radW);
      inten = inten * inten * (3 - 2 * inten);                // smoothstep → difuso
      const i = (y * d + x) << 2;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(inten * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.addCanvas(BRUSH_KEY, canvas);
}

/**
 * Niebla de descubrimiento estilo Project Zomboid sobre un rectángulo de mundo.
 *  - `memory`: negro total; se revela de forma PERMANENTE por donde Iara mira.
 *  - `sight`:  penumbra que se redibuja cada frame y se aclara en su cono de visión.
 * La visión apunta hacia donde mira Iara y tiene bordes difuminados.
 */
export class FogOfWar {
  private memory: Phaser.GameObjects.RenderTexture;
  private sight: Phaser.GameObjects.RenderTexture;
  private brush: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, private x: number, private y: number, w: number, h: number) {
    ensureConeBrush(scene, VISION_RADIUS);
    this.brush = scene.make.image({ key: BRUSH_KEY }, false); // fuera del display list, sólo para estampar
    this.memory = scene.add.renderTexture(x, y, w, h).setOrigin(0, 0).setDepth(600);
    this.memory.fill(DARK, 1);
    this.sight = scene.add.renderTexture(x, y, w, h).setOrigin(0, 0).setDepth(601);
  }

  /** Llamar cada frame con la posición (mundo) y el ángulo de mirada de Iara. */
  reveal(px: number, py: number, facingAngle: number): void {
    const lx = px - this.x, ly = py - this.y;
    this.brush.setRotation(facingAngle);
    this.memory.erase(this.brush, lx, ly);
    this.sight.clear();
    this.sight.fill(DARK, FOG_DIM);
    this.sight.erase(this.brush, lx, ly);
  }

  destroy(): void {
    this.memory.destroy();
    this.sight.destroy();
    this.brush.destroy();
  }
}

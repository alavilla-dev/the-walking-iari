import Phaser from "phaser";
import { TILE } from "../config";

/**
 * Texturas placeholder de PIXEL-ART dibujadas por código.
 * Mucho mejor que rectángulos, pero el look final viene del swap a LimeZu
 * (reemplazar estas texturas por sprite sheets en PreloadScene, sin tocar lógica).
 */

type Palette = Record<string, number>;

/** Pinta un mapa de pixeles (filas de caracteres) en el graphics. '.' / ' ' = transparente. */
function drawPixels(
  g: Phaser.GameObjects.Graphics,
  rows: string[],
  pal: Palette,
  px: number,
  ox = 0,
  oy = 0,
): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = pal[row[x]];
      if (color === undefined) continue;
      g.fillStyle(color, 1).fillRect(ox + x * px, oy + y * px, px, px);
    }
  }
}

// Paleta compartida de personajes
const PAL: Palette = {
  H: 0xd1603a, // pelo colorado
  h: 0xa84a2a, // pelo sombra
  S: 0xffd9b3, // piel
  E: 0x2a2018, // ojos
  B: 0x26262e, // top negro
  P: 0x3a5a8a, // jeans
  O: 0x1a1a1a, // zapatos
  // zombie
  g: 0x6a9a3a,
  d: 0x4a7026,
  R: 0x7a2a2a,
  Z: 0x3a4a3a, // ropa zombie
  z: 0x2a3a2a,
  // gato
  w: 0xeeeeee,
  s: 0xcccccc,
  e: 0x333333,
  n: 0xff9fb0,
  k: 0x1a1a24, // fondo retrato
};

const ZOMBIE = [
  "................",
  "................",
  ".....dggd.......",
  "....dggggd......",
  "....gggggg......",
  "....gRggRg......",
  "....gggggg......",
  ".....g gg.......",
  "...ZZZZZZZZ.....",
  "..gZZZZZZZZg....",
  "..gZZZZZZZZg....",
  "...ZZZZZZZZ.....",
  "...zzzzzzzz.....",
  "...zzz..zzz.....",
  "...zz....zz.....",
  "...dd....dd.....",
];

const CAT = [
  "w........w..",
  "ww......ww..",
  "wwwwwwwwww..",
  "weewwwweew..",
  "wwwwwwwwww..",
  "wwwwnnwwww..",
  "wwwwwwwwww..",
  "swwwwwwwws..",
  ".wwwwwwww...",
  ".s......s...",
];

export function createPlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // --- Piso de madera ---
  g.clear();
  g.fillStyle(0x6b4a32, 1).fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x7a5538, 1); // highlight superior de cada tabla
  g.fillRect(0, 0, TILE, 1); g.fillRect(0, 11, TILE, 1); g.fillRect(0, 22, TILE, 1);
  g.fillStyle(0x4a3322, 1); // separadores y vetas
  g.fillRect(0, 10, TILE, 1); g.fillRect(0, 21, TILE, 1);
  g.fillRect(16, 0, 1, 10); g.fillRect(8, 11, 1, 10);
  g.fillRect(24, 11, 1, 10); g.fillRect(16, 22, 1, 10);
  g.generateTexture("tile_floor", TILE, TILE);

  // --- Pared con zócalo ---
  g.clear();
  g.fillStyle(0x55556a, 1).fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x4a4a5c, 1); // paneles
  g.fillRect(8, 0, 1, 24); g.fillRect(24, 0, 1, 24);
  g.fillStyle(0x3a2a22, 1).fillRect(0, 24, TILE, 8); // zócalo
  g.fillStyle(0x6a6a7c, 1).fillRect(0, 24, TILE, 1); // brillo del zócalo
  g.generateTexture("tile_wall", TILE, TILE);

  // Iara ahora usa los sprites reales (public/iara_*.png), cargados en Preload.

  // --- Zombie ---
  g.clear();
  drawPixels(g, ZOMBIE, PAL, 2);
  g.generateTexture("zombie", 32, 32);

  // --- Gato ---
  g.clear();
  drawPixels(g, CAT, PAL, 2);
  g.generateTexture("cat", 24, 24);

  // Iara y su retrato ahora usan los sprites reales (public/iara_*.png, portrait_iara.png).

  g.destroy();
}

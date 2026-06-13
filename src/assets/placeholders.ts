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
  y: 0xcfe06a, // ojos enfermizos
  r: 0x8a1f1f, // herida
  // gato
  w: 0xeeeeee,
  s: 0xcccccc,
  e: 0x333333,
  n: 0xff9fb0,
  k: 0x1a1a24, // fondo retrato
};

// Paleta propia de los personajes (no comparte letras con la del zombie).
const CHAR_PAL: Palette = {
  H: 0xc24a28, h: 0x8f3318, J: 0xe2703f,       // pelo colorado (Iara)
  S: 0xf6c9a0, K: 0xdda276, f: 0xc97a4a,       // piel / sombra / peca
  E: 0x2a2018, m: 0xa8503f, W: 0xffffff,       // ojo / boca / blanco
  T: 0x2f7d72, t: 0x215a52,                    // top de Iara (verde agua)
  P: 0x35506f, p: 0x2a4159,                    // jeans
  O: 0x232026,                                 // zapatos
  D: 0x2b2622, d: 0x1c1814, b: 0x3a2a20,       // pelo/barba de Ale
  G: 0x586475, g: 0x434c59,                    // remera de Ale
};

// Iara: pelirroja, colitas con gomita, pecas (16x24 → 32x48 a px=2).
const IARA = [
  "................",
  ".....JHHHJ......",
  "...HHHHHHHHH....",
  "..HHHHHHHHHHH...",
  "..HHHSSSSSHHH...",
  ".JHHSSESSESSHHJ.",
  "HHhHSfSSSSfSHhHH",
  "HHhHSSSmmSSSHhHH",
  ".Hh.SSSSSSSS.hH.",
  ".hh..KSSSSK..hh.",
  ".hh.TTTTTTTT.hh.",
  "...TTTTTTTTTT...",
  "..STTTTTTTTTTS..",
  "..STTTTTTTTTTS..",
  "...TTTTTTTTTT...",
  "...PPPPPPPPPP...",
  "...PPPPPPPPPP...",
  "...PPPP..PPPP...",
  "...pppp..pppp...",
  "...OOOO..OOOO...",
  "..OOOOO..OOOOO..",
  "................",
  "................",
  "................",
];

// Ale: morocho con barba, peinado al costado (librito) (16x24 → 32x48).
const ALE = [
  "................",
  "....DDDDDD......",
  "...DDddDDDD.....",
  "..DDDdDDDDDD....",
  "..DDDSSSSDDD....",
  "..DDSSSSSSDD....",
  "..DSSESSESSD....",
  "..DSSSSSSSSD....",
  "...bSSSSSSb.....",
  "...bbSmmSbb.....",
  "....bbbbbb......",
  ".....bbbb.......",
  ".....SSSS.......",
  "..GGGGGGGGGGGG..",
  ".SGGGGGGGGGGGGS.",
  ".SGGGGGGGGGGGGS.",
  "..GGGGGGGGGGGG..",
  "..PPPPPPPPPPPP..",
  "..PPPPP..PPPPP..",
  "..PPPPP..PPPPP..",
  "..pppp....pppp..",
  "..OOOO....OOOO..",
  ".OOOOO....OOOOO.",
  "................",
];

// Íconos de armas para el HUD (16x12 → 32x24 a px=2).
const ICON_PAL: Palette = {
  M: 0xcfd2d8, n: 0x80848c, k: 0x26262b, w: 0x7a4a2a, y: 0xe0b54a,
};
const IC_KNIFE = [
  "................", "................", "................",
  "............MM..", ".kwwwwMMMMMMMM..", ".kwwwwMMMMMMM...",
  ".kwwwwMMMMM.....", "................", "................",
  "................", "................", "................",
];
const IC_PISTOL = [
  "................", "................", "................",
  "...MMMMMMMM.....", "...MnnnnnnM.....", "...Mk....MM.....",
  "...kk...........", "..kkk...........", "..kk............",
  "................", "................", "................",
];
const IC_SHOTGUN = [
  "................", "................", "................",
  "................", "..MMMMMMMMMMMM..", "..nMMMMMMMMMMn..",
  "www.k..........", "www............", "................",
  "................", "................", "................",
];
const IC_BAT = [
  "................", "................", "................",
  ".........MMMM...", "......MMMMMMMM..", ".wwwwwMMMMMMMM..",
  "......MMMMMMMM..", ".........MMMM...", "................",
  "................", "................", "................",
];

const ZOMBIE = [
  "................",
  ".....dggggd.....",
  ".....gggggg.....",
  ".....gyggyg.....",
  ".....gggggg.....",
  "......gddg......",
  "....ZZZZZZZZ....",
  "..gZZZrZZZZg....",
  "..gZZZZZZZZg....",
  "...ZZZZZZZZ.....",
  "...zzzzzzzz.....",
  "...zzz..zzz.....",
  "...OOO..OOO.....",
  "...OOO..OOO.....",
  "...dd....dd.....",
  "................",
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

  // --- Personajes por código (Iara / Ale), 16x24 a px=2 → 32x48 ---
  g.clear();
  drawPixels(g, IARA, CHAR_PAL, 2);
  g.generateTexture("iara_code", 32, 48);
  g.clear();
  drawPixels(g, ALE, CHAR_PAL, 2);
  g.generateTexture("ale_code", 32, 48);

  // --- Íconos de armas (32x24) ---
  for (const [key, rows] of [
    ["ic_knife", IC_KNIFE], ["ic_pistol", IC_PISTOL],
    ["ic_shotgun", IC_SHOTGUN], ["ic_bat", IC_BAT],
  ] as const) {
    g.clear();
    drawPixels(g, rows, ICON_PAL, 2);
    g.generateTexture(key, 32, 24);
  }

  // --- Bala (estela horizontal; se rota según el ángulo de disparo) ---
  g.clear();
  g.fillStyle(0xffe39a, 1).fillRect(0, 0, 8, 3);   // halo cálido
  g.fillStyle(0xfff4d0, 1).fillRect(0, 1, 8, 1);   // núcleo brillante
  g.generateTexture("bullet", 8, 3);

  // --- Fogonazo (estrella corta del disparo) ---
  g.clear();
  g.fillStyle(0xffd98a, 0.95).fillCircle(8, 8, 7);
  g.fillStyle(0xfff3cf, 1).fillCircle(8, 8, 4);
  g.generateTexture("muzzle", 16, 16);

  // --- Partícula de sangre ---
  g.clear();
  g.fillStyle(0x9a1414, 1).fillRect(0, 0, 4, 4);
  g.fillStyle(0xc62828, 1).fillRect(0, 0, 2, 2);
  g.generateTexture("blood", 4, 4);

  // --- Mancha de sangre (decal del piso) ---
  g.clear();
  g.fillStyle(0x5e0d0d, 1);
  g.fillCircle(10, 10, 7); g.fillCircle(5, 8, 4); g.fillCircle(15, 12, 4);
  g.fillCircle(8, 15, 3); g.fillCircle(14, 5, 3);
  g.fillStyle(0x7a1414, 1).fillCircle(10, 10, 4);
  g.generateTexture("stain", 20, 20);

  // --- Caja de munición ---
  g.clear();
  g.fillStyle(0x4a5a32, 1).fillRect(2, 4, 20, 12);
  g.fillStyle(0x3a4726, 1).fillRect(2, 4, 20, 2);
  g.fillStyle(0xe0b54a, 1).fillRect(5, 8, 14, 3);
  g.fillStyle(0x2a3320, 1).fillRect(2, 14, 20, 2);
  g.generateTexture("ammo_box", 24, 18);

  // Los gatos (Marfil/Venus) ahora usan sprites reales (Elthen), cargados en Preload.
  // Iara y su retrato usan los sprites reales (public/...).

  g.destroy();
}

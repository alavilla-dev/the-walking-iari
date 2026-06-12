import Phaser from "phaser";
import { TILE } from "../config";

/**
 * Texturas de interior del DEPARTAMENTO (pixel-art dibujado por código).
 * Layout y mobiliario inspirados en `ref-depto.jpg`. Cuando llegue el pack
 * LimeZu "Modern Interiors", se reemplazan estas texturas sin tocar la lógica
 * de la escena (mismas keys).
 */

type G = Phaser.GameObjects.Graphics;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Bloque con highlight arriba y sombra abajo (volumen sutil). */
function block(g: G, x: number, y: number, w: number, h: number, base: number, top: number, sh: number): void {
  g.fillStyle(base, 1).fillRect(x, y, w, h);
  g.fillStyle(top, 1).fillRect(x, y, w, Math.max(1, Math.floor(h * 0.12)));
  g.fillStyle(sh, 1).fillRect(x, y + h - Math.max(1, Math.floor(h * 0.12)), w, Math.max(1, Math.floor(h * 0.12)));
}

export function createApartmentTextures(scene: Phaser.Scene): void {
  // ---------- PISOS ----------
  // Piso de madera cálido (sobrescribe estilo más lindo que el placeholder).
  tex(scene, "floor_wood", TILE, TILE, (g) => {
    g.fillStyle(0x7a5236, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x875c3c, 1);
    g.fillRect(0, 0, TILE, 1); g.fillRect(0, 11, TILE, 1); g.fillRect(0, 22, TILE, 1);
    g.fillStyle(0x5c3d27, 1);
    g.fillRect(0, 10, TILE, 1); g.fillRect(0, 21, TILE, 1); g.fillRect(0, 31, TILE, 1);
    g.fillRect(15, 0, 1, 10); g.fillRect(7, 11, 1, 10); g.fillRect(23, 22, 1, 10);
  });

  // Piso de baldosa claro (baño / cocina).
  tex(scene, "floor_tile", TILE, TILE, (g) => {
    g.fillStyle(0xd9d2c2, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0xc7bfac, 1);
    g.fillRect(0, 15, TILE, 1); g.fillRect(15, 0, 1, TILE);
    g.fillStyle(0xe6e0d2, 1).fillRect(1, 1, 13, 13); g.fillRect(17, 1, 13, 13);
    g.fillStyle(0xe6e0d2, 1).fillRect(1, 17, 13, 13); g.fillRect(17, 17, 13, 13);
  });

  // ---------- PAREDES ----------
  // Pared interior (clara, con zócalo).
  tex(scene, "wall_int", TILE, TILE, (g) => {
    g.fillStyle(0xcaba9a, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0xd8cbb0, 1).fillRect(0, 0, TILE, 6);
    g.fillStyle(0x9c8763, 1).fillRect(0, TILE - 5, TILE, 5);
    g.fillStyle(0x7c684a, 1).fillRect(0, TILE - 6, TILE, 1);
  });

  // ---------- DORMITORIO ----------
  // Cama doble (64x88): respaldo, sábana, manta bordó, almohadas.
  tex(scene, "bed", 64, 88, (g) => {
    block(g, 0, 0, 64, 10, 0x6b4a32, 0x82603f, 0x4a3322);        // respaldo
    g.fillStyle(0xe9e2d2, 1).fillRect(2, 8, 60, 78);              // colchón/sábana
    g.fillStyle(0xf4eee0, 1).fillRect(6, 12, 22, 16);            // almohada izq
    g.fillStyle(0xf4eee0, 1).fillRect(36, 12, 22, 16);          // almohada der
    g.lineStyle(1, 0xcfc6b0, 1).strokeRect(6, 12, 22, 16); g.strokeRect(36, 12, 22, 16);
    g.fillStyle(0x7a2230, 1).fillRect(2, 36, 60, 50);            // manta bordó
    g.fillStyle(0x8c2b3a, 1).fillRect(2, 36, 60, 4);
    g.fillStyle(0x611823, 1).fillRect(2, 82, 60, 4);
    block(g, 0, 84, 64, 4, 0x5c3d27, 0x6b4a32, 0x402a1b);        // base
  });

  // Mesita de luz con plantita (28x28).
  tex(scene, "nightstand", 28, 28, (g) => {
    block(g, 0, 8, 28, 20, 0x6b4a32, 0x82603f, 0x4a3322);
    g.fillStyle(0x3a2a1c, 1).fillRect(3, 18, 22, 2);
    g.fillStyle(0xb5613a, 1).fillRect(8, 2, 12, 8);              // maceta
    g.fillStyle(0x3f7a3f, 1).fillEllipse(14, 2, 16, 10);         // hojas
    g.fillStyle(0x4f9a4f, 1).fillEllipse(14, 1, 9, 6);
  });

  // Alfombra (112x72).
  tex(scene, "rug", 112, 72, (g) => {
    g.fillStyle(0x4a5a6a, 1).fillRoundedRect(0, 0, 112, 72, 10);
    g.fillStyle(0x5a6c7e, 1).fillRoundedRect(6, 6, 100, 60, 8);
    g.lineStyle(2, 0x3a4856, 1).strokeRoundedRect(12, 12, 88, 48, 6);
  });

  // Luna decorativa de pared (26x26).
  tex(scene, "moon", 26, 26, (g) => {
    g.fillStyle(0xe7d27a, 1).fillCircle(13, 13, 11);
    g.fillStyle(0x161620, 0).fillRect(0, 0, 0, 0);
    g.fillStyle(0xcaba9a, 1).fillCircle(17, 11, 9);              // recorte creciente (color pared)
  });

  // ---------- LIVING ----------
  // Sofá verde (104x52).
  tex(scene, "sofa", 104, 52, (g) => {
    block(g, 0, 6, 104, 40, 0x3f6b4a, 0x4f8059, 0x2c4d36);       // cuerpo
    g.fillStyle(0x356040, 1).fillRect(0, 0, 16, 46);            // apoyabrazo izq
    g.fillStyle(0x356040, 1).fillRect(88, 0, 16, 46);          // apoyabrazo der
    g.fillStyle(0x478756, 1).fillRect(18, 12, 32, 22);         // cojín 1
    g.fillStyle(0x478756, 1).fillRect(54, 12, 32, 22);         // cojín 2
    g.lineStyle(1, 0x2c4d36, 1).strokeRect(18, 12, 32, 22); g.strokeRect(54, 12, 32, 22);
    g.fillStyle(0x24402f, 1).fillRect(8, 46, 88, 6);           // sombra base
  });

  // Puff / ottoman (38x30).
  tex(scene, "ottoman", 38, 30, (g) => {
    block(g, 0, 4, 38, 24, 0x3f6b4a, 0x4f8059, 0x2c4d36);
    g.fillStyle(0x24402f, 1).fillRect(4, 26, 30, 4);
  });

  // Mueble de TV (104x30).
  tex(scene, "tv_console", 104, 30, (g) => {
    block(g, 0, 0, 104, 30, 0x6b4a32, 0x82603f, 0x4a3322);
    g.fillStyle(0x3a2a1c, 1).fillRect(8, 10, 36, 14); g.fillRect(60, 10, 36, 14);
    g.fillStyle(0x533a26, 1).fillRect(50, 4, 4, 22);
  });

  // TV (72x46).
  tex(scene, "tv", 72, 46, (g) => {
    block(g, 0, 0, 72, 40, 0x14141a, 0x26262e, 0x0a0a0e);
    g.fillStyle(0x1b3a5a, 1).fillRect(4, 4, 64, 30);            // pantalla
    g.fillStyle(0x2d5a86, 1).fillRect(8, 8, 26, 12);           // brillo
    g.fillStyle(0x101014, 1).fillRect(30, 40, 12, 6);          // pie
  });

  // Mesa de comedor (72x104) con tapa oscura.
  tex(scene, "dining_table", 72, 104, (g) => {
    block(g, 4, 6, 64, 92, 0x2b2b33, 0x3a3a44, 0x1c1c22);
    g.fillStyle(0x3f3f4a, 1).fillRect(8, 10, 56, 4);
    g.fillStyle(0x6b4a32, 1).fillRect(8, 96, 8, 8); g.fillRect(56, 96, 8, 8); // patas
  });

  // Silla (24x24).
  tex(scene, "chair", 24, 24, (g) => {
    block(g, 4, 2, 16, 6, 0x2b2b33, 0x3a3a44, 0x1c1c22);       // respaldo
    block(g, 3, 8, 18, 14, 0x33333d, 0x42424e, 0x22222a);     // asiento
  });

  // Florero con flores (18x22).
  tex(scene, "vase", 18, 22, (g) => {
    g.fillStyle(0xd8cbb0, 1).fillRect(5, 10, 8, 12);
    g.fillStyle(0xe85a7a, 1).fillCircle(6, 6, 4); g.fillCircle(12, 5, 4); g.fillCircle(9, 9, 4);
    g.fillStyle(0xf6c84a, 1).fillCircle(9, 6, 2);
  });

  // ---------- COCINA ----------
  // Heladera (32x52).
  tex(scene, "fridge", 32, 52, (g) => {
    block(g, 0, 0, 32, 52, 0xd0d6da, 0xe2e7ea, 0x9aa3a8);
    g.fillStyle(0xb5bcc0, 1).fillRect(0, 22, 32, 2);           // división
    g.fillStyle(0x8a9296, 1).fillRect(26, 6, 3, 12); g.fillRect(26, 28, 3, 16); // manijas
  });

  // Cocina/horno (32x42).
  tex(scene, "stove", 32, 42, (g) => {
    block(g, 0, 0, 32, 42, 0x2a2a30, 0x3a3a42, 0x18181c);
    g.fillStyle(0x4a4a52, 1).fillCircle(9, 9, 4); g.fillCircle(23, 9, 4);       // hornallas
    g.fillStyle(0xc8503c, 1).fillCircle(9, 9, 2); g.fillCircle(23, 9, 2);
    g.fillStyle(0x14141a, 1).fillRect(4, 20, 24, 18);          // horno
    g.fillStyle(0x3a6a8a, 1).fillRect(7, 23, 18, 6);
  });

  // Mesada (32x32, tileable).
  tex(scene, "counter", TILE, TILE, (g) => {
    block(g, 0, 0, TILE, TILE, 0x9c7b58, 0xb08d66, 0x6b4a32);
    g.fillStyle(0xcaa979, 1).fillRect(0, 0, TILE, 4);          // tapa clara
  });

  // Mesada con bacha (32x32).
  tex(scene, "counter_sink", TILE, TILE, (g) => {
    block(g, 0, 0, TILE, TILE, 0x9c7b58, 0xb08d66, 0x6b4a32);
    g.fillStyle(0xcaa979, 1).fillRect(0, 0, TILE, 4);
    g.fillStyle(0xb8bdc0, 1).fillRect(7, 8, 18, 16);           // bacha
    g.fillStyle(0x8a9296, 1).fillRect(10, 11, 12, 10);
    g.fillStyle(0x6a7276, 1).fillRect(15, 4, 2, 6);            // grifo
  });

  // ---------- BAÑO ----------
  // Inodoro (24x32).
  tex(scene, "toilet", 24, 32, (g) => {
    g.fillStyle(0xeef0f2, 1).fillRect(4, 0, 16, 10);           // mochila
    g.fillStyle(0xdfe3e6, 1).fillRect(4, 0, 16, 2);
    g.fillStyle(0xeef0f2, 1).fillEllipse(12, 22, 20, 20);      // taza
    g.fillStyle(0xc9cdd0, 1).fillEllipse(12, 22, 12, 12);
  });

  // Bañera (72x40).
  tex(scene, "bathtub", 72, 40, (g) => {
    g.fillStyle(0xeef0f2, 1).fillRoundedRect(0, 4, 72, 34, 8);
    g.fillStyle(0xbfe0ea, 1).fillRoundedRect(6, 10, 60, 24, 6); // agua
    g.fillStyle(0xd6eef4, 1).fillRect(10, 14, 18, 6);
    g.fillStyle(0x8a9296, 1).fillRect(2, 2, 4, 8);             // grifería
  });

  // Lavatorio (28x24).
  tex(scene, "bath_sink", 28, 24, (g) => {
    g.fillStyle(0xeef0f2, 1).fillRoundedRect(0, 6, 28, 16, 5);
    g.fillStyle(0xc9cdd0, 1).fillEllipse(14, 14, 18, 8);
    g.fillStyle(0x8a9296, 1).fillRect(13, 2, 2, 6);
  });

  // ---------- DECOR ----------
  // Planta en maceta (30x44).
  tex(scene, "plant", 30, 44, (g) => {
    g.fillStyle(0xb5613a, 1).fillRect(8, 30, 14, 14);          // maceta
    g.fillStyle(0x9c4f2e, 1).fillRect(8, 30, 14, 3);
    g.fillStyle(0x356a35, 1).fillEllipse(15, 20, 28, 30);      // follaje
    g.fillStyle(0x47884a, 1).fillEllipse(11, 14, 14, 16); g.fillEllipse(20, 18, 12, 14);
  });

  // Lámpara de pie (20x48).
  tex(scene, "lamp", 20, 48, (g) => {
    g.fillStyle(0xf2d98a, 1).fillTriangle(2, 18, 18, 18, 10, 2); // pantalla
    g.fillStyle(0xe8c870, 1).fillRect(2, 16, 16, 3);
    g.fillStyle(0x3a3a42, 1).fillRect(9, 18, 2, 26);          // pie
    g.fillStyle(0x3a3a42, 1).fillRect(4, 44, 12, 3);          // base
  });

  // Cuadro de pared (22x18).
  tex(scene, "frame", 22, 18, (g) => {
    block(g, 0, 0, 22, 18, 0x6b4a32, 0x82603f, 0x4a3322);
    g.fillStyle(0x9fb6c8, 1).fillRect(3, 3, 16, 12);
    g.fillStyle(0xd98a8a, 1).fillRect(6, 9, 4, 4);
    g.fillStyle(0x88a0c0, 1).fillRect(12, 6, 4, 7);
  });

  // Puerta de entrada (40x44).
  tex(scene, "door", 40, 44, (g) => {
    block(g, 0, 0, 40, 44, 0x5c3d27, 0x73512f, 0x3f2a1a);
    g.fillStyle(0x4a3120, 1).fillRect(6, 6, 28, 14); g.fillRect(6, 24, 28, 14);
    g.fillStyle(0xe7d27a, 1).fillCircle(31, 22, 2);            // picaporte
  });

  // Felpudo (44x22).
  tex(scene, "doormat", 44, 22, (g) => {
    g.fillStyle(0x8a6a44, 1).fillRoundedRect(0, 0, 44, 22, 4);
    g.fillStyle(0x73552f, 1).fillRoundedRect(4, 4, 36, 14, 3);
  });

  // Ventana (para pared superior) (52x14).
  tex(scene, "window", 52, 14, (g) => {
    block(g, 0, 0, 52, 14, 0x3a4a5a, 0x4a5e72, 0x26323e);
    g.fillStyle(0x2a3a48, 1).fillRect(25, 0, 2, 14);
    g.fillStyle(0x6a8aa6, 1).fillRect(3, 3, 20, 4);
  });
}

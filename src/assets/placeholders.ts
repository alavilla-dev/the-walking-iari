import Phaser from "phaser";
import { TILE } from "../config";

/**
 * Crea texturas placeholder en el TextureManager de la escena.
 * Para el jugador genera 4 texturas con un "marcador" según la dirección.
 * El swap a LimeZu se hace reemplazando estas texturas por sprite sheets
 * en PreloadScene, sin tocar la lógica de entidades.
 */
export function createPlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Piso
  g.clear();
  g.fillStyle(0x3a3a44, 1).fillRect(0, 0, TILE, TILE);
  g.lineStyle(1, 0x2c2c34, 1).strokeRect(0, 0, TILE, TILE);
  g.generateTexture("tile_floor", TILE, TILE);

  // Pared
  g.clear();
  g.fillStyle(0x6b4f3a, 1).fillRect(0, 0, TILE, TILE);
  g.lineStyle(1, 0x4a3526, 1).strokeRect(0, 0, TILE, TILE);
  g.generateTexture("tile_wall", TILE, TILE);

  // Jugador (Iara) — círculo colorado con marcador direccional
  const dirs: Record<string, [number, number]> = {
    down: [16, 26],
    up: [16, 6],
    left: [6, 16],
    right: [26, 16],
  };
  for (const [dir, [mx, my]] of Object.entries(dirs)) {
    g.clear();
    g.fillStyle(0xd1603a, 1).fillCircle(16, 16, 12); // cuerpo/pelo colorado
    g.fillStyle(0xffe0b2, 1).fillCircle(16, 16, 7);  // cara
    g.fillStyle(0x222222, 1).fillCircle(mx, my, 3);  // marcador de dirección
    g.generateTexture(`player_${dir}`, 32, 32);
  }

  // Zombie — círculo verde
  g.clear();
  g.fillStyle(0x5a8f3a, 1).fillCircle(16, 16, 12);
  g.fillStyle(0x3a5f24, 1).fillCircle(16, 16, 6);
  g.generateTexture("zombie", 32, 32);

  // Gato — círculo blanco chico
  g.clear();
  g.fillStyle(0xeeeeee, 1).fillCircle(12, 12, 9);
  g.fillStyle(0xcccccc, 1).fillTriangle(5, 4, 9, 4, 7, 0);
  g.generateTexture("cat", 24, 24);

  // Retrato placeholder (HUD)
  g.clear();
  g.fillStyle(0x222230, 1).fillRect(0, 0, 48, 48);
  g.fillStyle(0xd1603a, 1).fillCircle(24, 20, 14);
  g.fillStyle(0xffe0b2, 1).fillCircle(24, 22, 9);
  g.generateTexture("portrait_iara", 48, 48);

  g.destroy();
}

import type Phaser from "phaser";
import { RENDER_SCALE } from "../config";

/**
 * El canvas se renderiza a RENDER_SCALE x la resolución lógica. Cada escena
 * trabaja en coordenadas lógicas (640x480) con la cámara en zoom RENDER_SCALE,
 * así nada cambia de tamaño pero hay el doble de píxeles reales.
 */

/** Ancho/alto lógicos de la escena (lo que realmente usás para posicionar). */
export function logicalW(scene: Phaser.Scene): number {
  return scene.scale.width / RENDER_SCALE;
}
export function logicalH(scene: Phaser.Scene): number {
  return scene.scale.height / RENDER_SCALE;
}

/**
 * Cámara para escenas de UI (HUD, título): zoom de supersampling anclado en la
 * esquina superior izquierda (origin 0,0, scroll 0). Así el contenido dibujado
 * en 0..640 x 0..480 mapea 1:1 al canvas grande, sin desfase y sin importar el
 * scrollFactor de cada objeto.
 */
export function crispUI(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setZoom(RENDER_SCALE);
  cam.setOrigin(0, 0);
  cam.setScroll(0, 0);
}

/**
 * Cámara para escenas de mundo (depto, lab): sólo aplica el zoom de
 * supersampling × el zoom de mundo. El centrado lo maneja la escena
 * (startFollow al jugador o centerOn al mapa), con el origin por defecto (0.5).
 */
export function crispWorld(scene: Phaser.Scene, worldZoom = 1): void {
  scene.cameras.main.setZoom(RENDER_SCALE * worldZoom);
}

/**
 * add.text pero rasterizando el glifo a RENDER_SCALE → texto nítido aún con
 * la cámara en zoom. Usar en todo el HUD/UI en lugar de scene.add.text.
 */
export function crispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, str, style).setResolution(RENDER_SCALE);
}

import Phaser from "phaser";

/**
 * Lee mapas de color (imágenes del MISMO tamaño que el render del depto) y los
 * traduce a datos de juego:
 *   - Mapa de COLISIÓN: zonas rojas/negras → rectángulos estáticos (hitbox).
 *   - Mapa de PROFUNDIDAD: degradado gris (0–255) → capa de y-sorting por píxel.
 *
 * Todo se procesa UNA vez al cargar (no se leen píxeles por frame para la
 * colisión; la profundidad sí se consulta por frame pero sobre un Uint8Array).
 */

export interface Rect { x: number; y: number; w: number; h: number; }

export interface PixelBuffer { data: Uint8ClampedArray; w: number; h: number; }

/** Vuelca una textura ya cargada a un canvas y devuelve sus píxeles RGBA. */
export function readPixels(scene: Phaser.Scene, key: string): PixelBuffer | null {
  if (!scene.textures.exists(key)) return null;
  const src = scene.textures.get(key).getSourceImage() as CanvasImageSource & { width: number; height: number };
  const w = src.width, h = src.height;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  return { data, w, h };
}

/** ¿El píxel es "pared"? Rojo (#FF0000-ish) o negro, con alfa visible. */
function isWallPixel(d: Uint8ClampedArray, i: number): boolean {
  const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
  if (a < 128) return false;
  const red = r > 120 && g < 100 && b < 100;
  const black = r < 60 && g < 60 && b < 60;
  return red || black;
}

/**
 * Escanea el mapa de colisión y devuelve rectángulos (en coords de IMAGEN) que
 * cubren las zonas pared. Usa una grilla de `step` px y descomposición greedy en
 * rectángulos maximales para generar pocos colliders grandes en vez de miles.
 */
export function collisionRects(scene: Phaser.Scene, key: string, step = 6): Rect[] {
  const px = readPixels(scene, key);
  if (!px) return [];
  const { data, w, h } = px;
  const gw = Math.ceil(w / step), gh = Math.ceil(h / step);

  // Grilla booleana: una celda está bloqueada si su píxel central es pared.
  const blocked = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    const sy = Math.min(h - 1, gy * step + (step >> 1));
    for (let gx = 0; gx < gw; gx++) {
      const sx = Math.min(w - 1, gx * step + (step >> 1));
      if (isWallPixel(data, (sy * w + sx) * 4)) blocked[gy * gw + gx] = 1;
    }
  }

  // Greedy: por cada celda libre-no-usada, crecer ancho y luego alto al máximo.
  const used = new Uint8Array(gw * gh);
  const rects: Rect[] = [];
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const idx = gy * gw + gx;
      if (!blocked[idx] || used[idx]) continue;

      // Ancho máximo en esta fila.
      let rw = 1;
      while (gx + rw < gw && blocked[gy * gw + gx + rw] && !used[gy * gw + gx + rw]) rw++;

      // Alto máximo manteniendo ese ancho.
      let rh = 1;
      grow: while (gy + rh < gh) {
        for (let k = 0; k < rw; k++) {
          const j = (gy + rh) * gw + gx + k;
          if (!blocked[j] || used[j]) break grow;
        }
        rh++;
      }

      for (let yy = 0; yy < rh; yy++) {
        for (let xx = 0; xx < rw; xx++) used[(gy + yy) * gw + gx + xx] = 1;
      }
      rects.push({
        x: gx * step, y: gy * step,
        w: Math.min(rw * step, w - gx * step),
        h: Math.min(rh * step, h - gy * step),
      });
    }
  }
  return rects;
}

/** Mapa de profundidad: canal R (gris) de cada píxel en un Uint8Array plano. */
export interface DepthMap { gray: Uint8Array; w: number; h: number; }

export function loadDepthMap(scene: Phaser.Scene, key: string): DepthMap | null {
  const px = readPixels(scene, key);
  if (!px) return null;
  const { data, w, h } = px;
  const gray = new Uint8Array(w * h);
  for (let p = 0; p < gray.length; p++) gray[p] = data[p * 4]; // R (en gris R=G=B)
  return { gray, w, h };
}

/** Valor de profundidad (0–255) en coords de IMAGEN; clamp a los bordes. */
export function sampleDepth(map: DepthMap, ix: number, iy: number): number {
  const x = Phaser.Math.Clamp(Math.round(ix), 0, map.w - 1);
  const y = Phaser.Math.Clamp(Math.round(iy), 0, map.h - 1);
  return map.gray[y * map.w + x];
}

// ---------- Muebles (componentes rojos) para y-sorting por objeto ----------

/** ¿El píxel es mueble? Rojo (alto R, bajo G/B). Excluye el negro de las paredes. */
function isRedPixel(d: Uint8ClampedArray, i: number): boolean {
  const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
  return a >= 128 && r > 110 && g < 95 && b < 95;
}

export interface FurniturePiece {
  /** Recorte (canvas) listo para usar como textura de Phaser. */
  key: string;
  /** Posición/tamaño del recorte en coords del RENDER (no del mapa). */
  rx: number; ry: number; rw: number; rh: number;
  /** Profundidad fija (0–255) tomada del degradado en la base del mueble. */
  depth: number;
}

/**
 * Detecta cada mueble (blob rojo conexo) en el mapa de colisión, recorta esos
 * píxeles del render real y les asigna una profundidad fija leída del mapa de
 * degradado en su base. Devuelve piezas listas para colocar con y-sorting.
 *
 * @param maskKey  textura del mapa de colisión (rojo = mueble)
 * @param renderKey textura del render real del depto (de donde se recorta)
 * @param depth    mapa de profundidad (degradado gris)
 * @param step     resolución de la grilla de detección (px del mapa)
 * @param minCells tamaño mínimo de blob (descarta ruido del JPG)
 */
export function furnitureLayer(
  scene: Phaser.Scene,
  maskKey: string,
  renderKey: string,
  depth: DepthMap,
  step = 4,
  minCells = 6,
): FurniturePiece[] {
  const mask = readPixels(scene, maskKey);
  if (!mask || !scene.textures.exists(renderKey)) return [];
  const src = scene.textures.get(renderKey).getSourceImage() as CanvasImageSource & { width: number; height: number };
  const rW = src.width, rH = src.height;
  const m2r = rW / mask.w; // mapa → render

  const gw = Math.ceil(mask.w / step), gh = Math.ceil(mask.h / step);
  const red = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    const sy = Math.min(mask.h - 1, gy * step + (step >> 1));
    for (let gx = 0; gx < gw; gx++) {
      const sx = Math.min(mask.w - 1, gx * step + (step >> 1));
      if (isRedPixel(mask.data, (sy * mask.w + sx) * 4)) red[gy * gw + gx] = 1;
    }
  }

  // Flood fill (BFS) por componentes conexos sobre la grilla roja.
  const seen = new Uint8Array(gw * gh);
  const pieces: FurniturePiece[] = [];
  const stack: number[] = [];
  let pieceId = 0;

  for (let start = 0; start < red.length; start++) {
    if (!red[start] || seen[start]) continue;
    stack.length = 0; stack.push(start); seen[start] = 1;
    let minX = gw, minY = gh, maxX = 0, maxY = 0, count = 0;

    while (stack.length) {
      const c = stack.pop()!;
      const cx = c % gw, cy = (c / gw) | 0;
      count++;
      if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
      const nb = [c - 1, c + 1, c - gw, c + gw];
      const onLeft = cx === 0, onRight = cx === gw - 1;
      for (let k = 0; k < 4; k++) {
        const n = nb[k];
        if (n < 0 || n >= red.length || seen[n] || !red[n]) continue;
        if (k === 0 && onLeft) continue;
        if (k === 1 && onRight) continue;
        seen[n] = 1; stack.push(n);
      }
    }
    if (count < minCells) continue;

    // Bbox en coords de MAPA → render.
    const mx = minX * step, my = minY * step;
    const mw = (maxX - minX + 1) * step, mh = (maxY - minY + 1) * step;
    const rx = Math.floor(mx * m2r), ry = Math.floor(my * m2r);
    const rw = Math.min(Math.ceil(mw * m2r), rW - rx), rh = Math.min(Math.ceil(mh * m2r), rH - ry);
    if (rw <= 0 || rh <= 0) continue;

    // Recorte del render, enmascarado a los píxeles rojos del mapa.
    const canvas = document.createElement("canvas");
    canvas.width = rw; canvas.height = rh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(src, rx, ry, rw, rh, 0, 0, rw, rh);
    const img = ctx.getImageData(0, 0, rw, rh);
    for (let ly = 0; ly < rh; ly++) {
      const myp = Math.min(mask.h - 1, Math.floor((ry + ly) / m2r));
      for (let lx = 0; lx < rw; lx++) {
        const mxp = Math.min(mask.w - 1, Math.floor((rx + lx) / m2r));
        if (!isRedPixel(mask.data, (myp * mask.w + mxp) * 4)) {
          img.data[(ly * rw + lx) * 4 + 3] = 0; // fuera del mueble → transparente
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    const key = `fg_piece_${pieceId++}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);

    // Profundidad fija = gris del PISO justo delante de la base del mueble
    // (no su propio brillo): bajamos desde la base hasta salir del rojo.
    const baseMx = Math.min(mask.w - 1, Math.round((minX + maxX) / 2 * step));
    let baseMy = Math.min(mask.h - 1, maxY * step + (step >> 1));
    for (let t = 0; t < step * 12 && baseMy < mask.h - 1; t++) {
      if (!isRedPixel(mask.data, (baseMy * mask.w + baseMx) * 4)) break;
      baseMy++;
    }
    pieces.push({ key, rx, ry, rw, rh, depth: sampleDepth(depth, baseMx, baseMy) });
  }
  return pieces;
}

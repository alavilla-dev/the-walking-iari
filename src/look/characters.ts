/**
 * characters.ts — Look System de pixel-art (estilo RPG Maker, vista 3/4 cenital).
 *
 * Un solo "motor" de dibujo parametrizado por un objeto CharacterLook.
 * Incluye 24 personajes: 2 héroes (Iara, Alejandro), 10 zombies y 12 NPCs civiles.
 *
 * Resolución lógica: 32 x 48 "pixeles", escalada con `scale` (cada pixel lógico
 * = `scale` pixeles reales). El canvas/imagen debe usar image-rendering: pixelated.
 *
 * Animaciones por tipo:
 *   - hero  : idle, walk, run, shoot, knife   (en las 4 direcciones)
 *   - zombie: idle, walk
 *   - npc   : idle, walk
 *
 * Vista lateral por personaje (`side`):
 *   - 'tq'     -> 3/4 (cuerpo girado pero cara visible). Recomendado para mujeres.
 *   - 'perfil' -> perfil estricto.
 *
 * Uso mínimo:
 *   import { drawCharacter, CHARACTERS } from "./characters";
 *   drawCharacter(ctx, CHARACTERS.hero_iara, "down", "walk", t, 3, 100, 80);
 *
 * Uso con controlador:
 *   import { Character, attachKeyboard, CHARACTERS } from "./characters";
 *   const p = new Character(CHARACTERS.hero_iara, 300, 200, { scale: 3, speed: 80 });
 *   attachKeyboard(p);
 *   // en el loop:  p.update(dt); p.draw(ctx);
 */

/* ========================================================================== */
/*  Tipos                                                                     */
/* ========================================================================== */

export type Direction = "down" | "up" | "left" | "right";
export type AnimState = "idle" | "walk" | "run" | "shoot" | "knife";
export type SideMode = "tq" | "perfil";
export type HairStyle = "short" | "messy" | "ponytail" | "long" | "balding" | "mohawk" | "bald";
export type CharType = "hero" | "zombie" | "npc";

export const SPRITE_W = 32;
export const SPRITE_H = 48;

export interface CharacterLook {
  id: string;
  name: string;
  type: CharType;
  side?: SideMode;

  // piel
  skin: string; skinD: string; skinL: string;
  // pelo
  hair: string; hairD: string; style: HairStyle; hairVolume?: boolean;
  // torso
  top: string; topD: string; topL?: string;
  sleeveless?: boolean; crop?: boolean; dress?: boolean;
  hood?: boolean; vest?: string; vestD?: string; plaid?: boolean; tie?: string;
  // piernas
  bottom?: string; bottomD?: string; bottomL?: string; shorts?: boolean;
  // calzado
  shoe?: string; shoeL?: string; sole?: string;
  // cara / accesorios
  out?: string;
  eye?: string; eyeW?: string; pupil?: string;
  beard?: boolean; beardColor?: string;
  sunglasses?: boolean; glasses?: boolean; earring?: boolean;
  eyeliner?: boolean; nosering?: boolean; freckles?: boolean; freckleC?: string;
  cleanFace?: boolean; fem?: boolean; tattoo?: boolean;
  // zombie
  zombie?: boolean; wounds?: number; blood?: boolean;
  rot?: string; bloodC?: string; bloodD?: string; bone?: string; boneD?: string; teeth?: string;
  armBite?: boolean; neckWound?: boolean;
}

const DEFAULTS = {
  out: "#191510", eyeW: "#eceadb", eye: "#3a2a1c", pupil: "#3a0c0a",
  rot: "#6a6f50", bloodC: "#8c1414", bloodD: "#5e0d0d",
  bone: "#e9e7cd", boneD: "#bdbb9e", teeth: "#dad7bb",
  freckleC: "#c06536", shoe: "#2a2a2a", shoeL: "#444444", sole: "#777777",
  topL: "", bottom: "#2a2a2a", bottomD: "#161616", bottomL: "#383838",
};

type L = CharacterLook & typeof DEFAULTS;

/* ========================================================================== */
/*  Motor de dibujo                                                           */
/* ========================================================================== */

type Painter = (x: number, y: number, w: number, h: number, c: string) => void;

interface Motion {
  run: boolean; moving: boolean; s: number;
  lLift: number; rLift: number; lFwd: number; rFwd: number;
  bob: number; lArm: number; rArm: number; lean: number; amp: number;
}

function computeMotion(state: AnimState, t: number): Motion {
  const run = state === "run";
  const moving = state === "walk" || run;
  const freq = run ? 11 : 7;
  const ph = t * freq;
  const s = Math.sin(ph);
  const A = run ? 3 : 2;
  const r = (v: number) => (moving ? Math.round(v) : 0);
  return {
    run, moving, s,
    lLift: r(Math.max(0, s) * A), rLift: r(Math.max(0, -s) * A),
    lFwd: r(s * (run ? 2 : 1)), rFwd: r(-s * (run ? 2 : 1)),
    bob: r(Math.abs(s) * (run ? 2 : 1)),
    lArm: r(-s * A), rArm: r(s * A),
    lean: run ? 1 : 0, amp: A,
  };
}

/* --- pelo (cubre todos los estilos en cada vista) ------------------------- */

function hairTop(p: Painter, C: L) {
  const H = C.hair, HD = C.hairD;
  if (C.style === "bald") return;
  if (C.style === "balding") { p(11, 4, 1, 5, H); p(20, 4, 1, 5, H); p(12, 3, 2, 1, H); p(18, 3, 2, 1, H); return; }
  if (C.style === "mohawk") { p(11, 3, 3, 5, C.skin); p(18, 3, 3, 5, C.skin); p(14, 1, 4, 6, H); p(14, 1, 2, 6, HD); return; }
  if (C.style === "long") { p(11, 2, 10, 4, H); p(11, 2, 1, 16, H); p(20, 2, 1, 16, H); p(11, 2, 5, 2, HD); p(12, 5, 2, 1, H); p(17, 5, 2, 1, H); return; }
  if (C.style === "ponytail") { p(11, 2, 10, 4, H); p(11, 2, 5, 2, HD); p(12, 5, 2, 1, H); p(19, 1, 3, 3, H); p(20, 3, 2, 9, H); p(20, 4, 1, 1, HD); p(10, 5, 1, 5, H); p(21, 5, 1, 5, H); return; }
  p(11, 2, 10, 4, H); p(11, 2, 1, 5, H); p(20, 2, 1, 5, H); p(12, 5, 3, 1, H); p(17, 5, 3, 1, H); p(11, 2, 5, 2, HD);
  if (C.hairVolume) { p(11, 1, 10, 1, H); p(11, 0, 9, 1, H); p(11, 1, 4, 1, HD); p(13, 2, 3, 1, HD); }
  if (C.style === "messy") { p(11, 1, 2, 1, H); p(15, 1, 2, 1, H); p(19, 1, 2, 1, H); p(13, 3, 1, 1, C.skin); p(16, 2, 1, 1, C.skin); }
}

function hairBack(p: Painter, C: L) {
  const H = C.hair, HD = C.hairD;
  if (C.style === "bald") return;
  if (C.style === "balding") { p(11, 2, 1, 7, H); p(20, 2, 1, 7, H); p(12, 2, 8, 2, H); return; }
  if (C.style === "mohawk") { p(11, 3, 2, 6, C.skinD); p(19, 3, 2, 6, C.skinD); p(14, 1, 4, 8, H); p(14, 1, 2, 8, HD); return; }
  if (C.style === "long") { p(11, 2, 10, 16, H); p(11, 2, 5, 3, HD); return; }
  if (C.style === "ponytail") { p(11, 2, 10, 6, H); p(11, 2, 5, 2, HD); p(14, 7, 4, 9, H); p(14, 7, 4, 1, HD); p(15, 8, 2, 7, HD); return; }
  p(11, 1, 10, 8, H); p(11, 1, 5, 2, HD); if (C.hairVolume) p(11, 0, 10, 1, H);
  if (C.style === "messy") { p(11, 0, 2, 1, H); p(15, 0, 2, 1, H); p(19, 0, 2, 1, H); }
}

function hairSide(p: Painter, C: L) {
  const H = C.hair, HD = C.hairD;
  if (C.style === "bald") return;
  if (C.style === "balding") { p(15, 3, 3, 2, H); p(16, 5, 2, 4, H); return; }
  if (C.style === "mohawk") { p(11, 3, 4, 2, C.skin); p(12, 1, 5, 5, H); p(12, 1, 2, 5, HD); return; }
  if (C.style === "long") { p(11, 2, 8, 4, H); p(11, 2, 3, 2, HD); p(16, 2, 3, 14, H); p(11, 5, 1, 3, H); return; }
  if (C.style === "ponytail") { p(11, 2, 8, 3, H); p(11, 1, 6, 1, H); p(11, 2, 3, 2, HD); p(10, 4, 2, 5, H); p(9, 6, 1, 3, H); p(10, 9, 1, 2, H); p(18, 3, 3, 4, H); p(18, 6, 3, 9, H); p(18, 6, 1, 1, HD); return; }
  if (C.hairVolume) { p(11, 1, 6, 2, H); p(11, 0, 5, 1, H); p(12, 0, 3, 1, HD); p(10, 2, 2, 3, H); p(10, 4, 1, 1, H); p(16, 2, 2, 5, H); p(17, 4, 1, 2, H); p(11, 5, 1, 2, H); return; }
  p(11, 1, 8, 3, H); p(11, 3, 1, 3, H); p(16, 3, 2, 4, H); p(11, 1, 5, 1, HD);
  if (C.style === "messy") { p(11, 0, 2, 1, H); p(15, 0, 2, 1, H); p(17, 4, 2, 1, H); }
}

function turnedHair(p: Painter, C: L) {
  const H = C.hair, HD = C.hairD;
  if (C.style === "bald") return;
  if (C.style === "ponytail") { p(12, 2, 8, 4, H); p(12, 2, 4, 2, HD); p(19, 4, 1, 5, H); p(20, 6, 1, 2, H); p(11, 3, 2, 3, H); p(10, 5, 2, 8, H); p(10, 5, 1, 1, HD); return; }
  if (C.style === "long") { p(12, 2, 8, 4, H); p(11, 2, 2, 14, H); p(19, 4, 1, 6, H); p(12, 2, 4, 2, HD); return; }
  if (C.style === "balding") { p(11, 3, 2, 5, H); p(19, 4, 1, 4, H); p(13, 2, 6, 1, H); return; }
  if (C.style === "mohawk") { p(13, 3, 4, 2, C.skin); p(14, 1, 4, 6, H); p(14, 1, 2, 6, HD); return; }
  p(12, 1, 8, 4, H); p(12, 0, 6, 1, H); p(12, 1, 3, 1, HD); p(19, 2, 1, 5, H); p(11, 2, 2, 5, H); p(19, 7, 1, 2, H);
}

/* --- cabezas -------------------------------------------------------------- */

function headFront(p: Painter, C: L, _t: number) {
  const SK = C.skin, SD = C.skinD, SL = C.skinL, H = C.hair, HD = C.hairD;
  const FR = C.freckleC, clean = C.cleanFace;
  p(11, 2, 10, 11, C.out); p(12, 3, 8, 9, SK); p(12, 3, 3, 4, SL);
  if (!clean) { p(18, 5, 2, 6, SD); p(13, 11, 6, 1, SD); }
  p(12, 11, 1, 1, C.out); p(19, 11, 1, 1, C.out); p(11, 7, 1, 3, SK); p(20, 7, 1, 3, SK);
  if (C.zombie) { p(13, 8, 2, 2, C.rot); p(17, 5, 2, 2, C.rot); p(12, 8, 1, 3, SD); p(19, 8, 1, 3, SD); }
  hairTop(p, C);
  if (C.beard) { const B = C.beardColor || H; p(12, 9, 2, 4, B); p(18, 9, 2, 4, B); p(13, 12, 6, 1, B); p(13, 9, 6, 1, B); }
  if (C.sunglasses) { p(12, 3, 8, 2, "#161616"); p(13, 3, 3, 1, "#3b4654"); }

  if (C.zombie) {
    p(12, 6, 4, 3, SD); p(16, 6, 4, 3, SD);
    p(13, 7, 2, 2, C.eyeW); p(13, 7, 1, 2, C.eye); p(13, 7, 1, 1, C.pupil);
    p(17, 8, 2, 1, C.eyeW); p(17, 8, 1, 1, C.eye);
    p(12, 6, 3, 1, C.out); p(17, 6, 2, 1, C.out); p(15, 9, 1, 1, C.out);
    p(13, 11, 6, 2, C.out); p(13, 11, 1, 1, C.teeth); p(15, 11, 1, 1, C.teeth); p(17, 11, 1, 1, C.teeth); p(14, 12, 1, 1, C.teeth); p(16, 12, 1, 1, C.teeth);
    if (C.blood) { p(18, 12, 1, 2, C.bloodC); p(14, 13, 1, 1, C.bloodC); }
  } else {
    p(13, 6, 2, 1, HD); p(17, 6, 2, 1, HD);
    p(13, 7, 2, 2, C.eyeW); p(14, 7, 1, 2, C.eye); p(17, 7, 2, 2, C.eyeW); p(17, 7, 1, 2, C.eye);
    if (C.glasses) { p(12, 6, 3, 1, "#222"); p(16, 6, 3, 1, "#222"); p(12, 8, 3, 1, "#222"); p(16, 8, 3, 1, "#222"); p(12, 7, 1, 1, "#222"); p(14, 7, 1, 1, "#222"); p(16, 7, 1, 1, "#222"); p(18, 7, 1, 1, "#222"); p(15, 7, 1, 1, "#222"); }
    if (C.eyeliner) { p(12, 7, 1, 1, "#1a1a1a"); p(19, 7, 1, 1, "#1a1a1a"); p(13, 6, 2, 1, "#1a1a1a"); p(17, 6, 2, 1, "#1a1a1a"); }
    if (!clean) { p(15, 9, 1, 2, SD); p(16, 10, 1, 1, SD); }
    if (C.nosering) p(16, 11, 1, 1, "#cfd2d8");
    p(14, 11, 4, 1, SD); p(13, 11, 1, 1, SK); p(18, 11, 1, 1, SK);
    if (C.freckles) { p(13, 9, 1, 1, FR); p(18, 9, 1, 1, FR); p(14, 10, 1, 1, FR); p(17, 10, 1, 1, FR); p(15, 9, 1, 1, FR); p(16, 10, 1, 1, FR); }
  }
  if (C.earring) p(20, 10, 1, 1, "#e8d27a");
}

function headBack(p: Painter, C: L) {
  const SK = C.skin, SD = C.skinD;
  p(11, 2, 10, 11, C.out); p(12, 3, 8, 9, SK); p(12, 9, 8, 3, SD); p(11, 7, 1, 3, SK); p(20, 7, 1, 3, SK);
  hairBack(p, C);
  if (C.sunglasses) p(12, 3, 8, 2, "#161616");
  if (C.zombie) { p(13, 4, 4, 3, C.bloodD); p(14, 4, 2, 2, C.bone); p(13, 7, 1, 2, C.bloodC); p(16, 7, 1, 2, C.bloodC); }
  if (C.earring) p(11, 10, 1, 1, "#e8d27a");
}

function headTurned(p: Painter, C: L) {
  const SK = C.skin, SD = C.skinD, SL = C.skinL, HD = C.hairD, clean = C.cleanFace;
  p(11, 2, 10, 11, C.out); p(13, 3, 7, 9, SK); p(13, 3, 3, 3, SL);
  if (!clean) p(19, 6, 1, 5, SD);
  p(20, 7, 1, 3, SK);
  turnedHair(p, C);
  if (C.beard) { const B = C.beardColor || C.hair; p(14, 9, 5, 4, B); p(14, 12, 5, 1, B); p(14, 9, 5, 1, B); }
  p(14, 6, 1, 1, HD); p(16, 6, 2, 1, HD);
  p(14, 7, 1, 2, C.eyeW); p(14, 7, 1, 1, C.eye); p(16, 7, 2, 2, C.eyeW); p(17, 7, 1, 2, C.eye);
  if (C.eyeliner) { p(18, 7, 1, 1, "#1a1a1a"); p(16, 6, 2, 1, "#1a1a1a"); }
  if (!clean) p(18, 9, 1, 2, SD);
  p(19, 9, 1, 1, SK);
  if (C.nosering) p(18, 11, 1, 1, "#cfd2d8");
  p(15, 11, 3, 1, SD);
  if (C.freckles) { p(15, 9, 1, 1, C.freckleC); p(17, 9, 1, 1, C.freckleC); p(16, 10, 1, 1, C.freckleC); p(18, 10, 1, 1, C.freckleC); }
  if (C.earring) p(20, 10, 1, 1, "#e8d27a");
}

/* --- piernas / pies ------------------------------------------------------- */

function makeFoot(p: Painter, C: L) {
  return (x: number, y: number) => { p(x, y, 5, 3, C.shoe); p(x, y, 5, 1, C.shoeL); p(x, y + 2, 5, 1, C.sole); };
}

/* --- cuerpo de frente / espalda ------------------------------------------- */

function bodyFB(ctx: CanvasRenderingContext2D, p: Painter, C: L, M: Motion, dir: "down" | "up", turn: boolean, state: AnimState, t: number, scale: number) {
  const SK = C.skin, SD = C.skinD, SL = C.skinL, tL = C.topL || C.top;
  const bare = !!(C.sleeveless || C.dress);
  const foot = makeFoot(p, C);
  const legFB = (X: number, fwd: number, lift: number, m: string, mD: string, mL?: string) => {
    const sx = X + fwd;
    p(X, 31, 4, 6, m); p(X, 31, 1, 6, mL || m); p(X + 3, 31, 1, 6, mD);
    p(sx, 37 - lift, 4, 7, m); p(sx, 37 - lift, 1, 7, mL || m); p(sx + 3, 37 - lift, 1, 7, mD);
    foot(sx, 44 - lift);
  };

  if (C.shorts || C.dress) { legFB(11, M.lFwd, M.lLift, SK, SD); legFB(17, M.rFwd, M.rLift, SK, SD); }
  else { legFB(11, M.lFwd, M.lLift, C.bottom, C.bottomD, C.bottomL); legFB(17, M.rFwd, M.rLift, C.bottom, C.bottomD, C.bottomL); }

  ctx.save(); ctx.translate(M.lean * scale, M.bob * scale);
  const hem = C.crop ? 23 : 29;

  if (C.shorts) { p(10, 30, 12, 7, C.bottom); p(10, 30, 12, 1, C.bottomL); p(10, 36, 12, 1, C.bottomD); p(15, 31, 1, 5, C.bottomD); if (dir === "down") p(11, 32, 2, 2, C.bottomD); }
  else if (!C.dress) { p(10, 29, 12, 3, C.bottom); p(10, 29, 12, 1, C.bottomL); p(11, 29, 10, 1, "#0c0c10"); }

  if (C.dress) {
    p(9, 15, 14, 14, C.out); p(10, 16, 12, 12, C.top); p(10, 16, 3, 12, tL); p(19, 18, 3, 10, C.topD);
    p(7, 27, 18, 7, C.top); p(7, 27, 18, 1, tL); p(7, 33, 18, 1, C.topD); if (dir === "down") p(14, 16, 4, 2, SD);
  } else {
    p(9, 15, 14, hem - 14, C.out); p(10, 16, 12, hem - 16, C.top); p(10, 16, 3, hem - 16, tL); p(19, 18, 3, hem - 18, C.topD); p(10, 16, 12, 2, tL); p(9, 16, 1, hem - 16, tL);
    if (dir === "up") p(15, 16, 1, hem - 16, C.topD);
    if (dir === "down") p(14, 16, 4, 2, SD);
    if (C.tie) { p(15, 18, 2, Math.min(9, hem - 18), C.tie); p(14, 17, 4, 1, C.tie); }
    if (C.hood) { p(9, 15, 14, 3, C.topD); if (dir === "up") p(11, 14, 10, 4, C.topD); else { p(12, 16, 1, 3, "#dddddd"); p(18, 16, 1, 3, "#dddddd"); } }
    if (C.vest) { p(10, 16, 12, hem - 16, C.vest); p(10, 21, 12, 1, "#d6d9c6"); p(15, 16, 1, hem - 16, C.vestD || C.topD); p(13, 16, 1, hem - 16, C.vestD || C.topD); }
    if (C.plaid) { p(12, 16, 1, hem - 16, C.topD); p(18, 16, 1, hem - 16, C.topD); p(10, 19, 12, 1, C.topD); if (hem > 24) p(10, 24, 12, 1, C.topD); }
    if (C.crop) { p(11, 23, 10, 7, SK); p(11, 23, 3, 7, SL); if (!C.cleanFace) p(19, 23, 1, 7, SD); p(11, 23, 10, 1, SD); if (dir === "down") p(15, 27, 1, 1, SD); }
    if (C.zombie) {
      if ((C.wounds || 0) >= 1) { p(13, 19, 5, 4, dir === "up" ? SD : SK); p(14, 19, 2, 1, C.bloodD); if (C.blood) p(11, 22, 2, 2, C.bloodC); }
      if ((C.wounds || 0) >= 2) { if (dir === "up") p(15, 18, 2, 8, C.boneD); else { p(13, 21, 5, 1, C.boneD); p(14, 23, 3, 1, C.boneD); } if (C.blood) p(19, 18, 1, 4, C.bloodC); }
    }
  }

  const armFB = () => {
    if (bare) {
      p(6, 15, 5, 15, C.out); p(7, 16, 3, 12, SK); p(7, 16, 1, 12, SD); p(9, 16, 1, 3, SD); p(7, 28 + M.lArm, 3, 2, SK);
      p(21, 15, 5, 15, C.out); p(22, 16, 3, 12, SK); p(24, 16, 1, 12, SD); p(22, 16, 1, 3, SD); p(22, 28 + M.rArm, 3, 2, SK);
      if (C.tattoo && dir === "down") { p(22, 23, 3, 1, "#3a2c2c"); p(22, 25, 2, 1, "#3a2c2c"); }
    } else {
      p(6, 15, 5, 15, C.out); p(7, 16, 3, 7, C.top); p(7, 16, 1, 7, C.topD); p(7, 23, 3, 5, SK); p(7, 28 + M.lArm, 3, 2, SK);
      p(21, 15, 5, 15, C.out); p(22, 16, 3, 7, C.top); p(24, 16, 1, 7, C.topD); p(22, 23, 3, 5, SK); p(22, 28 + M.rArm, 3, 2, SK);
      if (C.tattoo && dir === "down") { p(7, 24, 3, 1, "#3a2c2c"); p(8, 26, 2, 1, "#3a2c2c"); }
      if (C.armBite && dir === "down") { p(22, 25, 3, 1, C.bloodC); p(23, 27, 1, 1, C.bloodD); }
    }
  };

  const cs = turn || dir === "down";
  const top = bare ? SK : C.top;
  if (cs && state === "shoot") {
    const fr = Math.floor(t * 6) % 2 === 0, rc = fr ? 1 : 0;
    p(8, 20, 5, 3, top); p(11, 21, 3, 2, SK); p(20, 19, 7 - rc, 3, top); p(26 - rc, 20, 3, 2, SK);
    p(28 - rc, 20, 3, 2, "#2a2a2a"); p(28 - rc, 22, 1, 2, "#1c1c1c");
    if (fr) { p(31 - rc, 20, 1, 2, "#ffd24a"); p(30 - rc, 19, 1, 1, "#ffae3a"); }
  } else if (cs && state === "knife") {
    const k = Math.floor(t * 7) % 3; p(8, 20, 5, 3, top); p(11, 21, 3, 2, SK);
    if (k === 0) { p(21, 15, 4, 3, top); p(24, 13, 3, 2, SK); p(26, 8, 1, 5, "#cfd2d8"); p(27, 8, 1, 4, "#eef0f4"); }
    else if (k === 1) { p(21, 18, 5, 3, top); p(25, 18, 3, 2, SK); p(28, 17, 4, 1, "#cfd2d8"); p(28, 16, 4, 1, "#eef0f4"); }
    else { p(21, 20, 5, 3, top); p(25, 22, 3, 2, SK); p(28, 23, 1, 4, "#cfd2d8"); p(29, 23, 1, 4, "#eef0f4"); }
  } else if (dir === "up" && (state === "shoot" || state === "knife")) {
    const fr2 = Math.floor(t * 6) % 2 === 0;
    p(7, 15, 4, 4, top); p(8, 12, 3, 4, SK); p(21, 15, 4, 4, top); p(21, 12, 3, 4, SK);
    if (state === "shoot") { p(13, 6, 3, 7, "#2a2a2a"); p(13, 5, 3, 2, "#1c1c1c"); if (fr2) { p(13, 3, 3, 2, "#ffd24a"); p(14, 2, 1, 1, "#ffae3a"); } }
    else { const k2 = Math.floor(t * 7) % 3; if (k2 === 0) { p(14, 5, 2, 8, "#cfd2d8"); p(16, 5, 1, 8, "#eef0f4"); } else if (k2 === 1) { p(13, 4, 2, 9, "#cfd2d8"); p(15, 4, 1, 9, "#eef0f4"); } else { p(15, 6, 2, 7, "#cfd2d8"); p(17, 6, 1, 7, "#eef0f4"); } }
  } else armFB();

  p(14, 12, 4, 4, SK); p(14, 12, 4, 1, SD);
  if (C.zombie && C.neckWound && dir === "down") p(14, 12, 3, 1, C.bloodC);
  if (turn) headTurned(p, C); else if (dir === "down") headFront(p, C, t); else headBack(p, C);
  ctx.restore();
}

/* --- cuerpo de perfil (mirando a la izquierda) ---------------------------- */

function bodyProfile(ctx: CanvasRenderingContext2D, p: Painter, C: L, M: Motion, state: AnimState, t: number, scale: number) {
  const SK = C.skin, SD = C.skinD, SL = C.skinL, tL = C.topL || C.top;
  const bare = !!(C.sleeveless || C.dress);
  const amp = M.amp;
  const nF = Math.round(M.s * amp), fF = Math.round(-M.s * amp), nL = Math.round(Math.max(0, M.s) * amp), fL = Math.round(Math.max(0, -M.s) * amp);
  const legP = (X: number, lift: number, m: string, mD: string) => {
    p(X, 31, 4, 6, m); p(X + 3, 31, 1, 6, mD); p(X, 37 - lift, 4, 7, m); p(X + 3, 37 - lift, 1, 7, mD);
    p(X - 2, 44 - lift, 6, 3, C.shoe); p(X - 2, 44 - lift, 6, 1, C.shoeL); p(X - 2, 46 - lift, 6, 1, C.sole);
  };
  const lm = C.shorts ? SK : C.bottom, ld = C.shorts ? SD : C.bottomD;
  legP(14 - fF, fL, ld, ld); legP(13 - nF, nL, lm, ld);
  if (C.shorts) { p(11, 30, 8, 7, C.bottom); p(11, 30, 8, 1, C.bottomL); p(11, 36, 8, 1, C.bottomD); p(13, 31, 1, 4, C.bottomD); }
  else if (!C.dress) { p(11, 29, 8, 3, C.bottom); p(11, 29, 8, 1, C.bottomL); p(11, 29, 8, 1, "#0c0c10"); }
  if (C.dress) { p(9, 27, 12, 8, C.top); p(9, 27, 12, 1, tL); p(9, 34, 12, 1, C.topD); }

  ctx.save(); ctx.translate(-M.lean * scale, M.bob * scale);

  if (state !== "shoot" && state !== "knife") { const fa = M.rArm; p(15, 16, 3, 12, bare ? SD : C.topD); p(15, 27 + fa, 3, 2, SD); }

  const hp = C.crop ? 23 : 29;
  p(11, 15, 9, hp - 14, C.out); p(12, 16, 7, hp - 16, C.top); p(12, 16, 2, hp - 16, tL); p(18, 17, 1, hp - 17, C.topD);
  if (C.hood) p(17, 14, 3, 4, C.topD);
  if (C.vest) { p(12, 16, 7, hp - 16, C.vest); p(12, 21, 7, 1, "#d6d9c6"); }
  if (C.plaid) { p(15, 16, 1, hp - 16, C.topD); p(12, 19, 7, 1, C.topD); }
  if (C.tie) p(12, 17, 1, Math.min(9, hp - 17), C.tie);
  if (C.crop) { p(12, 23, 7, 7, SK); p(12, 23, 2, 7, SL); p(11, 25, 1, 3, SK); if (!C.cleanFace) p(18, 23, 1, 7, SD); p(12, 23, 7, 1, SD); }
  if (C.zombie) { if ((C.wounds || 0) >= 1) { p(13, 19, 4, 4, SK); p(13, 19, 1, 1, C.bloodD); if (C.blood) p(12, 22, 2, 2, C.bloodC); } if ((C.wounds || 0) >= 2) p(13, 21, 4, 1, C.boneD); }

  const top = bare ? SK : C.top;
  if (state === "shoot") {
    const f3 = Math.floor(t * 6) % 2 === 0, r3 = f3 ? 1 : 0;
    p(12, 19, 4, 3, top); p(8 + r3, 20, 4, 2, SK); p(5 + r3, 20, 3, 2, "#2a2a2a"); p(7 + r3, 22, 1, 2, "#1c1c1c");
    if (f3) { p(3 + r3, 20, 2, 2, "#ffd24a"); p(4 + r3, 19, 1, 1, "#ffae3a"); }
  } else if (state === "knife") {
    const kk = Math.floor(t * 7) % 3;
    if (kk === 0) { p(12, 16, 4, 3, top); p(9, 14, 3, 2, SK); p(6, 9, 1, 6, "#cfd2d8"); p(7, 9, 1, 6, "#eef0f4"); }
    else if (kk === 1) { p(11, 19, 5, 3, top); p(7, 19, 3, 2, SK); p(2, 18, 5, 1, "#cfd2d8"); p(2, 19, 5, 1, "#eef0f4"); }
    else { p(11, 21, 5, 3, top); p(8, 23, 3, 2, SK); p(5, 24, 1, 4, "#cfd2d8"); p(6, 24, 1, 4, "#eef0f4"); }
  } else {
    const na = M.lArm;
    if (bare) { p(12, 15, 4, 13, C.out); p(13, 16, 3, 11, SK); p(13, 16, 1, 3, SD); p(13, 27 + na, 3, 2, SK); if (C.tattoo) { p(13, 21, 3, 1, "#3a2c2c"); p(13, 23, 2, 1, "#3a2c2c"); } }
    else { p(12, 15, 4, 13, C.out); p(13, 16, 3, 6, C.top); p(13, 16, 1, 6, C.topD); p(13, 22, 3, 5, SK); p(13, 27 + na, 3, 2, SK); if (C.tattoo) p(13, 24, 3, 1, "#3a2c2c"); }
  }

  p(13, 12, 4, 4, SK); p(13, 12, 4, 1, SD);

  // cabeza de perfil
  if (C.fem) {
    const fsp = [[3, 12, 6], [4, 11, 7], [5, 11, 7], [6, 11, 7], [7, 11, 7], [8, 11, 7], [9, 11, 7], [10, 11, 6], [11, 11, 6], [12, 12, 4]];
    for (const s of fsp) p(s[1], s[0], s[2], 1, SK);
    if (!C.cleanFace) p(16, 5, 2, 7, SD);
    p(11, 4, 2, 2, SL); p(10, 8, 1, 2, SK); if (!C.cleanFace) p(10, 9, 1, 1, SD);
    p(11, 10, 2, 1, "#c98876"); p(11, 11, 2, 1, "#b5705f"); p(11, 12, 2, 1, SK); if (!C.cleanFace) p(12, 12, 3, 1, SD);
    hairSide(p, C);
    p(11, 6, 3, 1, C.hairD); p(12, 6, 3, 1, "#3a2a2a");
    p(12, 7, 3, 2, C.eyeW); p(13, 7, 1, 2, C.eye); if (C.eyeliner) p(11, 7, 1, 1, "#1a1a1a");
    if (C.nosering) p(9, 9, 1, 1, "#cfd2d8");
    if (C.freckles) { p(12, 9, 1, 1, C.freckleC); p(13, 9, 1, 1, C.freckleC); }
  } else {
    const sp = [[3, 12, 6], [4, 11, 7], [5, 11, 7], [6, 10, 8], [7, 10, 8], [8, 9, 9], [9, 10, 8], [10, 10, 7], [11, 11, 6], [12, 12, 5]];
    for (const s of sp) p(s[1], s[0], s[2], 1, SK);
    if (!C.cleanFace) p(16, 5, 2, 7, SD);
    p(11, 4, 2, 2, SL); p(9, 8, 1, 1, SK); if (!C.cleanFace) p(10, 9, 1, 1, SD); p(11, 10, 2, 1, SD); if (!C.cleanFace) p(12, 12, 4, 1, SD); p(16, 7, 2, 3, SK);
    if (C.zombie) { p(13, 5, 2, 2, C.rot); p(11, 9, 1, 2, SD); }
    hairSide(p, C);
    if (C.beard) { const B = C.beardColor || C.hair; p(11, 9, 3, 1, B); p(11, 10, 2, 3, B); p(11, 12, 5, 1, B); p(14, 11, 2, 2, B); }
    p(11, 6, 3, 1, C.hairD);
    if (C.zombie) { p(11, 6, 3, 2, SD); p(12, 7, 2, 2, C.eyeW); p(12, 7, 1, 2, C.eye); p(11, 10, 3, 1, C.out); p(11, 10, 1, 1, C.teeth); p(13, 10, 1, 1, C.teeth); if (C.blood) p(11, 12, 1, 2, C.bloodC); }
    else { p(12, 7, 2, 2, C.eyeW); p(12, 7, 1, 2, C.eye); }
  }
  if (C.sunglasses) { p(11, 3, 7, 2, "#161616"); p(12, 3, 2, 1, "#3b4654"); }
  if (C.earring) p(15, 10, 1, 1, "#e8d27a");
  ctx.restore();
}

/**
 * Dibuja un personaje. No limpia el canvas (lo hace tu loop) y respeta la
 * transformación actual del contexto (podés aplicar cámara/zoom por afuera).
 * (x, y) es la esquina superior izquierda del sprite de 32x48 (en px de canvas).
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D, look: CharacterLook, dir: Direction, state: AnimState,
  t: number, scale = 3, x = 0, y = 0,
): void {
  const C = { ...DEFAULTS, ...look } as L;
  const M = computeMotion(state, t);
  const cw = SPRITE_W * scale;

  ctx.save();
  ctx.translate(x, y);
  const p: Painter = (lx, ly, lw, lh, c) => { ctx.fillStyle = c; ctx.fillRect(lx * scale, ly * scale, lw * scale, lh * scale); };

  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(9 * scale, 45 * scale, 14 * scale, 1.6 * scale);

  const side: SideMode = C.side || (C.type === "hero" ? "perfil" : C.zombie ? "perfil" : "tq");

  if (dir === "down") { bodyFB(ctx, p, C, M, "down", false, state, t, scale); }
  else if (dir === "up") { bodyFB(ctx, p, C, M, "up", false, state, t, scale); }
  else if (side === "perfil") {
    if (dir === "right") { ctx.save(); ctx.translate(cw, 0); ctx.scale(-1, 1); bodyProfile(ctx, p, C, M, state, t, scale); ctx.restore(); }
    else bodyProfile(ctx, p, C, M, state, t, scale);
  } else { // tq
    if (dir === "left") { ctx.save(); ctx.translate(cw, 0); ctx.scale(-1, 1); bodyFB(ctx, p, C, M, "down", true, state, t, scale); ctx.restore(); }
    else bodyFB(ctx, p, C, M, "down", true, state, t, scale);
  }
  ctx.restore();
}

/* ========================================================================== */
/*  Controlador de alto nivel                                                 */
/* ========================================================================== */

export interface CharacterOptions {
  scale?: number; speed?: number; runSpeed?: number; stepDuration?: number; attackDuration?: number;
  dir?: Direction;
}

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right",
};

/** Personaje con posición (centro), input y animación. `update(dt)` con dt en segundos. */
export class Character {
  look: CharacterLook;
  x: number; y: number;
  dir: Direction;
  scale: number;
  speed: number;
  runSpeed: number;
  moving = false;

  private t = 0;
  private attackDuration: number;
  private action: "shoot" | "knife" | null = null;
  private actionT = 0;
  private running = false;
  private held: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };
  private order: Direction[] = [];

  get isHero() { return this.look.type === "hero"; }

  constructor(look: CharacterLook, x: number, y: number, opts: CharacterOptions = {}) {
    this.look = look; this.x = x; this.y = y;
    this.scale = opts.scale ?? 3;
    this.speed = opts.speed ?? 70;
    this.runSpeed = opts.runSpeed ?? 130;
    this.attackDuration = opts.attackDuration ?? 0.4;
    this.dir = opts.dir ?? "down";
  }

  press(dir: Direction) { if (!this.held[dir]) { this.held[dir] = true; this.order.push(dir); } }
  release(dir: Direction) { this.held[dir] = false; this.order = this.order.filter((d) => d !== dir); }
  setRunning(v: boolean) { this.running = v; }
  /** Dispara una animación de combate (solo héroes). */
  attack(kind: "shoot" | "knife") { if (this.isHero) { this.action = kind; this.actionT = this.attackDuration; } }

  /** Estado de animación actual (derivado). */
  get state(): AnimState {
    if (this.isHero && this.action) return this.action;
    if (this.moving) return this.isHero && this.running ? "run" : "walk";
    return "idle";
  }

  /** Avanza el estado. Devuelve el desplazamiento aplicado (para chequear colisiones). */
  update(dt: number): { dx: number; dy: number } {
    this.t += dt;
    if (this.action) { this.actionT -= dt; if (this.actionT <= 0) this.action = null; }

    let dx = (this.held.left ? -1 : 0) + (this.held.right ? 1 : 0);
    let dy = (this.held.up ? -1 : 0) + (this.held.down ? 1 : 0);
    this.moving = dx !== 0 || dy !== 0;

    let mx = 0, my = 0;
    if (this.moving) {
      this.dir = this.order[this.order.length - 1] ?? this.dir;
      const len = Math.hypot(dx, dy) || 1;
      const v = this.isHero && this.running ? this.runSpeed : this.speed;
      mx = (dx / len) * v * dt; my = (dy / len) * v * dt;
      this.x += mx; this.y += my;
    }
    return { dx: mx, dy: my };
  }

  /** Limita el centro a un rectángulo (colisión básica con bordes del mapa). */
  clamp(minX: number, minY: number, maxX: number, maxY: number) {
    const hw = (SPRITE_W * this.scale) / 2, hh = (SPRITE_H * this.scale) / 2;
    this.x = Math.max(minX + hw, Math.min(maxX - hw, this.x));
    this.y = Math.max(minY + hh, Math.min(maxY - hh, this.y));
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawCharacter(
      ctx, this.look, this.dir, this.state, this.t, this.scale,
      Math.round(this.x - (SPRITE_W * this.scale) / 2),
      Math.round(this.y - (SPRITE_H * this.scale) / 2),
    );
  }
}

/** Conecta flechas + WASD (mover), Shift (correr), Espacio (disparar), J (cuchillo). Devuelve un detach(). */
export function attachKeyboard(c: Character, target: EventTarget = window): () => void {
  const down = (e: Event) => {
    const k = (e as KeyboardEvent).key;
    const dir = KEY_TO_DIR[k];
    if (dir) { e.preventDefault(); c.press(dir); return; }
    if (k === "Shift") c.setRunning(true);
    else if (k === " ") { e.preventDefault(); c.attack("shoot"); }
    else if (k === "j" || k === "J") c.attack("knife");
  };
  const up = (e: Event) => {
    const k = (e as KeyboardEvent).key;
    const dir = KEY_TO_DIR[k];
    if (dir) { e.preventDefault(); c.release(dir); return; }
    if (k === "Shift") c.setRunning(false);
  };
  target.addEventListener("keydown", down);
  target.addEventListener("keyup", up);
  return () => { target.removeEventListener("keydown", down); target.removeEventListener("keyup", up); };
}

/* ========================================================================== */
/*  Datos de personajes                                                       */
/* ========================================================================== */

export const HEROES: CharacterLook[] = [
  { id: "hero_iara", name: "Iara", type: "hero", side: "tq", fem: true, cleanFace: true, freckleC: "#c06536", freckles: true, eyeliner: true, nosering: true, tattoo: true, crop: true, sleeveless: true, shorts: true, style: "ponytail", skin: "#e7b489", skinD: "#c8916a", skinL: "#f6cda6", hair: "#c8551f", hairD: "#9b3f14", top: "#1c1c1f", topD: "#0f0f11", topL: "#2a2a2e", bottom: "#8aa6cc", bottomD: "#5f7ba6", bottomL: "#a9c0e0", eye: "#3a2a1c", shoe: "#e8e4d8", shoeL: "#ffffff", sole: "#cfcabb" },
  { id: "hero_alejandro", name: "Alejandro", type: "hero", side: "perfil", beard: true, beardColor: "#1b1714", earring: true, tattoo: true, style: "short", hairVolume: true, skin: "#e0aa7e", skinD: "#bd8358", skinL: "#f0c39a", hair: "#1b1714", hairD: "#0a0807", top: "#202028", topD: "#111116", topL: "#34343e", bottom: "#2b3340", bottomD: "#1a2028", bottomL: "#3b4654", eye: "#2a1d12", shoe: "#1d1d22", shoeL: "#2c2c33", sole: "#888888" },
];

export const ZOMBIES: CharacterLook[] = [
  { id: "z_oficinista", name: "Zombie Oficinista", type: "zombie", zombie: true, wounds: 2, blood: true, neckWound: true, eye: "#cf2f29", style: "short", skin: "#aeb59a", skinD: "#8a9079", skinL: "#c3c8b0", rot: "#6f7a5a", hair: "#3a2c1d", hairD: "#241a10", top: "#dfe0d6", topD: "#b9bbae", topL: "#eceddf", tie: "#7a2330", bottom: "#2c2f3a", bottomD: "#1a1c24", bottomL: "#3a3e4b" },
  { id: "z_enfermeria", name: "Zombie Enfermería", type: "zombie", zombie: true, wounds: 2, blood: true, eye: "#cf2f29", style: "messy", skin: "#c2bd86", skinD: "#9d9866", skinL: "#d8d49e", rot: "#7d7a52", hair: "#4a3320", hairD: "#2e2014", top: "#7fb9b3", topD: "#588a85", topL: "#9ccfc9", bottom: "#7fb9b3", bottomD: "#588a85", bottomL: "#9ccfc9" },
  { id: "z_corredor", name: "Zombie Corredor", type: "zombie", zombie: true, wounds: 1, blood: true, armBite: true, eye: "#cf2f29", style: "short", skin: "#a9a59a", skinD: "#85827a", skinL: "#c1bdb2", rot: "#6f6d63", hair: "#1c1815", hairD: "#0d0b09", top: "#d8842a", topD: "#a45f17", topL: "#ec9e44", bottom: "#2a2d33", bottomD: "#191b20", bottomL: "#383c44" },
  { id: "z_hoodie", name: "Zombie Hoodie", type: "zombie", zombie: true, wounds: 1, blood: true, eye: "#cf2f29", style: "messy", hood: true, skin: "#9aa886", skinD: "#76836a", skinL: "#b4c0a2", rot: "#5e6b48", hair: "#2a2a2e", hairD: "#161618", top: "#5a5e66", topD: "#3c3f45", topL: "#71757d", bottom: "#33363d", bottomD: "#1f2127", bottomL: "#43464d" },
  { id: "z_obrero", name: "Zombie Obrero", type: "zombie", zombie: true, wounds: 2, blood: true, beard: true, beardColor: "#2a2014", eye: "#cf2f29", style: "short", vest: "#e3c41f", vestD: "#b89a12", skin: "#8f9a6e", skinD: "#6d774f", skinL: "#a9b389", rot: "#525c36", hair: "#3a2c1d", hairD: "#241a10", top: "#3a3d44", topD: "#23262c", topL: "#4c5058", bottom: "#4a3f2a", bottomD: "#2f2719", bottomL: "#5e5136" },
  { id: "z_vestido", name: "Zombie Vestido", type: "zombie", zombie: true, wounds: 1, blood: true, fem: true, dress: true, sleeveless: true, eye: "#cf2f29", style: "long", skin: "#a896a0", skinD: "#84727c", skinL: "#c1afb9", rot: "#6e5d67", hair: "#241a16", hairD: "#140d0a", top: "#9b2f3a", topD: "#6f1f28", topL: "#b8434e", shoe: "#3a2a2c" },
  { id: "z_anciano", name: "Zombie Anciano", type: "zombie", zombie: true, wounds: 2, eye: "#c9c4b0", pupil: "#8a857a", style: "balding", skin: "#bcb9ab", skinD: "#97948a", skinL: "#d2cfc2", rot: "#7c7a6e", hair: "#cfccc4", hairD: "#a8a59c", top: "#9a8f78", topD: "#766c58", topL: "#b3a98f", bottom: "#4a4640", bottomD: "#2e2b27", bottomL: "#5c574f" },
  { id: "z_punk", name: "Zombie Punk", type: "zombie", zombie: true, wounds: 2, blood: true, eye: "#cf2f29", style: "mohawk", skin: "#aeb0a2", skinD: "#888a7d", skinL: "#c6c8ba", rot: "#6c6e60", hair: "#2fae9a", hairD: "#1f7a6c", top: "#1b1b1f", topD: "#0e0e11", topL: "#29292e", bottom: "#26262b", bottomD: "#151518", bottomL: "#34343a" },
  { id: "z_lenador", name: "Zombie Leñador", type: "zombie", zombie: true, wounds: 2, blood: true, armBite: true, beard: true, beardColor: "#2c2012", eye: "#cf2f29", style: "messy", plaid: true, skin: "#97a276", skinD: "#737d56", skinL: "#b1bb90", rot: "#56603a", hair: "#3a2a1a", hairD: "#241a10", top: "#a83a32", topD: "#6e2420", topL: "#c14d44", bottom: "#3a4150", bottomD: "#232934", bottomL: "#4a5263" },
  { id: "z_fresh", name: "Zombie Recién convertido", type: "zombie", zombie: true, wounds: 1, blood: true, neckWound: true, eye: "#c9c4b0", pupil: "#8f8a7e", style: "short", skin: "#cbb9a4", skinD: "#a8967f", skinL: "#e0d0bd", rot: "#8a7a66", hair: "#2a221c", hairD: "#15110d", top: "#3f6fae", topD: "#2b5184", topL: "#5685c4", bottom: "#2a2d33", bottomD: "#191b20", bottomL: "#383c44" },
];

export const NPCS: CharacterLook[] = [
  { id: "npc_vecina", name: "Vecina", type: "npc", fem: true, style: "long", skin: "#e7b489", skinD: "#c8916a", skinL: "#f6cda6", hair: "#4a3320", hairD: "#2e2014", top: "#3f7d56", topD: "#2c5a3e", topL: "#519a6c", bottom: "#6f86a8", bottomD: "#4c627e", bottomL: "#8aa1c0", eye: "#3a2a1c", shoe: "#d8d2c4", sole: "#ffffff" },
  { id: "npc_quiosquero", name: "Quiosquero", type: "npc", beard: true, beardColor: "#1b1714", style: "short", skin: "#cf9a6a", skinD: "#ad7c4e", skinL: "#e3b486", hair: "#1b1714", hairD: "#0a0807", top: "#2f5e8c", topD: "#1f4063", topL: "#4076a8", bottom: "#2c2f3a", bottomD: "#1a1c24", bottomL: "#3a3e4b", eye: "#2a1d12", shoe: "#2a2a2a" },
  { id: "npc_estudiante", name: "Estudiante", type: "npc", fem: true, style: "ponytail", hood: true, skin: "#c2a070", skinD: "#9d7f53", skinL: "#d8b98a", hair: "#1b1714", hairD: "#0a0807", top: "#6a4f8c", topD: "#4a3663", topL: "#8064a8", bottom: "#33363d", bottomD: "#1f2127", bottomL: "#43464d", eye: "#3a2a1c", shoe: "#e8e4d8", sole: "#ffffff" },
  { id: "npc_jubilado", name: "Jubilado", type: "npc", glasses: true, style: "balding", skin: "#e7b489", skinD: "#c8916a", skinL: "#f6cda6", hair: "#b8b4ab", hairD: "#928e85", top: "#9a8f78", topD: "#766c58", topL: "#b3a98f", bottom: "#4a3b2a", bottomD: "#2f261a", bottomL: "#5e4d36", eye: "#3a2a1c", shoe: "#3a2f22" },
  { id: "npc_skater", name: "Skater", type: "npc", style: "mohawk", skin: "#cf9a6a", skinD: "#ad7c4e", skinL: "#e3b486", hair: "#2fae9a", hairD: "#1f7a6c", top: "#1b1b1f", topD: "#0e0e11", topL: "#29292e", bottom: "#26262b", bottomD: "#151518", bottomL: "#34343a", eye: "#2a1d12", shoe: "#1d1d22", shoeL: "#2c2c33" },
  { id: "npc_maestra", name: "Maestra", type: "npc", fem: true, dress: true, sleeveless: true, style: "ponytail", skin: "#e7b489", skinD: "#c8916a", skinL: "#f6cda6", hair: "#4a3320", hairD: "#2e2014", top: "#9b2f3a", topD: "#6f1f28", topL: "#b8434e", eye: "#3a2a1c", shoe: "#3a2a2c" },
  { id: "npc_oficinista", name: "Oficinista", type: "npc", glasses: true, tie: "#2b4a7a", style: "short", skin: "#e7b489", skinD: "#c8916a", skinL: "#f6cda6", hair: "#3a2a1a", hairD: "#241a10", top: "#dfe0d6", topD: "#b9bbae", topL: "#eceddf", bottom: "#2c2f3a", bottomD: "#1a1c24", bottomL: "#3a3e4b", eye: "#2a1d12", shoe: "#2a2a2a" },
  { id: "npc_pelirroja", name: "Pelirroja", type: "npc", fem: true, freckles: true, freckleC: "#c06536", cleanFace: true, style: "long", skin: "#e7b489", skinD: "#c8916a", skinL: "#f6cda6", hair: "#c8551f", hairD: "#9b3f14", top: "#c98aa6", topD: "#9c6480", topL: "#dca6bf", bottom: "#6f86a8", bottomD: "#4c627e", bottomL: "#8aa1c0", eye: "#3a2a1c", shoe: "#e8e4d8", sole: "#ffffff" },
  { id: "npc_repartidor", name: "Repartidor", type: "npc", style: "short", vest: "#e3c41f", vestD: "#b89a12", skin: "#9c6b44", skinD: "#7a4f30", skinL: "#b5825a", hair: "#1b1714", hairD: "#0a0807", top: "#3a3d44", topD: "#23262c", topL: "#4c5058", bottom: "#4a3f2a", bottomD: "#2f2719", bottomL: "#5e5136", eye: "#2a1d12", shoe: "#2a2a2a" },
  { id: "npc_senora", name: "Señora", type: "npc", fem: true, dress: true, sleeveless: true, style: "long", skin: "#70492f", skinD: "#523322", skinL: "#8c6042", hair: "#1b1714", hairD: "#0a0807", top: "#2f7d86", topD: "#1f5760", topL: "#409aa3", eye: "#241712", shoe: "#2a2a2a" },
  { id: "npc_pibe", name: "Pibe", type: "npc", style: "messy", hood: true, shorts: true, skin: "#c2a070", skinD: "#9d7f53", skinL: "#d8b98a", hair: "#3a2a1a", hairD: "#241a10", top: "#5a5e66", topD: "#3c3f45", topL: "#71757d", bottom: "#33363d", bottomD: "#1f2127", bottomL: "#43464d", eye: "#3a2a1c", shoe: "#1d1d22", shoeL: "#2c2c33" },
  { id: "npc_rubia", name: "Rubia", type: "npc", fem: true, sleeveless: true, shorts: true, style: "long", skin: "#e7b489", skinD: "#c8916a", skinL: "#f6cda6", hair: "#c9a14a", hairD: "#9c7a2f", top: "#d8842a", topD: "#a45f17", topL: "#ec9e44", bottom: "#8aa6cc", bottomD: "#5f7ba6", bottomL: "#a9c0e0", eye: "#3a2a1c", shoe: "#e8e4d8", sole: "#ffffff" },
];

/** Todos los personajes accesibles por id. */
export const ALL_LOOKS: CharacterLook[] = [...HEROES, ...ZOMBIES, ...NPCS];
export const CHARACTERS: Record<string, CharacterLook> = Object.fromEntries(ALL_LOOKS.map((l) => [l.id, l]));

/** Crea un controlador a partir de un id de personaje. */
export function spawn(id: string, x: number, y: number, opts?: CharacterOptions): Character {
  const look = CHARACTERS[id];
  if (!look) throw new Error(`Personaje desconocido: ${id}`);
  return new Character(look, x, y, opts);
}

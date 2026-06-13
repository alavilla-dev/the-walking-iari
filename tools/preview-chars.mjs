import { PNG } from "pngjs";
import fs from "fs";

// Paleta (hex). Mayúsculas/minúsculas = tono/sombra.
const PAL = {
  // Iara
  H: 0xc24a28, h: 0x8f3318, J: 0xe2703f,       // pelo colorado
  S: 0xf6c9a0, K: 0xdda276, f: 0xc97a4a,       // piel / sombra / peca
  E: 0x2a2018, m: 0xa8503f, W: 0xffffff,       // ojo / boca / blanco
  T: 0x2f7d72, t: 0x215a52,                    // top de Iara (verde agua)
  P: 0x35506f, p: 0x2a4159,                    // jeans
  O: 0x232026,                                 // zapatos
  // Ale
  D: 0x2b2622, d: 0x1c1814,                    // pelo oscuro
  b: 0x3a2a20,                                 // barba
  G: 0x586475, g: 0x434c59,                    // remera de Ale
};

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

function validate(name, rows) {
  rows.forEach((r, i) => {
    if (r.length !== 16) throw new Error(`${name} fila ${i} mide ${r.length} (debe 16): "${r}"`);
  });
  if (rows.length !== 24) throw new Error(`${name} tiene ${rows.length} filas (debe 24)`);
}
validate("IARA", IARA);
validate("ALE", ALE);

const PX = 10;            // tamaño de cada "pixel"
const GW = 16, GH = 24;   // grilla
const GAP = 40;
const MARGIN = 24;
const cellW = GW * PX, cellH = GH * PX;
const W = MARGIN * 2 + cellW * 2 + GAP;
const H = MARGIN * 2 + cellH;
const png = new PNG({ width: W, height: H });

// Fondo gris azulado.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) << 2;
    png.data[i] = 0x2a; png.data[i + 1] = 0x2c; png.data[i + 2] = 0x34; png.data[i + 3] = 0xff;
  }
}

function stamp(rows, originX, originY) {
  for (let gy = 0; gy < rows.length; gy++) {
    for (let gx = 0; gx < rows[gy].length; gx++) {
      const c = PAL[rows[gy][gx]];
      if (c === undefined) continue;
      const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
      for (let py = 0; py < PX; py++) {
        for (let px = 0; px < PX; px++) {
          const X = originX + gx * PX + px, Y = originY + gy * PX + py;
          const i = (Y * W + X) << 2;
          png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 0xff;
        }
      }
    }
  }
}

stamp(IARA, MARGIN, MARGIN);
stamp(ALE, MARGIN + cellW + GAP, MARGIN);

const out = "preview-chars.png";
fs.writeFileSync(out, PNG.sync.write(png));
console.log("OK ->", out, `${W}x${H}`);

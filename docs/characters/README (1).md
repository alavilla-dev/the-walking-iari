# Look System — Guía de integración

Sistema de personajes pixel-art (estilo RPG Maker, vista 3/4 cenital) en TypeScript, sin dependencias.

- `characters.ts` — el sistema completo: tipos, motor de dibujo, controlador y los 24 personajes.
- `example.ts` — mini juego funcional de referencia.

Resolución lógica: **32 × 48** "pixeles", escalada por `scale` (cada pixel lógico = `scale` pixeles reales).

---

## 1. Instalación

Copiá `characters.ts` a tu proyecto e importalo. Compila con cualquier bundler (Vite, esbuild, tsc). No tiene dependencias.

```typescript
import { spawn, attachKeyboard, drawCharacter, CHARACTERS } from "./characters";
```

---

## 2. Uso básico

```typescript
const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;          // imprescindible para pixel-art nítido
canvas.style.imageRendering = "pixelated";  // idem

const player = spawn("hero_iara", 400, 300, { scale: 3, speed: 80 });
attachKeyboard(player);

let last = performance.now();
function loop(now: number) {
  const dt = (now - last) / 1000;   // dt SIEMPRE en segundos
  last = now;

  player.update(dt);
  player.clamp(0, 0, canvas.width, canvas.height);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  player.draw(ctx);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### Las 3 cosas que no podés saltear

1. **`dt` en segundos.** Hace que la velocidad sea independiente del framerate. `speed: 80` = 80 px/seg corra a los FPS que corra.
2. **`image-rendering: pixelated`** en el canvas (y `imageSmoothingEnabled = false` en el contexto). Sin esto el pixel-art sale borroso al escalar.
3. **Orden por profundidad.** Dibujá los personajes ordenados por `y` (menor primero) para que los de adelante tapen a los de atrás:
   ```typescript
   const all = [player, ...enemigos].sort((a, b) => a.y - b.y);
   for (const c of all) c.draw(ctx);
   ```

---

## 3. Controles (con `attachKeyboard`)

| Tecla | Acción |
|---|---|
| Flechas / WASD | Mover (4 direcciones) |
| Shift | Correr (solo héroes) |
| Espacio | Disparar (solo héroes) |
| J | Cuchillo (solo héroes) |

`attachKeyboard(character, target?)` devuelve una función `detach()` para desconectar los listeners.

### Sin `attachKeyboard` (tu propio input manager)

Si tu motor ya maneja el teclado, ignorá el helper y llamá directo:

```typescript
player.press("up");          // empezar a mover hacia arriba
player.release("up");        // dejar de mover hacia arriba
player.setRunning(true);     // correr (héroe)
player.attack("shoot");      // disparar (héroe)
player.attack("knife");      // cuchillo (héroe)
```

---

## 4. API del controlador `Character`

```typescript
const c = spawn(id, x, y, opts);
// o:  const c = new Character(look, x, y, opts);
```

`x` e `y` son el **centro** del sprite (conviene para ordenar por profundidad con `y`).

**Opciones (`CharacterOptions`):**

| Campo | Default | Qué es |
|---|---|---|
| `scale` | 3 | tamaño de un pixel lógico |
| `speed` | 70 | velocidad al caminar (px/seg) |
| `runSpeed` | 130 | velocidad al correr (px/seg) |
| `attackDuration` | 0.4 | duración de la animación de combate (seg) |
| `dir` | `"down"` | dirección inicial |

**Métodos:**

- `update(dt)` → avanza la animación y el movimiento. Devuelve `{ dx, dy }` (el desplazamiento aplicado en este frame). **Llamalo una vez por frame.**
- `draw(ctx)` → dibuja el personaje en su posición.
- `clamp(minX, minY, maxX, maxY)` → limita el centro a un rectángulo (colisión simple con los bordes del mapa).
- `press(dir)` / `release(dir)` / `setRunning(bool)` / `attack("shoot" | "knife")`.

**Propiedades útiles:** `c.x`, `c.y`, `c.dir`, `c.state` (estado de animación derivado), `c.isHero`.

---

## 5. Colisión con un mapa de tiles

`update(dt)` devuelve el desplazamiento, así que podés validarlo contra tu grilla antes de confirmarlo:

```typescript
const before = { x: c.x, y: c.y };
const { dx, dy } = c.update(dt);

// chequeá el tile destino con tu propia función:
if (tileBloqueado(c.x, c.y)) {
  c.x = before.x;   // revertir si choca
  c.y = before.y;
}
```

Para algo más fino, podés revertir solo el eje que choca (mover X, chequear; mover Y, chequear) y así deslizar contra las paredes.

---

## 6. Personajes incluidos (ids)

**Héroes** (idle / walk / run / shoot / knife · 4 direcciones):
`hero_iara`, `hero_alejandro`

**Zombies** (idle / walk):
`z_oficinista`, `z_enfermeria`, `z_corredor`, `z_hoodie`, `z_obrero`, `z_vestido`, `z_anciano`, `z_punk`, `z_lenador`, `z_fresh`

**NPCs** (idle / walk):
`npc_vecina`, `npc_quiosquero`, `npc_estudiante`, `npc_jubilado`, `npc_skater`, `npc_maestra`, `npc_oficinista`, `npc_pelirroja`, `npc_repartidor`, `npc_senora`, `npc_pibe`, `npc_rubia`

Acceso por id: `CHARACTERS["z_punk"]`. Listas completas: `HEROES`, `ZOMBIES`, `NPCS`, `ALL_LOOKS`.

> Aunque el motor de dibujo soporta `shoot`/`knife`/`run` para cualquiera, el controlador solo se los permite a los héroes. Zombies y NPCs ignoran esos estados.

---

## 7. Dibujar sin controlador

Si querés dibujar un cuadro suelto (sprite estático, editor, hoja de sprites):

```typescript
import { drawCharacter, CHARACTERS } from "./characters";

// (ctx, look, dir, state, t, scale, x, y)
drawCharacter(ctx, CHARACTERS.hero_iara, "left", "walk", performance.now() / 1000, 4, 50, 50);
```

`t` es el tiempo en segundos (de ahí salen los frames de la animación). No limpia el canvas ni resetea transformaciones: respeta la cámara/zoom que tengas aplicada al `ctx`.

---

## 8. Agregar o editar personajes

Un personaje es solo un objeto `CharacterLook`. Copiá uno parecido, cambiá colores y flags, y sumalo al array. **No hay que tocar el código de dibujo.**

```typescript
import { Character, type CharacterLook } from "./characters";

const miNpc: CharacterLook = {
  id: "npc_panadero", name: "Panadero", type: "npc",
  style: "short", beard: true, beardColor: "#3a2a1a",
  skin: "#cf9a6a", skinD: "#ad7c4e", skinL: "#e3b486",
  hair: "#3a2a1a", hairD: "#241a10",
  top: "#e8e4d8", topD: "#c4c0b4", topL: "#f4f1e8",
  bottom: "#3a3d44", bottomD: "#23262c", bottomL: "#4c5058",
  eye: "#2a1d12", shoe: "#2a2a2a",
};

const p = new Character(miNpc, 100, 100, { scale: 3 });
```

**Flags principales de `CharacterLook`:**

- Piel: `skin`, `skinD`, `skinL`
- Pelo: `hair`, `hairD`, `style` (`short`/`messy`/`ponytail`/`long`/`balding`/`mohawk`/`bald`), `hairVolume`
- Torso: `top`, `topD`, `topL`; modificadores `sleeveless`, `crop`, `dress`, `hood`, `vest`+`vestD`, `plaid`, `tie`
- Piernas: `bottom`, `bottomD`, `bottomL`, `shorts`
- Calzado: `shoe`, `shoeL`, `sole`
- Cara: `beard`+`beardColor`, `glasses`, `sunglasses`, `earring`, `eyeliner`, `nosering`, `freckles`+`freckleC`, `cleanFace` (sin sombras en la cara), `fem` (perfil femenino más suave)
- Zombie: `zombie`, `wounds` (0–2), `blood`, `armBite`, `neckWound`, y colores `rot`/`bloodC`/`bloodD`/`bone`/`boneD`/`teeth`
- Lado: `side` → `"tq"` (3/4, recomendado para mujeres) o `"perfil"`

---

## 9. Nota honesta

Los sprites se validaron a ojo de a uno en el preview. Cuando los veas a todos en movimiento en tu juego, es probable que quieras retocar algún color o pixel puntual de alguna pose. Todo eso se ajusta desde los datos del `look` (colores/flags) o desde las funciones de dibujo de `characters.ts`, que están separadas justamente para eso.

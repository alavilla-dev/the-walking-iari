# The Walking Iari

Juego de acción/historia (zombies en Morón) hecho con **Phaser 3 + TypeScript + Vite**.
Iara espera a Ale la noche del brote y tiene que cruzar la ciudad hasta la Municipalidad.

---

## Arrancar el proyecto (PC nueva)

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest (34 tests)
npm run build    # tsc --noEmit + vite build
```

Rutas por hash (saltean el flujo normal):
- `http://localhost:5173/` → título
- `http://localhost:5173/#apt` → depto de Iara (saltea intro)
- `http://localhost:5173/#lab` → **sandbox de combate** (todas las mecánicas)

> Nota: cada vez que se guarda un archivo, Vite recarga la página entera (Phaser no
> tiene hot-reload), así que el juego vuelve al título/escena inicial. Es normal.

### Controles (sandbox `#lab`)
- **WASD/flechas** mover · **Shift** correr
- **Clic izq** usar arma · **1-4** cambiar arma · **rueda** ciclar · **R** recargar · **Q** curar
- **I** mochila (equipar armas / usar botiquín) · **J** diario · **O** opciones
- Debug: **Z/N/B** spawn zombie · **H** oleada de prueba · **X** +XP · **G/L** guardar/cargar
- En el depto: **E/Espacio** interactuar · **K** ver hitboxes

---

## Cómo está organizado

```
src/
  main.ts                 # config del juego (RENDER_SCALE = supersampling)
  config.ts               # TODAS las constantes (velocidades, daño, puntería, niebla...)
  scenes/
    BootScene, PreloadScene, TitleScene
    ApartmentScene.ts     # el depto (historia, colisión/profundidad por color, música tele)
    LabScene.ts           # sandbox de combate (referencia de TODAS las mecánicas)
    HudScene.ts           # HUD (overlay): personaje, arma, diálogos, mochila, modales
    GameHost.ts           # contrato que el HUD observa (cualquier escena de juego)
  entities/
    Player.ts, Zombie.ts, Bullet.ts   # usan el Look System para dibujarse
  look/
    characters.ts         # Look System (Canvas2D): drawCharacter + 24 personajes
    LookTexture.ts         # puente Phaser↔Canvas: textura-canvas refrescada por frame
  systems/
    ColorMap.ts           # mapas de color → hitboxes (rojo/negro) y y-sorting (gris)
    FogOfWar.ts           # niebla de descubrimiento (cono direccional), por escena
    Loadout.ts            # armas equipadas + munición + recarga
    WaveManager.ts        # oleadas DISPARABLES a pedido (modo historia, no automáticas)
    Vfx.ts                # sangre, números de daño, fogonazo, manchas, shake
    Sfx.ts                # audio sintetizado (disparos, pasos, base de techno, etc.)
    ProgressionModel.ts   # nivel/XP/PS + puntería (aim())
    SaveSystem.ts, InventoryModel.ts, DialogueRunner.ts, Cutscene.ts
  data/ weapons.ts, items.ts, sampleDialogue.ts
docs/
  characters/             # fuente original del Look System + README de uso
  maps/                   # RENDERS de los próximos niveles (ver TODO)
public/tiles/depto/       # render.png + collision.jpg + depth.jpg del depto
tools/                    # scripts de preview (preview-looks.ts con vite-node, etc.)
```

### Conceptos clave
- **RENDER_SCALE**: el canvas se renderiza a 2× la resolución lógica (640×480) para que
  el HUD/texto salga nítido; los sprites mantienen filtro NEAREST (pixel-art). Cada escena
  usa 640×480 como espacio lógico (`crispUI` / `crispWorld` en `ui/uikit.ts`).
- **Mapas de color** (depto): `collision.jpg` (rojo=mueble, negro=pared) → hitboxes;
  `depth.jpg` (degradado gris) → profundidad/y-sorting por mueble.
- **Look System**: personajes pixel-art animados (idle/walk/run/shoot/knife, 4 direcciones)
  dibujados por código. Para agregar/editar uno: es un objeto `CharacterLook` (ver
  `docs/characters/README (1).md`).

---

## TODO / pendiente

### 1. Niveles (lo próximo)
Los renders están en `docs/maps/` (1024×575, salvo `edificio_dentro` 1024×694). Son
**solo renders** — falta la colisión. Recorrido de la historia:

`depto` → `edificio_dentro` (ascensor/escaleras) → `edificio_fuera` → `calle` / `casa`
→ `cruce sarmiento` → `municipalidad` (destino).

- [ ] Decidir colisión: **(A)** mapas de color por nivel (como el depto) **o** **(B)** rectángulos
      a mano por render. (Pendiente de definir con Ale.)
- [ ] Crear una **`StreetScene` genérica** (carga render + colisión + puntos de entrada/salida)
      en vez de una escena por mapa.
- [ ] Mover el render del depto y los nuevos a `public/tiles/...` y cargarlos en Preload.
- [ ] Transiciones entre mapas (puertas/bordes → cambiar de escena con fade).

### 2. Eventos / desbloqueos (después de los niveles)
- [ ] Sistema de **triggers por zona** (pisás un área → diálogo / spawn / abrir puerta).
- [ ] Disparar **oleadas scripteadas** en beats de la historia (ya existe `WaveManager.trigger()`).
- [ ] Flags de progreso / qué desbloquea qué (llaves, puertas, objetivos del Diario).

### 3. HUD / UX
- [ ] **Hub de acciones** (ícono de mochila, etc.) — reemplaza el menú superior que se quitó.
      Por ahora las acciones están en atajos: I/J/O. Falta re-exponer **Guardar**.
- [ ] Game over real (hoy el jugador revive en el centro en el Lab).

### 4. Combate en la historia
- [ ] Llevar el combate del Lab a un mapa real cuando haya un nivel listo
      (loadout + grupos de balas/zombies + handlers ya están desacoplados).
- [ ] Conseguir armas/munición como loot dentro de la historia (ya funciona en el Lab).

### 5. Pulido / varios
- [ ] Afinar posición de la **tele** del depto (`tvPos` en `ApartmentScene`, hoy frente al sillón).
- [ ] Conectar **Cargar partida** del título para que aplique el estado guardado.
- [ ] (Perf) Si alguna vez hay multitudes de personajes, hornear sprite sheets en vez
      de refrescar textura-canvas por frame (ver `LookTexture.ts`).

---

## Notas
- El commit anterior quedó firmado con `alavilla@cepem.network` (config local de git).
  Si querés unificar: `git config user.email "alejandro.lavilla98@gmail.com"`.
- `preview-chars.png` / `preview-looks.png` son artefactos de los scripts de `tools/`
  (se regeneran; se pueden borrar sin problema).

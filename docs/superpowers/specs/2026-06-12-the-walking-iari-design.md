# The Walking Iari — Documento de Diseño

**Fecha:** 2026-06-12
**Estado:** Diseño aprobado (base + sistemas). Listo para plan de implementación.
**Alcance de este spec:** Fundaciones del juego + **Capítulo 1: "El comienzo"** (escenario: el depto).

---

## 1. Visión

Un juego de navegador, **pixel-art top-down**, donde jugás como **Iara** en una historia de amor y supervivencia zombie ambientada en lugares reales de la pareja (el departamento, Morón – Buenos Aires, Argentina). La experiencia es **50/50**: mitad emoción/narrativa, mitad acción/supervivencia.

Es un proyecto personal, pensado como un regalo y una historia atrapante. Se irá refinando iterativamente; este documento cubre las fundaciones técnicas y el primer trozo jugable.

## 2. Personajes

- **Iara** (protagonista jugable, 23 años, 1.50): colorada/pelirroja, pelo ondulado a los hombros (a veces atado en colita), pecas marcadas, ojos marrones, piercing en la nariz, delineado, collar de perlas, tatuajes en el brazo (estrellita, un "23"). Suele usar tops negros.
- **Alejandro** (28 años, alto): morocho de pelo oscuro ondulado y voluminoso con algunas canas, barba candado, contextura grande, remeras oversize, tatuajes en los antebrazos (un gallo).
- **Marfil** y **Venus**: los dos gatos. Viven en el depto. Interactuables (beats emotivos).
- **El papá de Iara**: personaje secundario (aparece por llamadas/diálogos en el Cap. 1).

Referencias de imagen guardadas en la raíz del proyecto (fotos reales de los personajes y un mockup objetivo del HUD/depto).

## 3. Dirección de arte

- **Estilo:** pixel-art moderno HD top-down, cálido y detallado, estilo *LimeZu "Modern Interiors"* (es el look exacto de la imagen de referencia objetivo).
- **Pipeline de assets:** se arranca con **placeholders gratuitos** para tener jugabilidad andando, y se hace **swap a LimeZu Modern Interiors** (y más adelante Modern Exteriors + UI) cuando el pack esté disponible. La capa de assets está desacoplada de la lógica → el swap no requiere reescribir código.
- **Fotos reales:** entran como **imágenes chicas estáticas** (no como tileset): cuadros en la pared, pantalla del TV, pantalla del celular en llamadas, y especialmente los **Recuerdos** del diario (fotos reales pixeladas de la pareja). Los **retratos del HUD** se generan pixelando las fotos reales.

## 4. Stack técnico

- **Motor:** Phaser 3 (juegos 2D en navegador).
- **Lenguaje:** TypeScript (mantenibilidad y fiabilidad).
- **Build/dev:** Vite.
- **Mapas:** Tiled (editor de mapas gratis) → tilemaps JSON.
- **Guardado:** `localStorage` (sin servidor; todo corre en el navegador).
- **Distribución:** corre en cualquier navegador moderno; publicable luego en itch.io / GitHub Pages.

## 5. Arquitectura

Modular: cada pieza se entiende y se prueba por separado, comunicándose por interfaces claras.

**Escenas Phaser:**
- `Boot` / `Preload` — carga de assets.
- `Title` — pantalla de título, nueva/cargar partida.
- `World` — el mapa que se juega (recibe qué mapa cargar).
- `HUD` — capa de interfaz que corre encima del World.
- `Dialogue` — overlay de cajas de diálogo y escenas scripteadas.

**Sistemas (módulos independientes):**
- `Player` — movimiento (8 direcciones), animación, combate cuerpo a cuerpo, stamina/sprint.
- `InputManager` — teclado (WASD/flechas) + mouse (apuntar).
- `DialogueSystem` — lee guiones desde JSON; soporta retratos, nombres y opciones de respuesta.
- `EventSystem` — eventos scripteados (la cena, las llamadas, el disparo del brote) disparados por triggers/progreso.
- `InventorySystem` (Mochila) — armas, curaciones, munición (futuro), y **items narrativos**.
- `SaveSystem` — serialización del estado a `localStorage`, múltiples slots.
- `ZombieAI` — estados idle → perseguir → atacar; detección por cercanía.
- `InteractableSystem` — objetos del mundo con los que se habla/examina; gatos.
- `SceneTransition` — cambios de mapa/escena.
- `ProgressionSystem` — Nivel, XP, PS máximo, puntos y árbol de habilidades.

**Data-driven:** diálogos, items, eventos y configuración de personajes viven en **archivos JSON**; los mapas en **Tiled**. Así se puede cambiar la historia/contenido sin tocar el motor.

## 6. Sistemas de juego

### 6.1 Movimiento y combate
- Top-down libre, 8 direcciones; animación de caminar en las 4 orientaciones.
- **Sprint** con botón, limitado por stamina (o limitado al inicio).
- **Combate (Cap. 1 = solo cuerpo a cuerpo):** cuchillo de cocina / bate. Apuntás con el mouse; Iara mira hacia donde apunta. **Las armas de fuego llegan mucho más adelante** (no en el Cap. 1).
- **Armas se encuentran en el mundo.**

### 6.2 Zombies
- **Lentos pero eficaces.** Detección por cercanía/ruido; se acercan despacio; al tocar a Iara le bajan **PS**. Pocos pero peligrosos en grupo.
- IA simple: idle → perseguir → atacar.

### 6.3 Daño y muerte
- Si **PS** llega a 0, Iara "cae" → reaparece en el último **guardado** (sin game-over frustrante).

### 6.4 Progresión
- **Nivel (Nv) y XP:** se gana matando zombies y avanzando la historia. Subir de nivel aumenta el **PS máximo** y otorga **puntos de habilidad**.
- **Habilidades (árbol chico):** +vida, recarga más rápida (futuro, con armas de fuego), mejor manejo/puntería, sprint más largo, hacer menos ruido. En el Cap. 1 se introducen pocas.

### 6.5 Mochila (inventario) — sistema central
- **Inventario** de: armas, curaciones (botiquín, comida), y a futuro munición.
- **Items narrativos** que **construyen la historia**: fotos de la pareja, notas, el celular, llaves, objetos de recuerdo. Examinarlos puede disparar diálogo/recuerdos.
- Curarse consume un item y recupera PS.

### 6.6 HUD (estilo Pokémon, ajustable)
- **Arriba-izq:** nombre del lugar (ej. *"Depto. Hogar — Morón"*).
- **Arriba-der:** menú → **Diario/Recuerdos** · **Mochila** · **Guardar** · **Opciones** · **Salir**.
- **Abajo-izq:** retrato de Iara + **Nv** + barra de **PS**.
- **Abajo-der:** caja de **diálogo** (nombre + texto + opciones cuando aplique).
- *Nota:* el HUD se irá ajustando visualmente más adelante.

### 6.7 Diario / Recuerdos (corazón emotivo)
- Reemplaza la "Pokédex". Registra avances de la historia y **desbloquea "Recuerdos"**: momentos de amor y flashbacks (cómo se conocieron, fechas, los gatos), cada uno con su **foto real pixelada**. Es donde vive la mitad "amor".

### 6.8 Gatos: Marfil y Venus
- En el depto; **acariciables/interactuables** (beats emotivos, diálogo tierno).
- En el tutorial ayudan a enseñar la interacción. Posible rol narrativo más adelante.

### 6.9 Diálogos y eventos
- Cajas con retratos y nombres, **opciones** de respuesta, **eventos scripteados** (cena, llamadas, brote). Definidos en **JSON**.

### 6.10 Guardado
- **Guardar** desde el menú (y/o puntos de guardado). Serializa: posición, PS/Nv/XP, inventario, progreso de historia, recuerdos desbloqueados, estado de los gatos. Múltiples slots en `localStorage`.

## 7. Capítulo 1 — "El comienzo" (primer trozo jugable)

Escenario principal: **el depto**. Bien pulido. Flujo:

1. **Pantalla de título** → nueva/cargar partida.
2. **Intro tranquila (la noche):** Ale e Iara en el depto — cena, cosas cotidianas juntos. Funciona de **tutorial**: moverse, interactuar con objetos, conocer a Marfil y Venus. Se van a dormir.
3. **La mañana:** Ale se va temprano; Iara despierta sola. **Empieza lo raro:** llamada(s) (incl. el papá de Iara), diálogos, señales del brote.
4. **Primer susto / primer zombie** + **primera arma cuerpo a cuerpo** (objeto de la casa) → introducción al combate.
5. **Cliffhanger:** termina cuando Iara llega a la **puerta del edificio** para salir (engancha con el próximo trozo: escapar del edificio y, luego, llegar a la **Municipalidad de Morón**).

Entregable: **todos los sistemas centrales funcionando** (movimiento, animación, diálogos, HUD, mochila, guardado, combate cuerpo a cuerpo básico) sobre el escenario del depto.

## 8. Fuera de alcance (capítulos/iteraciones futuras)

- Escapar del edificio; calle; llegada a la Municipalidad de Morón.
- Armas de fuego y munición.
- Árbol de habilidades extendido.
- Swap final a assets LimeZu (se hace cuando el pack esté disponible; la arquitectura ya lo contempla).
- Refinamiento visual final del HUD y pulido estético general.
- Capítulos 2+.

## 9. Criterios de éxito del Cap. 1

- El depto es jugable de punta a punta: intro nocturna → mañana → brote → cliffhanger en la puerta.
- Iara se mueve y anima con fluidez; se interactúa con objetos y gatos.
- El sistema de diálogos/eventos reproduce la intro y las llamadas.
- La mochila guarda items (incluidos narrativos) y curaciones.
- Combate cuerpo a cuerpo contra al menos un zombie funciona; PS y muerte/respawn funcionan.
- Se puede **guardar y cargar** la partida correctamente.
- Swap de placeholder → LimeZu posible sin tocar la lógica.

export const TILE = 32;

// Resolución lógica del juego (lo que "diseñamos"): 20x15 tiles = 640x480.
export const LOGICAL_W = 20 * TILE;
export const LOGICAL_H = 15 * TILE;
// Supersampling: el canvas se renderiza a LOGICAL * RENDER_SCALE para que el
// texto/HUD salga nítido, mientras los sprites mantienen el filtro NEAREST.
// Cada escena usa 640x480 como espacio lógico (zoom de cámara = RENDER_SCALE).
export const RENDER_SCALE = 2;

// Jugador
export const PLAYER_BASE_PS = 20;        // PS a nivel 1 (coincide con la referencia)
export const PLAYER_SPEED = 78;          // px/s (caminar tranquilo)
export const SPRINT_MULT = 1.6;
export const MELEE_RANGE = 40;           // alcance del ataque c. a c.
export const MELEE_DAMAGE = 25;
export const MELEE_COOLDOWN = 400;       // ms
export const MELEE_KNOCKBACK = 360;      // empuje al zombie golpeado
export const PLAYER_HURT_KNOCKBACK = 240; // empuje a Iara al ser mordida
export const PLAYER_IFRAMES = 600;       // ms de invulnerabilidad tras un golpe

// Arma de fuego (pistola): se apunta con el mouse.
export const GUN_DAMAGE = 18;
export const GUN_COOLDOWN = 240;         // ms entre disparos
export const BULLET_SPEED = 640;         // px/s
export const BULLET_RANGE = 340;         // px antes de desaparecer
export const GUN_KNOCKBACK = 260;        // empuje al impactar
export const GUN_RECOIL = 60;            // retroceso de Iara al disparar

// Puntería (estadística 0..1). La bala sale exacta pero hacia un ángulo que se
// desvía del apuntado según la dispersión; mejor puntería = menos dispersión.
// A nivel 1 es ABSURDA (dispara para cualquier lado) y mejora fuerte por nivel.
export const AIM_BASE = 0.03;            // puntería a nivel 1 (¡un desastre!)
export const AIM_GROWTH = 0.085;         // +por nivel
export const AIM_MAX = 0.95;
export const AIM_SPREAD_MAX_DEG = 88;    // dispersión con puntería 0 (≈ para cualquier lado)
export const AIM_SPREAD_MIN_DEG = 1.5;   // dispersión con puntería 1 (casi exacta)

// Zombie
export const ZOMBIE_SPEED = 40;          // lento
export const ZOMBIE_CHASE_RANGE = 200;
export const ZOMBIE_ATTACK_RANGE = 28;
export const ZOMBIE_DAMAGE = 5;
export const ZOMBIE_ATTACK_COOLDOWN = 1000; // ms
export const ZOMBIE_BASE_PS = 50;
export const ZOMBIE_XP_REWARD = 20;

// Progresión
export const XP_PER_LEVEL_FACTOR = 50;   // xpToNext(level) = level * 50
export const PS_PER_LEVEL = 5;           // psMax = PLAYER_BASE_PS + (level-1)*PS_PER_LEVEL
export const SKILL_POINTS_PER_LEVEL = 1;

// Personaje por código (pixel-art propio) en vez de los sprites LPC animados.
export const CODE_IARA = true;

// Descubrimiento / niebla (estilo Project Zomboid). Sólo en mapas oscuros/
// desconocidos: cada escena decide si la usa (los primeros mapas, conocidos
// o de día, no la activan).
export const FOG_ENABLED = true;
export const VISION_RADIUS = 124;        // radio de visión alrededor de Iara (px)
export const FOG_DIM = 0.6;              // oscurecimiento de lo ya explorado fuera de vista (0..1)

// Guardado
export const SAVE_VERSION = 1;
export const SAVE_KEY_PREFIX = "twi_save_";

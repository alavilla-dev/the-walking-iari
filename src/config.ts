export const TILE = 32;

// Jugador
export const PLAYER_BASE_PS = 20;        // PS a nivel 1 (coincide con la referencia)
export const PLAYER_SPEED = 120;         // px/s
export const SPRINT_MULT = 1.6;
export const MELEE_RANGE = 40;           // alcance del ataque c. a c.
export const MELEE_DAMAGE = 25;
export const MELEE_COOLDOWN = 400;       // ms

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

// Guardado
export const SAVE_VERSION = 1;
export const SAVE_KEY_PREFIX = "twi_save_";

import Phaser from "phaser";
import { fadeIn, say, moveActor, face, wait, call } from "../../systems/Cutscene";
import type { Step } from "../../systems/Cutscene";

type Iara = Phaser.GameObjects.Sprite & { facing?: "up" | "down" | "left" | "right" };
interface Pt { x: number; y: number; }

/**
 * Intro del Capítulo 1 "El comienzo": noche en el depto, Iara sola esperando
 * a Ale; en la tele asoman las primeras noticias del brote. Cierra devolviendo
 * el control al jugador. Cinemática corta y salteable (ESC).
 */
export function introCap1(iara: Iara, tv: Pt, center: Pt): Step[] {
  return [
    fadeIn(900),
    wait(500),
    say("Iara", "Otra noche que Ale se queda hasta tarde en el laboratorio."),
    moveActor(iara, tv.x, tv.y, 70),       // camina hacia la tele
    face(iara, "up"),
    wait(300),
    say("Iara", "Las noticias hablan de disturbios raros en el centro de la ciudad..."),
    say("TV", "...se recomienda a los vecinos permanecer en sus hogares hasta nuevo aviso."),
    wait(200),
    say("Iara", "Qué raro. Le mando un mensaje a Ale."),
    wait(400),
    say("Ale (teléfono)", "Hola amor. Salgo en una hora. ¿Está todo tranquilo ahí?"),
    say("Iara", "Sí, todo bien. Te espero con la cena. Cuidate, ¿sí?"),
    moveActor(iara, center.x, center.y, 70), // vuelve al centro
    face(iara, "down"),
    call(() => { /* fin de la intro: el control vuelve al jugador */ }),
    say("Iara", "Un hogar dulce hogar. Por ahora."),
  ];
}

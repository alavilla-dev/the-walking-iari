import type { DialogueScript } from "../types";

export const sampleDialogue: DialogueScript = {
  start: {
    id: "start",
    speaker: "Iara",
    text: "¿Probamos el laboratorio?",
    options: [
      { text: "¡Dale!", goto: "si" },
      { text: "Mejor después", goto: "no" },
    ],
  },
  si: {
    id: "si",
    speaker: "Iara",
    text: "Genial, a romper zombies.",
    next: null,
  },
  no: {
    id: "no",
    speaker: "Iara",
    text: "Bueno, acá te espero.",
    next: null,
  },
};

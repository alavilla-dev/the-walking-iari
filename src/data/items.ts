import type { ItemDef } from "../types";

export const ITEM_DEFS: Record<string, ItemDef> = {
  knife: {
    id: "knife",
    name: "Cuchillo de cocina",
    type: "weapon",
    description: "Filoso. Mejor que las manos.",
    stackable: false,
  },
  bat: {
    id: "bat",
    name: "Bate",
    type: "weapon",
    description: "Contundente y confiable.",
    stackable: false,
  },
  medkit: {
    id: "medkit",
    name: "Botiquín",
    type: "heal",
    description: "Recupera 20 PS.",
    stackable: true,
    healAmount: 20,
  },
  photo_pareja: {
    id: "photo_pareja",
    name: "Foto de Ale e Iara",
    type: "narrative",
    description: "Una foto de los dos. La llevás siempre.",
    stackable: false,
  },
  llave_depto: {
    id: "llave_depto",
    name: "Llave del depto",
    type: "key",
    description: "Abre la puerta del departamento.",
    stackable: false,
  },
};

export function getItemDef(id: string): ItemDef {
  const def = ITEM_DEFS[id];
  if (!def) throw new Error(`Item desconocido: ${id}`);
  return def;
}

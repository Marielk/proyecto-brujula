import type { GardenNeed } from "../../../lib/types";

export function gardenNeedLabel(need: GardenNeed) {
  return {
    energia: "Energía",
    serenidad: "Serenidad",
    salud: "Salud",
    relaciones: "Relaciones",
    creatividad: "Creatividad"
  }[need];
}


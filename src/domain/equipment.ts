import { EQUIPMENT_NAMEN, type EquipmentArt, type EquipmentBedingung } from "./types";

/**
 * Erfüllt das verfügbare Equipment die Bedingung einer Übung?
 * Gruppen sind UND-verknüpft, innerhalb einer Gruppe reicht ein Eintrag (ODER).
 * `[]` (Körpergewicht, Alltagsgegenstände) ist immer erfüllt.
 */
export function erfuellt(
  bedingung: EquipmentBedingung,
  verfuegbar: readonly EquipmentArt[],
): boolean {
  return bedingung.every((gruppe) => gruppe.some((art) => verfuegbar.includes(art)));
}

/** Lesbare Darstellung, z. B. "Kurzhanteln oder Kettlebell + Bank". */
export function beschreibeBedingung(bedingung: EquipmentBedingung): string {
  if (bedingung.length === 0) return EQUIPMENT_NAMEN.keins;
  return bedingung
    .map((gruppe) => gruppe.map((art) => EQUIPMENT_NAMEN[art]).join(" oder "))
    .join(" + ");
}

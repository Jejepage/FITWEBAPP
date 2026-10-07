import {
  EQUIPMENT_NAMEN,
  MUSTER,
  type EquipmentArt,
  type EquipmentBedingung,
  type Exercise,
  type Muster,
} from "./types";

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

/** Zahl aktiver Übungen je Muster, die mit dem Equipment machbar sind. */
export function zaehleMachbar(
  uebungen: readonly Pick<Exercise, "muster" | "equipment" | "aktiv">[],
  verfuegbar: readonly EquipmentArt[],
): Record<Muster, number> {
  const anzahl = Object.fromEntries(MUSTER.map((m) => [m, 0])) as Record<Muster, number>;
  for (const u of uebungen) {
    if (u.aktiv && erfuellt(u.equipment, verfuegbar)) anzahl[u.muster]++;
  }
  return anzahl;
}

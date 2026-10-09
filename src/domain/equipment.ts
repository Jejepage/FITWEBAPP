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

/**
 * Vorbelegung des Ersatz-Kennzeichens für Seed und Migration: reines Körpergewicht (kein Gerät,
 * keine optionale Last) oder eine Übung, die nur mit dem Band geht. Übungen, die sich mit Hanteln
 * beladen lassen (z. B. Split Squat), bleiben Planübungen.
 */
export function istErsatzStandard(
  u: Pick<Exercise, "equipment" | "optionaleLast">,
): boolean {
  if (u.equipment.length === 0) return u.optionaleLast.length === 0;
  return u.equipment.every((gruppe) => gruppe.every((art) => art === "band"));
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

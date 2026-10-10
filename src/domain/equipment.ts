import {
  EQUIPMENT_NAMEN,
  MUSTER,
  type EquipmentArt,
  type EquipmentBedingung,
  type Exercise,
  type Muster,
} from "./types";

/**
 * Erfüllt das verfügbare Equipment die Bedingung einer Übung? Alle Geräte müssen vorhanden sein.
 * `[]` (Körpergewicht, Alltagsgegenstände) ist immer erfüllt.
 */
export function erfuellt(
  bedingung: EquipmentBedingung,
  verfuegbar: readonly EquipmentArt[],
): boolean {
  return bedingung.every((art) => verfuegbar.includes(art));
}

/** Lesbare Darstellung, z. B. "Kurzhanteln + Bank". */
export function beschreibeBedingung(bedingung: EquipmentBedingung): string {
  if (bedingung.length === 0) return EQUIPMENT_NAMEN.keins;
  return bedingung.map((art) => EQUIPMENT_NAMEN[art]).join(" + ");
}

/**
 * Vorbelegung des Ersatz-Kennzeichens für Seed und Migration: reines Körpergewicht (kein Gerät)
 * oder eine Übung, die nur mit dem Band geht. Übungen mit einem anderen Gerät (auch Hanteln,
 * z. B. Split Squat mit Kurzhanteln) bleiben Planübungen.
 */
export function istErsatzStandard(u: Pick<Exercise, "equipment">): boolean {
  return u.equipment.every((art) => art === "band");
}

/**
 * Gleiche Übung oder eine Variante davon (anderes Gerät, mit/ohne Gewicht). Varianten stehen als
 * eigene Übungen im Katalog und teilen sich das Video (Spec 3.3); Übungen ohne Video sind nur
 * mit sich selbst gleich.
 */
export const gleicheBewegung = (
  a: Pick<Exercise, "id" | "videoUrl">,
  b: Pick<Exercise, "id" | "videoUrl">,
): boolean => a.id === b.id || (a.videoUrl !== null && a.videoUrl === b.videoUrl);

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

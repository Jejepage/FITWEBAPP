// Spalten, Sortierung und gemerkte Ansicht der Katalog-Tabelle. Rein, ohne DB und UI; die
// Beschriftungen stehen in src/i18n/de.ts (katalog.spalten).
import { beschreibeBedingung } from "./equipment";
import { MUSTER, type Exercise } from "./types";
import { videoLink } from "./youtube";

/** Alle wählbaren Spalten in der festen Anzeigereihenfolge. */
export const SPALTEN = [
  "name",
  "stufe",
  "equipment",
  "einseitig",
  "ersatz",
  "belastung",
  "bereich",
  "muskeln",
  "steigerung",
  "leiter",
  "status",
  "aktiv",
  "video",
  "id",
] as const;
export type Spalte = (typeof SPALTEN)[number];

/** Vorgabe laut Wunsch: Name, Stufe, Equipment. */
export const STANDARD_SPALTEN: readonly Spalte[] = [
  "name",
  "stufe",
  "equipment",
];

/** Die Namensspalte ist immer sichtbar (dort steht der Link zur Übung). */
export const PFLICHT_SPALTE: Spalte = "name";

export type Ansicht = "auto" | "karten" | "tabelle";
export type Richtung = "auf" | "ab";

const istSpalte = (s: string): s is Spalte =>
  (SPALTEN as readonly string[]).includes(s);

/**
 * Liest eine Spaltenliste ("name,stufe,…"): nur bekannte Spalten, ohne Doppelte, in fester
 * Reihenfolge, Name immer dabei. Leer oder ohne gültige Spalte ergibt die Vorgabe.
 */
export function parseSpalten(text: string | null | undefined): Spalte[] {
  const gewaehlt = new Set(
    (text ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(istSpalte),
  );
  if (gewaehlt.size === 0) return [...STANDARD_SPALTEN];
  gewaehlt.add(PFLICHT_SPALTE);
  return SPALTEN.filter((s) => gewaehlt.has(s));
}

export const serialisiereSpalten = (spalten: readonly Spalte[]): string =>
  spalten.join(",");

export function parseAnsicht(text: string | null | undefined): Ansicht {
  return text === "karten" || text === "tabelle" ? text : "auto";
}

export const parseRichtung = (text: string | null | undefined): Richtung =>
  text === "ab" ? "ab" : "auf";

export function parseSortSpalte(
  text: string | null | undefined,
): Spalte | undefined {
  return text && istSpalte(text) ? text : undefined;
}

/** Was im Cookie "fit_katalog" steht: "ansicht=tabelle&spalten=name,stufe". */
export interface AnsichtsWahl {
  ansicht: Ansicht;
  spalten: Spalte[];
}

export function parseAnsichtsCookie(
  wert: string | null | undefined,
): AnsichtsWahl {
  const p = new URLSearchParams(wert ?? "");
  return {
    ansicht: parseAnsicht(p.get("ansicht")),
    spalten: parseSpalten(p.get("spalten")),
  };
}

export function serialisiereAnsichtsCookie(w: AnsichtsWahl): string {
  return new URLSearchParams({
    ansicht: w.ansicht,
    spalten: serialisiereSpalten(w.spalten),
  }).toString();
}

/** Sortierschlüssel einer Übung für eine Spalte (Text klein geschrieben, sonst Zahl). */
export function sortWert(e: Exercise, spalte: Spalte): string | number {
  switch (spalte) {
    case "name":
      return e.name.toLocaleLowerCase("de");
    case "stufe":
      return e.stufe;
    case "equipment":
      return beschreibeBedingung(e.equipment).toLocaleLowerCase("de");
    case "einseitig":
      return e.einseitig ? 1 : 0;
    case "ersatz":
      return e.ersatz ? 1 : 0;
    case "belastung":
      return e.belastungsart;
    case "bereich":
      return e.standardBereich;
    case "muskeln":
      return e.hauptmuskeln.join(", ").toLocaleLowerCase("de");
    case "steigerung":
      return e.steigerungsart.join(" ");
    case "leiter":
      return `${e.leichterId ?? ""}|${e.schwererId ?? ""}`;
    case "status":
      return e.pruefstatus;
    case "aktiv":
      return e.aktiv ? 1 : 0;
    case "video":
      return videoLink(e.videoUrl) ? 1 : 0;
    case "id":
      return e.id;
  }
}

const vergleiche = (a: string | number, b: string | number): number =>
  typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), "de", { numeric: true });

/** Standardordnung innerhalb einer Gruppe: Stufe, dann Name, dann ID. */
const standardOrdnung = (a: Exercise, b: Exercise): number =>
  a.stufe - b.stufe ||
  a.name.localeCompare(b.name, "de") ||
  a.id.localeCompare(b.id, "de", { numeric: true });

/**
 * Sortiert Übungen für die Tabelle: erst nach Bewegungsmuster (feste Reihenfolge der Spec), darin
 * nach der gewählten Spalte (Richtung auf/ab), bei Gleichstand nach Stufe, Name, ID. Ohne Spalte
 * gilt die Standardordnung. Das Ergebnis ist eine neue Liste.
 */
export function sortiereKatalog(
  liste: readonly Exercise[],
  spalte: Spalte | undefined,
  richtung: Richtung,
): Exercise[] {
  const vorzeichen = richtung === "ab" ? -1 : 1;
  return [...liste].sort(
    (a, b) =>
      MUSTER.indexOf(a.muster) - MUSTER.indexOf(b.muster) ||
      (spalte
        ? vorzeichen * vergleiche(sortWert(a, spalte), sortWert(b, spalte))
        : 0) ||
      standardOrdnung(a, b),
  );
}

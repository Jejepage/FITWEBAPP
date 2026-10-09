// Vertrag zwischen DB, Seed, Generator und UI. Keine Importe aus db/ oder react.

export const MUSTER = ["KN", "HB", "DH", "DV", "ZH", "ZV", "TR", "RU"] as const;
export type Muster = (typeof MUSTER)[number];

export const MUSTER_NAMEN: Record<Muster, string> = {
  KN: "Kniebeuge",
  HB: "Hüftbeuge",
  DH: "Drücken horizontal",
  DV: "Drücken vertikal",
  ZH: "Ziehen horizontal",
  ZV: "Ziehen vertikal",
  TR: "Tragen",
  RU: "Rumpf",
};

export const EQUIPMENT_ARTEN = [
  "maschinen",
  "kabelzug",
  "langhantel",
  "kurzhanteln",
  "kettlebell",
  "bank",
  "stange",
  "band",
  "keins",
] as const;
export type EquipmentArt = (typeof EQUIPMENT_ARTEN)[number];

/** Arten, die ein Nutzer beim Equipment eines Plans ankreuzen kann ("keins" ist kein Gerät). */
export const EQUIPMENT_AUSWAHL = EQUIPMENT_ARTEN.filter(
  (e): e is Exclude<EquipmentArt, "keins"> => e !== "keins",
);

/**
 * Liste von Gruppen: innerhalb einer Gruppe reicht ein Eintrag (ODER),
 * alle Gruppen müssen erfüllt sein (UND). `[]` = Körpergewicht/Alltagsgegenstand.
 */
export type EquipmentBedingung = EquipmentArt[][];

export const BELASTUNGSARTEN = ["wdh", "zeit", "strecke"] as const;
export type Belastungsart = (typeof BELASTUNGSARTEN)[number];

export const STEIGERUNGSARTEN = ["gewicht", "wdh", "tempo", "zeit", "strecke", "stufe"] as const;
export type Steigerungsart = (typeof STEIGERUNGSARTEN)[number];

export const PRUEFSTATI = ["zu_pruefen", "geprueft"] as const;
export type Pruefstatus = (typeof PRUEFSTATI)[number];

export type Stufe = 1 | 2 | 3 | 4 | 5;

export interface Exercise {
  id: string;
  name: string;
  muster: Muster;
  stufe: Stufe;
  einseitig: boolean;
  equipment: EquipmentBedingung;
  /** Womit die Übung zusätzlich beladen werden kann (z. B. Split Squat mit Kurzhanteln). */
  optionaleLast: EquipmentArt[];
  leichterId: string | null;
  schwererId: string | null;
  hauptmuskeln: string[];
  belastungsart: Belastungsart;
  /** z. B. "8–12", "20–40 s" oder "20–40 m" */
  standardBereich: string;
  steigerungsart: Steigerungsart[];
  ausfuehrung: string[];
  fehler: string[];
  hinweise: string;
  /** Phase 2 */
  bild: string | null;
  /** YouTube-Link (Standardform, siehe youtube.ts) oder null */
  videoUrl: string | null;
  aktiv: boolean;
  pruefstatus: Pruefstatus;
  /**
   * Ersatzübung (Körpergewicht, Band o. Ä.): Der Plan-Generator wählt sie nur, wenn es für das
   * Muster mit dem Equipment des Plans keine andere Übung gibt. Beim Tauschen bleibt sie wählbar.
   */
  ersatz: boolean;
}

/** Was in den Seed-Dateien steht; `ersatz` leitet data/index.ts ab, der Rest kommt vom Seed-Runner. */
export type ExerciseSeedRoh = Omit<Exercise, "bild" | "aktiv" | "pruefstatus" | "ersatz">;

/** Eine Seed-Übung samt Ersatz-Kennzeichen (der Seed-Runner ergänzt bild/aktiv/pruefstatus). */
export type ExerciseSeed = ExerciseSeedRoh & { ersatz: boolean };

export type Einheit = "A" | "B";
export type Block = "1" | "2" | "Z";

/** Verfügbare Hantelgewichte in kg je Equipment-Art (Kurzhanteln, Kettlebell). */
export type Gewichte = Partial<Record<EquipmentArt, number[]>>;

export const EQUIPMENT_NAMEN: Record<EquipmentArt, string> = {
  maschinen: "Maschinen",
  kabelzug: "Kabelzug",
  langhantel: "Langhantel",
  kurzhanteln: "Kurzhanteln",
  kettlebell: "Kettlebell",
  bank: "Bank",
  stange: "Stange",
  band: "Band",
  keins: "Kein Gerät",
};

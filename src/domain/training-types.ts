// Vertrag für Wochenlogik, Steigerung und Trainingsablauf (Spec 2.3, 2.5, F4, F5).
// Reine Typen und Konstanten; die Logik steht in weeks.ts, progression.ts und ablauf.ts.
import type { Bereich } from "./bereich";
import type { Block, Einheit, Exercise, Gewichte } from "./types";

/** Länge eines Trainingsblocks in Wochen (Spec 2.5). */
export const WOCHEN_PRO_BLOCK = 6;
/** Runden des Zusatzblocks, in jeder Woche gleich (Spec 2.3). */
export const RUNDEN_ZUSATZBLOCK = 2;
/** Pause beim Wechsel innerhalb einer Runde: Mitte von 30–45 s (Spec 2.3). */
export const PAUSE_WECHSEL_S = 40;
/** Pause nach einer Runde: Mitte von 60–90 s (Spec 2.3). */
export const PAUSE_RUNDE_S = 75;

export type Fokus = "technik" | "einarbeiten" | "steigern" | "entlasten";

export interface WochenVorgabe {
  /** 1 bis 6 (Eingaben außerhalb werden begrenzt) */
  woche: number;
  /** Runden für Block 1 und 2 (3, in Woche 6: 2) */
  runden: number;
  /** Wiederholungsbereich der Woche für Übungen mit dem Standardbereich 8–12 */
  wdhBereich: Bereich;
  rpeMin: number;
  rpeMax: number;
  fokus: Fokus;
}

export interface FortschrittEinheit {
  /** Die nächste fällige Einheit */
  einheit: Einheit;
  /** Woche der nächsten Einheit, ab 1; über 6 nur, wenn blockFertig */
  woche: number;
  /** Position der nächsten Einheit innerhalb der Woche, ab 1 */
  positionInWoche: number;
  /** Alle Einheiten des Blocks sind absolviert */
  blockFertig: boolean;
}

/** Werte eines geloggten Satzes, wie sie die Steigerungslogik braucht. */
export interface SatzWerte {
  gewicht: number | null;
  wdh: number | null;
  sekunden: number | null;
  meter: number | null;
  rpe: number | null;
  /** Satz mit 3 s Absenken */
  tempo: boolean;
}

export type VorschlagGrund =
  | "start" // noch keine Daten: Startgewicht finden
  | "wiederholen" // gleiches Gewicht, Wiederholungsziel +1
  | "mehr_gewicht"
  | "mehr_wdh"
  | "tempo"
  | "naechste_stufe"
  | "mehr_zeit"
  | "mehr_strecke";

export interface Vorschlag {
  gewicht: number | null;
  wdh: number | null;
  sekunden: number | null;
  meter: number | null;
  /** 3 s Absenken empfohlen */
  tempo: boolean;
  grund: VorschlagGrund;
  /** Schrittweite für die ±-Knöpfe beim Gewicht (kg); 0 wenn die Übung kein Gewicht hat */
  schritt: number;
}

export type GewichtsArt = "gewicht-hantel" | "gewicht-maschine";

export interface VorschlagEingabe {
  uebung: Pick<
    Exercise,
    | "id"
    | "belastungsart"
    | "standardBereich"
    | "steigerungsart"
    | "equipment"
    | "optionaleLast"
    | "schwererId"
  >;
  /** Woche der Einheit, für die der Vorschlag gilt (1 bis 6); in Woche 6 wird nicht gesteigert */
  woche: number;
  /** Sätze der letzten passenden Einheit (nur Nicht-Ad-hoc, nicht Woche 6), in Reihenfolge der Runden */
  letzteSaetze: readonly SatzWerte[];
  /** Verfügbare Hantelgewichte des Profils */
  gewichte: Gewichte;
}

/** Block mit den Slots einer Einheit, für den Ablauf (siehe ablauf.ts). */
export type { Block };

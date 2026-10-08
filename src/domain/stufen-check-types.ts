// Vertrag für den Stufen-Check am Blockende (Spec 2.5, F5). Reine Typen und Konstanten;
// die Logik steht in stufen-check.ts.
import type { SatzWerte } from "./training-types";
import type { Exercise, Muster } from "./types";

/** Nur diese Wochen des Blocks fließen in den Check ein. */
export const STUFEN_CHECK_WOCHEN = [5, 6] as const;
/** So viele gewertete Einheiten braucht ein Muster mindestens für eine Empfehlung ≠ halten. */
export const STUFEN_CHECK_MIN_EINHEITEN = 2;
/** Erhöhen nur, wenn alle Sätze höchstens diese Anstrengung hatten (fehlendes RPE zählt als erfüllt). */
export const RPE_ERHOEHEN_MAX = 7;
/** Ein Satz mit mindestens dieser Anstrengung zählt als „zu hart". */
export const RPE_SENKEN_AB = 9;

/** Eine Einheit, ein Muster, eine Übung: alle Sätze dieser Übung in der Einheit. */
export interface StufenCheckEinheit {
  muster: Muster;
  /** Woche des Blocks, 1 bis 6 */
  woche: number;
  uebung: Pick<Exercise, "standardBereich" | "belastungsart">;
  saetze: readonly SatzWerte[];
}

export type StufenEmpfehlung = "erhoehen" | "halten" | "senken";

export type StufenGrund =
  | "ziel_erreicht" // alle Sätze an der Obergrenze bei RPE ≤ 7
  | "untergrenze_verfehlt" // Untergrenze in mehreren Einheiten verfehlt
  | "zu_hart" // RPE ≥ 9 in mehreren Einheiten
  | "stabil" // keine klare Tendenz
  | "zu_wenig_daten" // weniger als STUFEN_CHECK_MIN_EINHEITEN gewertete Einheiten
  | "grenze"; // Erhöhen/Senken wäre gewünscht, aber Stufe 5 bzw. 1 ist schon erreicht

export interface StufenCheckErgebnis {
  muster: Muster;
  /** Stufe im bisherigen Block */
  aktuell: number;
  empfehlung: StufenEmpfehlung;
  /** Empfohlene Stufe im nächsten Block (1 bis 5) */
  neu: number;
  grund: StufenGrund;
  /** Anzahl der gewerteten Einheiten (Woche 5 und 6) dieses Musters */
  einheiten: number;
}

export interface StufenCheckEingabe {
  stufen: Record<Muster, number>;
  einheiten: readonly StufenCheckEinheit[];
}

/** Acht Ergebnisse in der Reihenfolge von MUSTER. */
export type StufenCheckFn = (e: StufenCheckEingabe) => StufenCheckErgebnis[];

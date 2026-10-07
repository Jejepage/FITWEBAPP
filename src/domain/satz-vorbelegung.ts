import type { SatzWerte, Vorschlag } from "./training-types";
import type { Belastungsart } from "./types";

/** Werte der Eingabefelder für einen Satz. */
export type FormularWerte = SatzWerte;

/**
 * Vorbelegung der Felder (Spec F4: "vorausgefüllt mit Vorschlag"):
 * - ab der zweiten Runde die Werte der vorigen Runde derselben Übung,
 * - sonst der Vorschlag aus der Steigerungslogik; RPE zunächst das obere Ziel der Woche.
 */
export function vorbelegung(
  uebung: { belastungsart: Belastungsart; vorschlag: Vorschlag },
  vorigeRunde: SatzWerte | null,
  rpeZiel: number,
): FormularWerte {
  if (vorigeRunde) return { ...vorigeRunde };
  const v = uebung.vorschlag;
  return {
    gewicht: v.gewicht,
    wdh: uebung.belastungsart === "wdh" ? v.wdh : null,
    sekunden: uebung.belastungsart === "zeit" ? v.sekunden : null,
    meter: uebung.belastungsart === "strecke" ? v.meter : null,
    rpe: rpeZiel,
    tempo: v.tempo,
  };
}

/** Schrittweite der Plus/Minus-Knöpfe je Feld. */
export const SCHRITT = { wdh: 1, sekunden: 5, meter: 5 } as const;

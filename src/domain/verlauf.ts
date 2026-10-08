// Verlauf einer Übung (Spec F7): bester Satz und Volumen je Einheit. Rein, ohne DB und UI.
import { formatSatz } from "./satz-format";
import type { SatzWerte } from "./training-types";
import type { Belastungsart, Einheit } from "./types";

export type Metrik = "bester" | "volumen";

/** Alle Sätze einer Übung in einer abgeschlossenen Einheit. */
export interface VerlaufEinheit {
  workoutId: number;
  datum: string;
  woche: number;
  einheit: Einheit;
  adHoc: boolean;
  saetze: readonly SatzWerte[];
}

export interface VerlaufZeile {
  workoutId: number;
  datum: string;
  woche: number;
  einheit: Einheit;
  adHoc: boolean;
  /** Bester Satz der Einheit; null ohne verwertbaren Messwert */
  bester: SatzWerte | null;
  /** Wert des besten Satzes für das Diagramm (geschätzte 1RM, Wdh., s oder m) */
  besterWert: number | null;
  /** Null, wenn die Einheit bei einer Gewichtsübung keinen Satz mit Gewicht hat */
  volumen: number | null;
}

export interface UebungsVerlauf {
  /** Älteste Einheit zuerst */
  zeilen: VerlaufZeile[];
  /** Mindestens ein Satz der Übung wurde mit Gewicht protokolliert */
  mitGewicht: boolean;
  /** Einheit des Wertes "bester Satz" (kg = geschätzte 1RM, Wdh., s, m) */
  besterEinheit: "kg" | "Wdh." | "s" | "m";
  /** Einheit des Volumens (kg, Wdh., s, m) */
  volumenEinheit: "kg" | "Wdh." | "s" | "m";
}

/** Geschätzte Maximalkraft nach Epley: Gewicht × (1 + Wdh / 30). */
export function schaetze1RM(gewicht: number, wdh: number): number {
  return gewicht * (1 + wdh / 30);
}

const messwert = (s: SatzWerte, art: Belastungsart): number | null =>
  art === "wdh" ? s.wdh : art === "zeit" ? s.sekunden : s.meter;

const runde1 = (x: number): number => Math.round(x * 10) / 10;

/** Bester Satz: mit Gewicht die höchste geschätzte 1RM, sonst der größte Messwert. */
export function bestSatz(
  saetze: readonly SatzWerte[],
  art: Belastungsart,
  /** Gewichtsübung? Standard: ergibt sich aus den übergebenen Sätzen. */
  mitGewicht: boolean = art === "wdh" && saetze.some((s) => (s.gewicht ?? 0) > 0 && s.wdh !== null),
): { satz: SatzWerte; wert: number } | null {
  let beste: { satz: SatzWerte; wert: number; gewicht: number } | null = null;
  for (const satz of saetze) {
    const m = messwert(satz, art);
    if (m === null) continue;
    if (mitGewicht && !((satz.gewicht ?? 0) > 0)) continue;
    const wert = mitGewicht ? schaetze1RM(satz.gewicht as number, m) : m;
    const gewicht = satz.gewicht ?? 0;
    if (!beste || wert > beste.wert || (wert === beste.wert && gewicht > beste.gewicht)) {
      beste = { satz, wert, gewicht };
    }
  }
  return beste ? { satz: beste.satz, wert: runde1(beste.wert) } : null;
}

/**
 * Volumen einer Einheit: bei Gewichtsübungen Σ Gewicht × Wdh, sonst Σ Wiederholungen,
 * Sekunden bzw. Meter. `mitGewicht` gilt für die ganze Übung, damit die Werte vergleichbar bleiben.
 */
export function volumen(
  saetze: readonly SatzWerte[],
  art: Belastungsart,
  mitGewicht: boolean,
): number {
  let summe = 0;
  for (const s of saetze) {
    const m = messwert(s, art);
    if (m === null) continue;
    summe += art === "wdh" && mitGewicht ? (s.gewicht ?? 0) * m : m;
  }
  return runde1(summe);
}

export function uebungsVerlauf(
  einheiten: readonly VerlaufEinheit[],
  art: Belastungsart,
): UebungsVerlauf {
  const mitGewicht =
    art === "wdh" && einheiten.some((e) => e.saetze.some((s) => (s.gewicht ?? 0) > 0));
  const einheit = art === "zeit" ? "s" : art === "strecke" ? "m" : null;
  const zeilen = einheiten.map((e): VerlaufZeile => {
    const b = bestSatz(e.saetze, art, mitGewicht);
    return {
      workoutId: e.workoutId,
      datum: e.datum,
      woche: e.woche,
      einheit: e.einheit,
      adHoc: e.adHoc,
      bester: b?.satz ?? null,
      besterWert: b?.wert ?? null,
      volumen:
        mitGewicht && !e.saetze.some((s) => (s.gewicht ?? 0) > 0 && s.wdh !== null)
          ? null
          : volumen(e.saetze, art, mitGewicht),
    };
  });
  return {
    zeilen,
    mitGewicht,
    besterEinheit: einheit ?? (mitGewicht ? "kg" : "Wdh."),
    volumenEinheit: einheit ?? (mitGewicht ? "kg" : "Wdh."),
  };
}

/** Der beste Satz als Text für Liste und Diagramm, z. B. "12 kg × 10 · RPE 7". */
export function besterSatzText(z: Pick<VerlaufZeile, "bester">): string {
  return z.bester ? formatSatz(z.bester) : "–";
}

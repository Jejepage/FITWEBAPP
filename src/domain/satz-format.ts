import type { Bereich } from "./bereich";
import type { SatzWerte } from "./training-types";
import type { Belastungsart } from "./types";

/** Zahl mit Dezimalkomma ohne überflüssige Nullen: 12.5 → "12,5", 12 → "12". */
export function formatZahl(n: number): string {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

export function formatBereich(b: Bereich): string {
  const basis = `${b.min}–${b.max}`;
  return b.einheit ? `${basis} ${b.einheit}` : basis;
}

/** Zielvorgabe für die Anzeige: "8–12 Wdh", "20–40 s pro Seite". */
export function zielText(b: Bereich, belastungsart: Belastungsart, einseitig: boolean): string {
  const basis = belastungsart === "wdh" ? `${b.min}–${b.max} Wdh` : formatBereich(b);
  return einseitig ? `${basis} pro Seite` : basis;
}

export function rpeText(min: number, max: number): string {
  return min === max ? `RPE ${min}` : `RPE ${min}–${max}`;
}

/** Ein Satz in einer Zeile: "12 kg × 10 · RPE 7", "30 s", "20 m · 16 kg". */
export function formatSatz(s: SatzWerte): string {
  const teile: string[] = [];
  if (s.wdh !== null)
    teile.push(s.gewicht !== null ? `${formatZahl(s.gewicht)} kg × ${s.wdh}` : `${s.wdh} Wdh`);
  else {
    if (s.sekunden !== null) teile.push(`${s.sekunden} s`);
    if (s.meter !== null) teile.push(`${formatZahl(s.meter)} m`);
    if (s.gewicht !== null) teile.push(`${formatZahl(s.gewicht)} kg`);
  }
  if (s.tempo) teile.push("Tempo");
  if (s.rpe !== null) teile.push(`RPE ${formatZahl(s.rpe)}`);
  return teile.join(" · ");
}

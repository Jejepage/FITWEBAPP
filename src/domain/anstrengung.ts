/**
 * Anstrengung eines Satzes in vier Textstufen statt RPE 1–10. Die Datenbank speichert weiter eine
 * Zahl (set_log.rpe), damit alte Protokolle, Backups und die Steigerungsregeln unverändert gelten:
 *
 *   Leicht   ≥ 3 Wiederholungen übrig  → 6   (bisher RPE ≤ 7)
 *   Gut      ca. 2 übrig               → 8
 *   Schwer   ca. 1 übrig               → 9
 *   Am Limit keine mehr                → 10
 *
 * Einzige Quelle für Anzeige, Eingabe und Erklärtexte.
 */
export const STUFEN_KEYS = ["leicht", "gut", "schwer", "limit"] as const;
export type AnstrengungsStufe = (typeof STUFEN_KEYS)[number];

export interface StufenInfo {
  key: AnstrengungsStufe;
  /** Name auf dem Knopf und in Verlauf/Ziel */
  text: string;
  /** Kurz auf dem Knopf: wie viele Wiederholungen noch gegangen wären */
  reserveKurz: string;
  /** Ganzer Satz zur Erklärung */
  reserveSatz: string;
  /** Wert, der in der Datenbank gespeichert wird */
  wert: number;
}

export const STUFEN: readonly StufenInfo[] = [
  {
    key: "leicht",
    text: "Leicht",
    reserveKurz: "noch 3 oder mehr",
    reserveSatz: "Du hättest noch 3 oder mehr Wiederholungen geschafft.",
    wert: 6,
  },
  {
    key: "gut",
    text: "Gut",
    reserveKurz: "noch ca. 2",
    reserveSatz: "Du hättest noch etwa 2 Wiederholungen geschafft.",
    wert: 8,
  },
  {
    key: "schwer",
    text: "Schwer",
    reserveKurz: "noch ca. 1",
    reserveSatz: "Du hättest noch etwa 1 Wiederholung geschafft.",
    wert: 9,
  },
  {
    key: "limit",
    text: "Am Limit",
    reserveKurz: "keine mehr",
    reserveSatz: "Du hättest keine Wiederholung mehr geschafft.",
    wert: 10,
  },
];

/** Stufe zu einem gespeicherten Wert (auch alte RPE-Werte 1–10 in halben Schritten). */
export function stufeVonWert(rpe: number): StufenInfo {
  const [leicht, gut, schwer, limit] = STUFEN as readonly [
    StufenInfo,
    StufenInfo,
    StufenInfo,
    StufenInfo,
  ];
  if (rpe <= 7) return leicht;
  if (rpe <= 8) return gut;
  if (rpe <= 9) return schwer;
  return limit;
}

export const wertVonStufe = (key: AnstrengungsStufe): number =>
  (STUFEN.find((s) => s.key === key) as StufenInfo).wert;

/** Ein gespeicherter Wert als Text: 8 → "Gut", 7 → "Leicht". */
export const anstrengungText = (rpe: number): string => stufeVonWert(rpe).text;

/** Wert auf den gespeicherten Wert seiner Stufe bringen (7 → 6, 7,5 → 8, 9,5 → 10). */
export const normiereAnstrengung = (rpe: number): number => stufeVonWert(rpe).wert;

/** Zielbereich einer Woche als Text: (6, 6) → "Leicht", (7, 8) → "Leicht bis Gut". */
export function anstrengungBereichText(min: number, max: number): string {
  const von = stufeVonWert(min).text;
  const bis = stufeVonWert(max).text;
  return von === bis ? von : `${von} bis ${bis}`;
}

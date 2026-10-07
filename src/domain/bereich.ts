export interface Bereich {
  min: number;
  max: number;
  /** "s" = Sekunden, "m" = Meter, undefined = Wiederholungen */
  einheit?: "s" | "m";
}

const RE = /^(\d+)\s?[–-]\s?(\d+)(?: (s|m))?$/;

/** Parst "8–12", "20–40 s" oder "20–40 m". Gibt null zurück, wenn das Format nicht passt oder min > max. */
export function parseBereich(text: string): Bereich | null {
  const m = RE.exec(text);
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (min < 1 || min > max) return null;
  return { min, max, einheit: m[3] as Bereich["einheit"] };
}

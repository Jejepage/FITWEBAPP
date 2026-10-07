/** Heutiges Datum in Deutschland als JJJJ-MM-TT (Container laufen meist in UTC). */
export function heuteIso(jetzt: Date = new Date()): string {
  return jetzt.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

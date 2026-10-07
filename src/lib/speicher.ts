// Dünne, fehlertolerante Hülle um localStorage (kann in privaten Fenstern oder bei blockierten
// Daten fehlen oder werfen). Die App läuft ohne.
export function liesJson<T>(schluessel: string, standard: T): T {
  try {
    const roh = window.localStorage.getItem(schluessel);
    return roh ? (JSON.parse(roh) as T) : standard;
  } catch {
    return standard;
  }
}

export function schreibeJson(schluessel: string, wert: unknown): void {
  try {
    window.localStorage.setItem(schluessel, JSON.stringify(wert));
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export function loesche(schluessel: string): void {
  try {
    window.localStorage.removeItem(schluessel);
  } catch {
    /* ignorieren */
  }
}

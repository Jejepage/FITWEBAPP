// Datumsanzeige für ISO-Daten (yyyy-mm-dd), unabhängig von der Zeitzone des Servers.
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "Mi., 07.10.2026" */
export function datumLang(iso: string): string {
  return utc(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "07.10.2026" */
export function datumKurz(iso: string): string {
  return utc(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Oktober 2026" */
export function monatJahr(iso: string): string {
  return utc(iso).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

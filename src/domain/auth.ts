// Zugriffsentscheidung für den optionalen Passwortschutz (APP_PASSWORD). Rein, ohne Kryptografie:
// Die Prüfung des Cookies liefert der Aufrufer (src/server/auth.ts, src/proxy.ts).

export const SESSION_COOKIE = "fit_session";
/** Gültigkeit einer Sitzung in Tagen */
export const SESSION_TAGE = 30;

/** Pfade, die auch ohne Anmeldung erreichbar sind (Browser holen sie ohne Cookie). */
const FREIE_PFADE: ReadonlySet<string> = new Set([
  "/login",
  "/offline.html",
  "/api/health",
  "/manifest.webmanifest",
  "/sw.js",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
]);

export type Zugriff =
  | { art: "weiter" }
  | { art: "umleiten"; ziel: string }
  /** 401 für Programmaufrufe (API, Server Actions, nicht-GET) */
  | { art: "abgelehnt" };

/**
 * Nur interne Pfade als Weiterleitungsziel: "/…", nicht "//…", kein Backslash, keine
 * Steuerzeichen, nicht die Login-Seite selbst. Alles andere ergibt "/".
 */
export function sichererPfad(weiter: string | null | undefined): string {
  if (typeof weiter !== "string" || weiter.length === 0 || weiter.length > 500) return "/";
  if (!weiter.startsWith("/") || weiter.startsWith("//")) return "/";
  if (weiter.includes("\\") || /[\u0000-\u001f\u007f]/.test(weiter)) return "/";
  if (weiter === "/login" || weiter.startsWith("/login?") || weiter.startsWith("/login/")) {
    return "/";
  }
  return weiter;
}

export function anmeldeUrl(pfadMitSuche: string): string {
  const ziel = sichererPfad(pfadMitSuche);
  return ziel === "/" ? "/login" : `/login?weiter=${encodeURIComponent(ziel)}`;
}

export function istFreierPfad(pfad: string): boolean {
  return (
    FREIE_PFADE.has(pfad) || pfad.startsWith("/_next/static/") || pfad.startsWith("/_next/image")
  );
}

export function entscheideZugriff(e: {
  pfad: string;
  /** Query-String inkl. "?" oder leer */
  suche: string;
  methode: string;
  passwortGesetzt: boolean;
  sitzungGueltig: boolean;
  /** Anfrage kommt von einer Server Action (Header next-action) */
  istServerAction: boolean;
}): Zugriff {
  if (!e.passwortGesetzt || e.sitzungGueltig || istFreierPfad(e.pfad)) return { art: "weiter" };
  const seite = (e.methode === "GET" || e.methode === "HEAD") && !e.istServerAction;
  if (e.pfad.startsWith("/api/") || !seite) return { art: "abgelehnt" };
  return { art: "umleiten", ziel: anmeldeUrl(e.pfad + e.suche) };
}

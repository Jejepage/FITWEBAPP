// Sitzungs-Cookie, Passwortvergleich und Ratenbremse für den optionalen Passwortschutz.
// Nur Node (node:crypto); bewusst ohne Datenbankzugriff, damit der Proxy ihn laden kann.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_TAGE } from "@/domain/auth";

/** Ist ein Passwort gesetzt? Wird bei jedem Aufruf gelesen (Laufzeit-Umgebung, nicht Build). */
export function passwortAusUmgebung(): string {
  return process.env["APP_PASSWORD"] ?? "";
}

const sha256 = (text: string): Buffer => createHash("sha256").update(text).digest();

/** Schlüssel aus dem Passwort: Ein neues Passwort macht alle bisherigen Sitzungen ungültig. */
const schluessel = (passwort: string): Buffer => sha256(`fit-session-v1:${passwort}`);

const signatur = (passwort: string, ablaufSek: string): string =>
  createHmac("sha256", schluessel(passwort)).update(ablaufSek).digest("hex");

/** Cookie-Wert: "<Ablauf in Unix-Sekunden>.<HMAC-SHA-256 hex>" */
export function erstelleToken(passwort: string, jetztMs: number, tage = SESSION_TAGE): string {
  const ablauf = String(Math.floor(jetztMs / 1000) + tage * 86400);
  return `${ablauf}.${signatur(passwort, ablauf)}`;
}

const TOKEN_FORMAT = /^(\d{1,12})\.([0-9a-f]{64})$/;

export function pruefeToken(passwort: string, token: string, jetztMs: number): boolean {
  if (passwort === "") return false;
  const m = TOKEN_FORMAT.exec(token);
  if (!m) return false;
  const [, ablauf, sig] = m as unknown as [string, string, string];
  const erwartet = Buffer.from(signatur(passwort, ablauf), "hex");
  const gegeben = Buffer.from(sig, "hex");
  if (erwartet.length !== gegeben.length || !timingSafeEqual(erwartet, gegeben)) return false;
  return Number(ablauf) * 1000 > jetztMs;
}

/** Ist das Sitzungs-Cookie gültig? Ohne gesetztes Passwort gilt immer: ja (kein Schutz). */
export function istAngemeldet(token: string | undefined): boolean {
  const passwort = passwortAusUmgebung();
  if (passwort === "") return true;
  return token !== undefined && pruefeToken(passwort, token, Date.now());
}

/** Konstantzeit-Vergleich über SHA-256 beider Seiten (unabhängig von der Länge). */
export function pruefePasswort(eingabe: string, passwort: string): boolean {
  if (passwort === "") return false;
  return timingSafeEqual(sha256(eingabe), sha256(passwort));
}

/**
 * Bremse gegen Raten: Nach `max` Fehlversuchen innerhalb von `fensterMs` ist die Anmeldung für
 * `sperreMs` gesperrt. Bewusst eine gemeinsame Bremse für alle Anfragen (Proxy-Header wie
 * X-Forwarded-For lassen sich beim direkten Zugriff fälschen). Liegt im Speicher.
 */
export class Ratenbremse {
  private fehler: number[] = [];
  private gesperrtBis = 0;

  constructor(
    private readonly max = 5,
    private readonly fensterMs = 5 * 60_000,
    private readonly sperreMs = 60_000,
  ) {}

  /** Verbleibende Sperre in Sekunden, 0 wenn frei. */
  sperreSekunden(jetztMs: number): number {
    return jetztMs < this.gesperrtBis ? Math.ceil((this.gesperrtBis - jetztMs) / 1000) : 0;
  }

  fehlversuch(jetztMs: number): void {
    this.fehler = this.fehler.filter((t) => jetztMs - t < this.fensterMs);
    this.fehler.push(jetztMs);
    if (this.fehler.length >= this.max) {
      this.gesperrtBis = jetztMs + this.sperreMs;
      this.fehler = [];
    }
  }

  erfolg(): void {
    this.fehler = [];
  }
}

const global = globalThis as unknown as { __fitRatenbremse?: Ratenbremse };
/** Gemeinsame Bremse des Prozesses (überlebt Hot-Reload). */
export const ratenbremse = (global.__fitRatenbremse ??= new Ratenbremse());

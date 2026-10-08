// Optionaler Passwortschutz (APP_PASSWORD). Läuft vor jeder Anfrage; ohne gesetztes Passwort tut
// er nichts. Die Entscheidung trifft die reine Funktion entscheideZugriff (domain/auth.ts).
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, entscheideZugriff } from "@/domain/auth";
import { istAngemeldet, passwortAusUmgebung } from "@/server/auth";

export function proxy(req: NextRequest): NextResponse {
  const passwort = passwortAusUmgebung();
  const z = entscheideZugriff({
    pfad: req.nextUrl.pathname,
    suche: req.nextUrl.search,
    methode: req.method,
    passwortGesetzt: passwort !== "",
    sitzungGueltig: istAngemeldet(req.cookies.get(SESSION_COOKIE)?.value),
    istServerAction: req.headers.has("next-action"),
  });
  if (z.art === "weiter") return NextResponse.next();
  if (z.art === "abgelehnt") {
    return new NextResponse("Nicht angemeldet", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  // Absolute Adresse aus dem Host-Header, damit die Weiterleitung unter der Adresse landet, unter
  // der der Browser die App aufgerufen hat (im Container wäre req.url z. B. http://0.0.0.0:3000).
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const ziel = host ? `${proto}://${host}${z.ziel}` : new URL(z.ziel, req.url).toString();
  const antwort = NextResponse.redirect(ziel, 307);
  antwort.headers.set("Cache-Control", "no-store");
  return antwort;
}

export const config = {
  // Statische Next-Dateien brauchen keine Prüfung; alles andere läuft durch den Proxy.
  matcher: ["/((?!_next/static|_next/image).*)"],
};

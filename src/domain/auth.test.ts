import { describe, expect, it } from "vitest";
import { anmeldeUrl, entscheideZugriff, istFreierPfad, sichererPfad } from "./auth";

describe("sichererPfad", () => {
  it.each([
    ["/", "/"],
    ["/training/5", "/training/5"],
    ["/verlauf?alle=1", "/verlauf?alle=1"],
    ["/plan/neu?profil=2&stufe_KN=3", "/plan/neu?profil=2&stufe_KN=3"],
  ])("lässt interne Pfade durch: %s", (eingabe, erwartet) => {
    expect(sichererPfad(eingabe)).toBe(erwartet);
  });

  it.each([
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "http://evil.example",
    "https://evil.example/x",
    "javascript:alert(1)",
    "evil.example",
    "",
    "/a\nb",
    "/a\rb",
    "/a\u0000b",
    "/login",
    "/login?weiter=/x",
    `/${"a".repeat(600)}`,
  ])("weist %j ab", (eingabe) => {
    expect(sichererPfad(eingabe)).toBe("/");
  });

  it("null und undefined ergeben /", () => {
    expect(sichererPfad(null)).toBe("/");
    expect(sichererPfad(undefined)).toBe("/");
  });
});

describe("anmeldeUrl", () => {
  it("hängt den Zielpfad kodiert an", () => {
    expect(anmeldeUrl("/verlauf?alle=1")).toBe("/login?weiter=%2Fverlauf%3Falle%3D1");
  });
  it("Startseite und ungültige Ziele ergeben die nackte Login-Adresse", () => {
    expect(anmeldeUrl("/")).toBe("/login");
    expect(anmeldeUrl("//evil.example")).toBe("/login");
  });
});

describe("istFreierPfad", () => {
  it.each([
    "/login",
    "/api/health",
    "/manifest.webmanifest",
    "/sw.js",
    "/icon.svg",
    "/icon-192.png",
    "/apple-touch-icon.png",
    "/offline.html",
    "/_next/static/chunks/abc.js",
  ])("%s ist frei", (p) => expect(istFreierPfad(p)).toBe(true));

  it.each([
    "/",
    "/api/export",
    "/api/import",
    "/training/1",
    "/katalog",
    "/login/x",
    "/api/healthz",
  ])("%s ist geschützt", (p) => expect(istFreierPfad(p)).toBe(false));
});

describe("entscheideZugriff", () => {
  const basis = {
    pfad: "/verlauf",
    suche: "?alle=1",
    methode: "GET",
    passwortGesetzt: true,
    sitzungGueltig: false,
    istServerAction: false,
  };

  it("ohne Passwort ist alles frei", () => {
    expect(entscheideZugriff({ ...basis, passwortGesetzt: false })).toEqual({ art: "weiter" });
    expect(entscheideZugriff({ ...basis, passwortGesetzt: false, pfad: "/api/export" })).toEqual({
      art: "weiter",
    });
  });

  it("mit gültiger Sitzung ist alles frei", () => {
    expect(entscheideZugriff({ ...basis, sitzungGueltig: true })).toEqual({ art: "weiter" });
    expect(
      entscheideZugriff({ ...basis, sitzungGueltig: true, pfad: "/api/import", methode: "POST" }),
    ).toEqual({ art: "weiter" });
  });

  it("Seitenaufruf ohne Sitzung: Weiterleitung auf die Anmeldung mit Zielpfad", () => {
    expect(entscheideZugriff(basis)).toEqual({
      art: "umleiten",
      ziel: "/login?weiter=%2Fverlauf%3Falle%3D1",
    });
    expect(entscheideZugriff({ ...basis, pfad: "/", suche: "" })).toEqual({
      art: "umleiten",
      ziel: "/login",
    });
  });

  it("API, Export und Import ohne Sitzung: 401", () => {
    for (const pfad of ["/api/export", "/api/import", "/api/irgendwas"]) {
      expect(entscheideZugriff({ ...basis, pfad })).toEqual({ art: "abgelehnt" });
    }
    expect(entscheideZugriff({ ...basis, pfad: "/api/import", methode: "POST" })).toEqual({
      art: "abgelehnt",
    });
  });

  it("Server Actions und andere Nicht-GET-Anfragen ohne Sitzung: 401", () => {
    expect(entscheideZugriff({ ...basis, methode: "POST" })).toEqual({ art: "abgelehnt" });
    expect(entscheideZugriff({ ...basis, istServerAction: true })).toEqual({ art: "abgelehnt" });
    expect(entscheideZugriff({ ...basis, methode: "PUT" })).toEqual({ art: "abgelehnt" });
  });

  it("freie Pfade bleiben ohne Sitzung erreichbar, auch per POST (Login-Aktion)", () => {
    for (const pfad of [
      "/login",
      "/api/health",
      "/manifest.webmanifest",
      "/sw.js",
      "/icon-192.png",
    ]) {
      expect(entscheideZugriff({ ...basis, pfad })).toEqual({ art: "weiter" });
    }
    expect(
      entscheideZugriff({ ...basis, pfad: "/login", methode: "POST", istServerAction: true }),
    ).toEqual({
      art: "weiter",
    });
  });

  it("HEAD wird wie GET behandelt", () => {
    expect(entscheideZugriff({ ...basis, methode: "HEAD" }).art).toBe("umleiten");
  });
});

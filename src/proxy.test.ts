import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const anfrage = (pfad: string, headers: Record<string, string> = {}, method = "GET") =>
  new NextRequest(`http://0.0.0.0:3000${pfad}`, { method, headers });

describe("proxy", () => {
  beforeEach(() => {
    process.env["APP_PASSWORD"] = "geheim";
  });
  afterEach(() => {
    delete process.env["APP_PASSWORD"];
  });

  it("ohne Passwort läuft alles durch", () => {
    delete process.env["APP_PASSWORD"];
    const r = proxy(anfrage("/api/export"));
    expect(r.status).toBe(200);
    expect(r.headers.get("x-middleware-next")).toBe("1");
  });

  it("Seite ohne Sitzung: 307 auf /login unter der aufgerufenen Adresse", () => {
    const r = proxy(anfrage("/verlauf?alle=1", { host: "192.168.178.50:3000" }));
    expect(r.status).toBe(307);
    const ziel = new URL(r.headers.get("location")!, "http://x");
    expect(ziel.host).toBe("192.168.178.50:3000");
    expect(ziel.pathname + ziel.search).toBe("/login?weiter=%2Fverlauf%3Falle%3D1");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("API und Server Actions ohne Sitzung: 401", () => {
    expect(proxy(anfrage("/api/export")).status).toBe(401);
    expect(proxy(anfrage("/api/import", {}, "POST")).status).toBe(401);
    expect(proxy(anfrage("/verlauf", { "next-action": "abc" }, "POST")).status).toBe(401);
  });

  it("Listen in Proxy-Headern: das erste Element zählt", () => {
    const r = proxy(
      anfrage("/", {
        "x-forwarded-host": "app.example, intern:3000",
        "x-forwarded-proto": "https, http",
      }),
    );
    // "https, http" → erstes Element https
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toMatch(/^https:\/\/app\.example\/login$|^\/login$/);
  });

  it.each([
    ["javascript", "app.example"],
    ["https", "evil.example/path"],
    ["https", "evil.example@attacker.example"],
    ["https", "a b"],
    ["ftp", "app.example"],
  ])("ungültiger Proxy-Header (%s, %s) führt zu keiner fremden Weiterleitung", (proto, host) => {
    const r = proxy(anfrage("/", { "x-forwarded-proto": proto, "x-forwarded-host": host }));
    expect(r.status).toBe(307);
    const ort = r.headers.get("location")!;
    expect(ort).not.toMatch(/evil|javascript|attacker/);
    expect(ort).toMatch(/\/login$/);
  });

  it("freie Pfade bleiben frei", () => {
    for (const p of ["/login", "/api/health", "/manifest.webmanifest", "/sw.js", "/offline.html"]) {
      expect(proxy(anfrage(p)).headers.get("x-middleware-next")).toBe("1");
    }
  });
});

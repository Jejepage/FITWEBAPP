// Gemeinsame Steuerung für Browsertests: frische Temp-DB, App starten, Chromium starten, aufräumen.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

export const PORT = Number(process.env.E2E_PORT ?? 3120);
export const BASE = `http://127.0.0.1:${PORT}`;
export const SHOTS = process.env.SHOTS_DIR ?? join(tmpdir(), "fit-e2e-shots");

/** Erster Start: Hinweis bestätigen, damit die App benutzbar ist. */
export async function hinweisBestaetigen(page, base = BASE) {
  await page.goto(`${base}/`);
  await page.getByRole("button", { name: "Verstanden" }).click();
  await page.getByRole("navigation", { name: "Hauptnavigation" }).waitFor();
}

/** Browser-Fehler (Konsole, HTTP >= 400) einer Seite sammeln. */
export function sammleFehler(page) {
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && fehler.push(`HTTP ${r.status()} ${r.url()}`));
  return fehler;
}

/** Erste nicht-lokale IPv4-Adresse dieses Rechners (für Tests im unsicheren HTTP-Kontext). */
export function lanAdresse() {
  for (const eintraege of Object.values(networkInterfaces())) {
    for (const e of eintraege ?? []) if (e.family === "IPv4" && !e.internal) return e.address;
  }
  return null;
}

/**
 * Startet App und Browser. Mit `{ lan: true }` lauscht der Server auf allen Schnittstellen und
 * die Seiten werden über die LAN-Adresse geladen: kein sicherer Kontext, wie später im Heimnetz
 * (dort gibt es weder Wake Lock noch crypto.randomUUID).
 */
export async function withApp(fn, { lan = false, env: zusatzEnv = {} } = {}) {
  const ip = lan ? lanAdresse() : null;
  if (lan && !ip) throw new Error("Keine LAN-Adresse gefunden");
  const host = ip ?? "127.0.0.1";
  const base = `http://${host}:${PORT}`;
  mkdirSync(SHOTS, { recursive: true });
  const dbDir = mkdtempSync(join(tmpdir(), "fit-e2e-"));
  const server = spawn(
    "npx",
    ["next", "start", "-p", String(PORT), "-H", lan ? "0.0.0.0" : "127.0.0.1"],
    {
      env: {
        ...process.env,
        DB_PATH: join(dbDir, "fit.db"),
        NEXT_TELEMETRY_DISABLED: "1",
        ...zusatzEnv,
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true, // eigene Prozessgruppe, damit beim Beenden auch der next-Kindprozess stirbt
    },
  );
  let log = "";
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));

  let browser;
  let fehlgeschlagen = false;
  try {
    let bereit = false;
    for (let i = 0; i < 60 && !bereit; i++) {
      try {
        bereit = (await fetch(`${base}/api/health`)).ok;
      } catch {}
      if (!bereit) await new Promise((r) => setTimeout(r, 500));
    }
    if (!bereit) throw new Error(`Server startet nicht:\n${log}`);
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
      args: ["--no-sandbox"],
    });
    await fn({ browser, BASE: base, SHOTS, dbPfad: join(dbDir, "fit.db") });
    console.log(`\nAlle Prüfungen bestanden. Screenshots: ${SHOTS}`);
  } catch (e) {
    fehlgeschlagen = true;
    console.error("\nFEHLGESCHLAGEN:", e);
    console.error("\nServer-Log:\n" + log.slice(-1500));
  } finally {
    await browser?.close();
    try {
      process.kill(-server.pid);
    } catch {}
    process.exit(fehlgeschlagen ? 1 : 0);
  }
}

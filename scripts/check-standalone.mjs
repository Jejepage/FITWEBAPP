// Prüft den Produktions-Build so, wie ihn das Dockerfile zusammenbaut (ohne Docker): Standalone-
// Verzeichnis + static + public + drizzle + Backup-Skript, Start mit NODE_ENV=production auf
// 0.0.0.0, frische Datenbank. Voraussetzung: `npm run build` ist gelaufen.
//   node scripts/check-standalone.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const wurzel = join(import.meta.dirname, "..");
const PORT = Number(process.env.CHECK_PORT ?? 3130);
const BASE = `http://127.0.0.1:${PORT}`;
const schritt = (s) => console.log(`  ${s}`);

assert.ok(
  existsSync(join(wurzel, ".next/standalone/server.js")),
  "Zuerst `npm run build` ausführen",
);

const tmp = mkdtempSync(join(tmpdir(), "fit-standalone-"));
const app = join(tmp, "app");
// Wie im Dockerfile: Standalone, static, public, drizzle, Skript
cpSync(join(wurzel, ".next/standalone"), app, { recursive: true });
cpSync(join(wurzel, ".next/static"), join(app, ".next/static"), { recursive: true });
cpSync(join(wurzel, "public"), join(app, "public"), { recursive: true });
cpSync(join(wurzel, "drizzle"), join(app, "drizzle"), { recursive: true });
mkdirSync(join(app, "scripts"), { recursive: true });
cpSync(join(wurzel, "scripts/backup-db.cjs"), join(app, "scripts/backup-db.cjs"));

const dbPfad = join(tmp, "data", "fit.db");
const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: String(PORT),
  HOSTNAME: "0.0.0.0",
  DB_PATH: dbPfad,
  NEXT_TELEMETRY_DISABLED: "1",
};
const server = spawn("node", ["server.js"], {
  cwd: app,
  env,
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

let fehlgeschlagen = false;
try {
  let bereit = false;
  for (let i = 0; i < 60 && !bereit; i++) {
    try {
      bereit = (await fetch(`${BASE}/api/health`)).ok;
    } catch {}
    if (!bereit) await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(bereit, `Server startet nicht:\n${log}`);
  schritt("Standalone-Server startet, /api/health antwortet");

  const start = await fetch(`${BASE}/`);
  const html = await start.text();
  assert.equal(start.status, 200);
  assert.match(html, /Verstanden/, "Hinweisseite beim ersten Start");
  assert.match(html, /rel="manifest"/, "Manifest ist verlinkt");
  assert.match(html, /apple-touch-icon/, "Apple-Symbol ist verlinkt");
  assert.match(html, /rel="icon"/, "Browser-Symbol ist verlinkt");
  schritt("Startseite, Manifest- und Symbol-Verweise vorhanden");

  const manifest = await (await fetch(`${BASE}/manifest.webmanifest`)).json();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.ok(manifest.icons.length >= 3);
  for (const icon of manifest.icons) {
    const r = await fetch(`${BASE}${icon.src}`);
    assert.equal(r.status, 200, icon.src);
    assert.match(r.headers.get("content-type") ?? "", /image\/png/, icon.src);
  }
  assert.equal((await fetch(`${BASE}/favicon.ico`)).status, 200, "favicon.ico");
  const apple = await fetch(`${BASE}/apple-touch-icon.png`);
  assert.equal(apple.status, 200);
  schritt(`Manifest gültig, ${manifest.icons.length} Symbole und Apple-Symbol abrufbar`);

  const sw = await fetch(`${BASE}/sw.js`);
  assert.equal(sw.status, 200);
  assert.match(sw.headers.get("content-type") ?? "", /javascript/);
  assert.match(sw.headers.get("cache-control") ?? "", /no-cache/);
  assert.equal(sw.headers.get("service-worker-allowed"), "/");
  schritt("sw.js wird mit den richtigen Headern ausgeliefert");

  const offline = await fetch(`${BASE}/offline.html`);
  assert.equal(offline.status, 200);
  assert.match(await offline.text(), /Keine Verbindung/);
  schritt("offline.html wird ausgeliefert");

  const statisch = html.match(/\/_next\/static\/[^"']+\.(?:css|js)/)?.[0];
  assert.ok(statisch, "statische Datei im HTML");
  assert.equal((await fetch(`${BASE}${statisch}`)).status, 200);
  schritt("statische Dateien (_next/static) werden ausgeliefert");

  const d = new Database(dbPfad, { readonly: true });
  assert.equal(d.prepare("select count(*) c from exercise").get().c, 60);
  assert.equal(d.prepare("select count(*) c from equipment_profile").get().c, 3);
  d.close();
  schritt("Migration und Seed sind gelaufen (60 Übungen, 3 Profile)");

  // Backup-Skript wie im Container: DB_PATH gesetzt, Ziel neben der Datenbank
  const bak = join(tmp, "data", "backup");
  for (let i = 0; i < 3; i++) {
    const r = spawnSync("node", ["scripts/backup-db.cjs", bak, "2"], {
      cwd: app,
      env,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    await new Promise((res) => setTimeout(res, 1100)); // Zeitstempel auf die Sekunde genau
  }
  const dateien = readdirSync(bak).filter((n) => n.endsWith(".db"));
  assert.equal(dateien.length, 2, "nur die neuesten zwei Sicherungen bleiben");
  const kopie = new Database(join(bak, dateien.at(-1)), { readonly: true });
  assert.equal(kopie.prepare("select count(*) c from exercise").get().c, 60);
  assert.equal(kopie.pragma("integrity_check", { simple: true }), "ok");
  kopie.close();
  schritt("Backup-Skript: gültige SQLite-Kopie, Aufräumen auf die letzten N");

  console.log("\nStandalone-Prüfung bestanden.");
} catch (e) {
  fehlgeschlagen = true;
  console.error("\nFEHLGESCHLAGEN:", e);
  console.error("\nServer-Log:\n" + log.slice(-1500));
} finally {
  try {
    process.kill(-server.pid);
  } catch {}
  rmSync(tmp, { recursive: true, force: true });
  process.exit(fehlgeschlagen ? 1 : 0);
}

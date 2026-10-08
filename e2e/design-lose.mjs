// Gestaltungsprüfung für Seiten ohne Navigation, die e2e/design.mjs nicht abdeckt:
//   hinweis  Hinweisseite (frische DB, kein Passwortschutz)
//   login    Anmeldeseite (APP_PASSWORD gesetzt): normal, mit Fehlermeldung, gesperrt
//
//   npm run build && node e2e/design-lose.mjs [hinweis|login]
//
// Ohne Argument laufen beide Modi nacheinander als Kindprozesse (withApp beendet den Prozess nach
// einem Lauf, ein Lauf = ein Server). Screenshots und Prüfungen wie in design.mjs; Befunde stehen in
// <SHOTS_DIR>/design/befunde-lose-<modus>.txt.
//
// Umgebung (alle optional): SHOTS_DIR, DESIGN_BREITEN=390,1440, DESIGN_SCHEMA=hell|dunkel,
// DESIGN_STRENG=1 (Befunde lassen den Lauf fehlschlagen), DESIGN_OHNE_BILDER=1.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pruefeSeite } from "./design-pruefung.mjs";
import { BASE, SHOTS, sammleFehler, withApp } from "./harness.mjs";

const BREITEN = [
  { b: 390, h: 844, touch: true },
  { b: 820, h: 1180, touch: true },
  { b: 1440, h: 900, touch: false },
  { b: 1920, h: 1080, touch: false },
];
const SCHEMEN = [
  ["hell", "light"],
  ["dunkel", "dark"],
];
const PASSWORT = "geheim-test";
const filter = (env) => (process.env[env] ? process.env[env].split(",") : null);
const nurBreiten = filter("DESIGN_BREITEN")?.map(Number);
const nurSchema = process.env.DESIGN_SCHEMA;
const streng = process.env.DESIGN_STRENG === "1";
const ohneBilder = process.env.DESIGN_OHNE_BILDER === "1";

const modus = process.argv[2];
if (!modus) {
  // Beide Modi nacheinander, jeweils in eigenem Prozess
  let fehlgeschlagen = false;
  for (const m of ["hinweis", "login"]) {
    console.log(`\n=== design-lose: ${m} ===`);
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), m], {
      stdio: "inherit",
      env: process.env,
    });
    if (r.status !== 0) fehlgeschlagen = true;
  }
  process.exit(fehlgeschlagen ? 1 : 0);
}
if (!["hinweis", "login"].includes(modus))
  throw new Error(`Unbekannter Modus „${modus}“ (hinweis | login)`);

/** Je Breite und Farbschema eine Seite öffnen, aufnehmen und prüfen. */
async function durchlauf(browser, seiten, vorbereiten) {
  const ziel = join(SHOTS, "design");
  mkdirSync(ziel, { recursive: true });
  const befunde = [];

  for (const { b, h, touch } of BREITEN) {
    if (nurBreiten && !nurBreiten.includes(b)) continue;
    for (const [schemaName, colorScheme] of SCHEMEN) {
      if (nurSchema && nurSchema !== schemaName) continue;
      const context = await browser.newContext({
        viewport: { width: b, height: h },
        colorScheme,
        hasTouch: touch,
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const fehler = sammleFehler(page);
      if (vorbereiten) await vorbereiten(page);
      for (const [schluessel, oeffnen] of Object.entries(seiten)) {
        await oeffnen(page);
        await page.waitForTimeout(350); // Einblend-Animation abwarten
        if (!ohneBilder)
          await page.screenshot({
            path: join(ziel, `${schluessel}-${b}-${schemaName}.png`),
            fullPage: true,
          });
        for (const f of await pruefeSeite(page, { touch, breite: b }))
          befunde.push(`${schluessel} @${b} ${schemaName}: ${f}`);
      }
      if (fehler.length)
        befunde.push(`@${b} ${schemaName}: Konsolen-/HTTP-Fehler: ${fehler.join(" | ")}`);
      await context.close();
    }
  }

  writeFileSync(join(ziel, `befunde-lose-${modus}.txt`), befunde.join("\n") + "\n");
  console.log(`\n${befunde.length} Befunde (Liste: ${join(ziel, `befunde-lose-${modus}.txt`)})`);
  for (const f of befunde.slice(0, 80)) console.log(`  - ${f}`);
  if (befunde.length > 80) console.log(`  … ${befunde.length - 80} weitere`);
  if (streng && befunde.length) throw new Error(`${befunde.length} Gestaltungsbefunde`);
}

if (modus === "hinweis") {
  // Frische DB: die Hinweisseite erscheint auf jeder Seite, bis sie bestätigt ist.
  await withApp(({ browser }) =>
    durchlauf(browser, {
      hinweis: async (page) => {
        await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: "Wichtiger Hinweis" }).waitFor();
        assert.equal(
          await page.getByRole("navigation", { name: "Hauptnavigation" }).count(),
          0,
          "keine Navigation vor der Bestätigung",
        );
      },
    }),
  );
} else {
  let echterVersuch = false;
  await withApp(
    ({ browser }) =>
      durchlauf(browser, {
        login: async (page) => {
          await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
          await page.getByRole("heading", { name: "Anmelden", level: 1 }).waitFor();
        },
        // Echter Fehlversuch nur einmal (fünf Versuche sperren die Anmeldung); danach dieselbe
        // Seite über die Adresse, die die Server Action nach einem Fehlversuch ansteuert.
        "login-fehler": async (page) => {
          if (!echterVersuch) {
            echterVersuch = true;
            await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
            await page.getByLabel("Passwort").fill("falsch");
            await page.getByRole("button", { name: "Anmelden" }).click();
            await page.getByText("Das Passwort stimmt nicht.").waitFor();
            await page.waitForLoadState("networkidle");
          } else {
            await page.goto(`${BASE}/login?fehler=falsch`, { waitUntil: "networkidle" });
            await page.getByText("Das Passwort stimmt nicht.").waitFor();
          }
        },
        "login-gesperrt": async (page) => {
          await page.goto(`${BASE}/login?fehler=gesperrt`, { waitUntil: "networkidle" });
          await page.getByText(/Zu viele Fehlversuche/).waitFor();
        },
      }),
    { env: { APP_PASSWORD: PASSWORT } },
  );
}

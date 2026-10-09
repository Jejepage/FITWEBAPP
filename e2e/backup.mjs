// Browsertest für die Datensicherung (Abschnitt 8): Export, Import, Fehlerfälle.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import {
  BASE,
  SHOTS,
  hinweisBestaetigen,
  sammleFehler,
  withApp,
} from "./harness.mjs";

const schritt = (s) => console.log(`  ${s}`);

async function ablauf(browser, dbPfad) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    acceptDownloads: true,
  });
  context.on("dialog", (d) => d.accept()); // confirm() beim vorzeitigen Abschluss
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  const shot = (n) =>
    page.screenshot({ path: join(SHOTS, `backup-${n}.png`), fullPage: true });
  const keinHorizontalScroll = async (wo) =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `horizontales Scrollen auf ${wo}`,
    );
  const abfrage = (sql, ...args) => {
    const d = new Database(dbPfad, { readonly: true });
    try {
      return d.prepare(sql).all(...args);
    } finally {
      d.close();
    }
  };
  const schreibe = (sql, ...args) => {
    const d = new Database(dbPfad);
    d.prepare(sql).run(...args);
    d.close();
  };
  const tmp = mkdtempSync(join(tmpdir(), "fit-e2e-dl-"));

  await hinweisBestaetigen(page);
  await page.goto(`${BASE}/plan/neu`);
  await page
    .getByRole("button", { name: "Plan speichern und aktivieren" })
    .click();
  await page
    .getByRole("heading", { name: "Plan", level: 1, exact: true })
    .waitFor();

  // --- 1. Eine Einheit trainieren (Daten für die Sicherung) -----------------------------------
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: "Training starten" }).click();
  await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  await page.getByText("Weitere Aktionen").click();
  await page
    .getByRole("button", { name: "Einheit vorzeitig abschließen" })
    .click();
  await page.getByRole("heading", { name: "Geschafft", level: 1 }).waitFor();
  await page.getByRole("button", { name: "Einheit abschließen" }).click();
  await page.getByText("Einheit gespeichert. Gut gemacht!").waitFor();
  const w = abfrage("select * from workout")[0];
  assert.equal(w.status, "abgeschlossen");
  const plan = abfrage("select * from plan")[0];
  assert.deepEqual(JSON.parse(plan.equipment), [
    "kurzhanteln",
    "kettlebell",
    "bank",
    "stange",
  ]);
  schritt("Einheit gespeichert, Plan mit Equipment");

  await page.getByRole("link", { name: "Zur Startseite" }).click();
  await page.getByText("Einheit B · Woche 1 von 6").waitFor();
  schritt("Zählt für den Wochenfortschritt (nächste Einheit B)");

  // --- 3. Export -----------------------------------------------------------------------------
  await page.goto(`${BASE}/einstellungen`);
  await page.getByRole("link", { name: /Datensicherung/ }).click();
  await page
    .getByRole("heading", { name: "Datensicherung", level: 1 })
    .waitFor();
  await keinHorizontalScroll("Datensicherung");
  await shot("2-daten");
  const [dl1] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Alle Daten exportieren" }).click(),
  ]);
  assert.match(
    dl1.suggestedFilename(),
    /^fitness-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const allesPfad = join(tmp, "alles.json");
  await dl1.saveAs(allesPfad);
  const alles = JSON.parse(readFileSync(allesPfad, "utf8"));
  assert.equal(alles.format, "fit-backup");
  assert.equal(alles.art, "alles");
  assert.equal(alles.daten.uebungen.length, 63);
  assert.equal(alles.daten.einheiten.length, 1);
  assert.equal(alles.daten.plaene.length, 1);
  const [dl2] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Nur den Katalog exportieren" }).click(),
  ]);
  assert.match(dl2.suggestedFilename(), /^fitness-katalog-/);
  const katalogPfad = join(tmp, "katalog.json");
  await dl2.saveAs(katalogPfad);
  assert.deepEqual(
    Object.keys(JSON.parse(readFileSync(katalogPfad, "utf8")).daten),
    ["uebungen"],
  );
  schritt(
    "Export: Gesamt-Backup (63 Übungen, 1 Plan, 1 Einheit) und Katalog als Download",
  );

  // --- 4. Katalogimport stellt Änderungen wieder her ---------------------------------------
  const originalName = abfrage(
    "select name from exercise where id = 'KN-03'",
  )[0].name;
  schreibe(
    "update exercise set name = 'Geändert', aktiv = 0 where id = 'KN-03'",
  );
  const katalogForm = page.locator("form", {
    has: page.getByRole("heading", { name: "Katalog importieren" }),
  });
  await katalogForm.locator("input[type=file]").setInputFiles(katalogPfad);
  await katalogForm
    .getByRole("button", { name: "Katalog importieren" })
    .click();
  await page.getByText("Import erfolgreich.").waitFor();
  await page.getByText(/63 Übungen/).waitFor();
  const kn = abfrage("select name, aktiv from exercise where id = 'KN-03'")[0];
  assert.deepEqual([kn.name, kn.aktiv], [originalName, 1]);
  assert.equal(
    abfrage("select count(*) c from workout")[0].c,
    1,
    "Einheiten bleiben beim Katalogimport",
  );
  schritt(
    "Katalogimport: geänderte Übung wiederhergestellt, Einheiten unberührt",
  );

  // --- 5. Vollimport ------------------------------------------------------------------------
  schreibe("update settings set aufwaermen_text = 'Zwischenstand'");
  schreibe("delete from set_log");
  const alleForm = page.locator("form", {
    has: page.getByRole("heading", { name: "Alle Daten importieren" }),
  });
  await alleForm.locator("input[type=file]").setInputFiles(allesPfad);
  await alleForm.getByRole("checkbox").check();
  await alleForm
    .getByRole("button", { name: "Alle Daten importieren" })
    .click();
  await page.getByText("Import erfolgreich.").waitFor();
  await page.getByText(/1 Einheiten/).waitFor();
  assert.equal(
    abfrage("select count(*) c from set_log")[0].c,
    alles.daten.saetze.length,
  );
  assert.notEqual(
    abfrage("select aufwaermen_text t from settings")[0].t,
    "Zwischenstand",
  );
  assert.equal(abfrage("select count(*) c from exercise")[0].c, 63);
  await page.goto(`${BASE}/verlauf`);
  await page.getByText("Einheit A · Woche 1").first().waitFor();
  schritt(
    "Vollimport: Sätze und Einstellungen wiederhergestellt, App läuft weiter",
  );

  // --- 6. Fehlerfälle: nichts wird geändert -------------------------------------------------
  const vorher = JSON.stringify(abfrage("select * from exercise order by id"));
  await page.goto(`${BASE}/einstellungen/daten`);
  const form2 = page.locator("form", {
    has: page.getByRole("heading", { name: "Katalog importieren" }),
  });
  await form2.locator("input[type=file]").setInputFiles({
    name: "kaputt.json",
    mimeType: "application/json",
    buffer: Buffer.from("das ist kein json"),
  });
  await form2.getByRole("button", { name: "Katalog importieren" }).click();
  await page
    .getByText("Der Import wurde nicht durchgeführt. Es wurde nichts geändert.")
    .waitFor();
  await page.getByText("Die Datei ist keine gültige JSON-Datei.").waitFor();
  await shot("3-fehler");

  const falsch = JSON.parse(readFileSync(katalogPfad, "utf8"));
  falsch.version = 99;
  falsch.daten.uebungen[0].stufe = 9;
  await page.goto(`${BASE}/einstellungen/daten`);
  const form3 = page.locator("form", {
    has: page.getByRole("heading", { name: "Katalog importieren" }),
  });
  await form3.locator("input[type=file]").setInputFiles({
    name: "falsch.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(falsch)),
  });
  await form3.getByRole("button", { name: "Katalog importieren" }).click();
  await page.getByText(/Version 99/).waitFor();
  assert.equal(
    JSON.stringify(abfrage("select * from exercise order by id")),
    vorher,
  );

  // Vollimport ohne Bestätigung (am Formular vorbei) wird serverseitig abgelehnt
  const datei = {
    name: "alles.json",
    mimeType: "application/json",
    buffer: readFileSync(allesPfad),
  };
  const ohne = await page.request.post(`${BASE}/api/import`, {
    multipart: { art: "alles", datei },
    maxRedirects: 0,
  });
  assert.equal(ohne.status(), 303);
  assert.match(decodeURIComponent(ohne.headers().location), /bestätige/);
  // fremde Herkunft: 403
  const fremd = await page.request.post(`${BASE}/api/import`, {
    multipart: { art: "alles", bestaetigt: "ersetzen", datei },
    headers: { Origin: "http://evil.example" },
    maxRedirects: 0,
  });
  assert.equal(fremd.status(), 403);
  assert.equal(abfrage("select count(*) c from workout")[0].c, 1);
  schritt(
    "Fehlerfälle: kaputte Datei, falsche Version/Werte, fehlende Bestätigung, fremde Herkunft – nichts geändert",
  );

  // --- 7. Tippflächen -----------------------------------------------------------------------
  await page.goto(`${BASE}/einstellungen/daten`);
  const zuKlein = await page.evaluate(() =>
    [...document.querySelectorAll("main a, main button, main input")]
      .map((el) => ({
        t: (el.textContent || el.name || "").trim().slice(0, 30),
        r: (el.closest("label") ?? el).getBoundingClientRect(), // Checkbox: über ihr Label bedienbar
      }))
      .filter((x) => x.r.height > 0 && x.r.height < 40 && !x.t.startsWith("←"))
      .map((x) => `${x.t} (${Math.round(x.r.height)} px)`),
  );
  assert.deepEqual(zuKlein, [], "Tippflächen < 40 px");
  assert.deepEqual(
    fehler.filter((f) => !f.includes("HTTP 403")),
    [],
    "Browser-Fehler",
  );
  await context.close();
}

console.log("Mobil (390×844)");
await withApp(({ browser, dbPfad }) => ablauf(browser, dbPfad));

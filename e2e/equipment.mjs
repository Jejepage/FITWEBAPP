// Browsertest für das Equipment im Plan: ändern (z. B. neues Gerät), Fehlermeldungen, Auswirkung auf
// Start und Tauschliste, Ersatzübungen unterwegs.
import assert from "node:assert/strict";
import { join } from "node:path";
import Database from "better-sqlite3";
import {
  BASE,
  SHOTS,
  hinweisBestaetigen,
  planAnlegen,
  sammleFehler,
  withApp,
} from "./harness.mjs";

const schritt = (s) => console.log(`  ${s}`);

async function ablauf(browser, dbPfad) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  context.on("dialog", (d) => d.accept());
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  const shot = (n) =>
    page.screenshot({ path: join(SHOTS, `equipment-${n}.png`), fullPage: true });
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
  const box = (n) => page.getByRole("checkbox", { name: n, exact: true });
  const speichern = () => page.getByRole("button", { name: "Speichern" }).click();

  await hinweisBestaetigen(page);
  await planAnlegen(page);

  // 1. Plan-Seite zeigt Equipment und Hantelgewichte, "Ändern" führt zum Formular
  await page.getByText("Kurzhanteln, Kettlebell, Bank, Stange").waitFor();
  await page.getByText(/Kurzhanteln: 2–20\/2 kg/).waitFor();
  await keinHorizontalScroll("Plan");
  await page.getByRole("link", { name: "Ändern" }).click();
  await page
    .getByRole("heading", { name: "Equipment ändern", level: 1 })
    .waitFor();
  assert.ok(await box("Kurzhanteln").isChecked());
  assert.ok(!(await box("Maschinen/Kabelzug").isChecked()));
  assert.equal(
    await page.getByLabel("Gewichte Kurzhanteln (kg)").inputValue(),
    "2–20/2",
  );
  await page.getByText("Damit machbar").waitFor();
  await keinHorizontalScroll("Equipment ändern");
  await shot("1-formular");
  schritt("Equipment-Seite zeigt Häkchen, Gewichte und die Machbar-Vorschau");

  // 2. Neue Maschine und andere Hantelgewichte speichern
  await box("Maschinen/Kabelzug").check();
  await page.getByLabel("Gewichte Kurzhanteln (kg)").fill("10, 20");
  await speichern();
  await page
    .getByRole("heading", { name: "Plan", level: 1, exact: true })
    .waitFor();
  await page.getByText("Maschinen/Kabelzug, Kurzhanteln, Kettlebell").waitFor();
  const gespeichert = abfrage("select equipment, gewichte from plan")[0];
  assert.deepEqual(JSON.parse(gespeichert.equipment), [
    "maschinen",
    "kurzhanteln",
    "kettlebell",
    "bank",
    "stange",
  ]);
  assert.deepEqual(JSON.parse(gespeichert.gewichte).kurzhanteln, [10, 20]);
  assert.equal(abfrage("select count(*) c from plan_slot")[0].c, 16);
  schritt("Equipment und Gewichte gespeichert, die 16 Plan-Slots bleiben");

  // 3. Ungültige Gewichte: Fehler am Feld, nichts geändert
  await page.goto(`${BASE}/plan/equipment`);
  await page.getByLabel("Gewichte Kurzhanteln (kg)").fill("12,16");
  await speichern();
  await page.getByText(/ist unklar/).waitFor();
  await page.getByText("Bitte die markierten Felder prüfen.").waitFor();
  assert.equal(
    JSON.parse(abfrage("select gewichte from plan")[0].gewichte).kurzhanteln.join(),
    "10,20",
  );
  schritt("Ungültige Gewichte werden am Feld gemeldet, nichts geändert");

  // 4. Neues Gerät erscheint sofort in der Tauschliste (Beinpresse für die Kniebeuge)
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: "Training starten" }).click();
  await page.waitForURL(/\/training\/\d+$/);
  await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  await page.getByText("Übung ersetzen", { exact: true }).click();
  const liste = page
    .locator("details", { hasText: "Übung ersetzen" })
    .getByRole("button");
  const texte = await liste.allInnerTexts();
  assert.ok(
    texte.some((t) => t.includes("Beinpresse")),
    `Beinpresse in der Tauschliste: ${texte.join(" | ")}`,
  );
  schritt("Das neue Gerät steht sofort in der Tauschliste");

  // 5. Ersatzübungen stehen am Ende, gekennzeichnet; Auswahl gilt nur für diese Einheit
  const ersatzIndex = texte.findIndex((t) => t.includes("Ersatz"));
  assert.ok(ersatzIndex > 0, "Ersatzübungen kommen nach den Planübungen");
  assert.ok(
    texte.slice(ersatzIndex).every((t) => t.includes("Ersatz")),
    "ab der ersten Ersatzübung nur noch Ersatzübungen",
  );
  const name = texte[ersatzIndex].split("\n")[0].trim();
  await liste.nth(ersatzIndex).click();
  await page.getByRole("heading", { name, level: 1 }).waitFor();
  await page.getByText("ersetzt", { exact: true }).waitFor();
  await shot("2-ersatz-gewaehlt");
  const w = abfrage("select ersetzungen from workout")[0];
  assert.equal(Object.keys(JSON.parse(w.ersetzungen)).length, 1);
  assert.equal(abfrage("select count(*) c from plan_slot where exercise_id like 'KN-0%'")[0].c, 2);
  schritt(`Ersatzübung „${name}“ gewählt, nur für diese Einheit gespeichert`);

  // Einheit abbrechen, damit die nächste Prüfung eine neue starten kann
  await page.getByText("Weitere Aktionen").click();
  await page.getByRole("button", { name: "Einheit abbrechen" }).click();
  await page.waitForURL(`${BASE}/`);

  // 6. Equipment weg: Planübungen ohne passendes Equipment werden beim Start ersetzt
  await page.goto(`${BASE}/plan/equipment`);
  await box("Kurzhanteln").uncheck();
  await box("Kettlebell").uncheck();
  await box("Bank").uncheck();
  await box("Maschinen/Kabelzug").uncheck();
  await speichern();
  await page
    .getByText(/Für \d+ Übungen? des Plans fehlt Equipment/)
    .waitFor();
  await shot("3-equipment-fehlt");
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: "Training starten" }).click();
  await page.waitForURL(/\/training\/\d+$/);
  const neu = abfrage(
    "select ersetzungen from workout where status = 'laufend'",
  )[0];
  assert.ok(
    Object.keys(JSON.parse(neu.ersetzungen)).length >= 1,
    "Übungen ohne passendes Equipment sind ersetzt",
  );
  assert.equal(abfrage("select count(*) c from plan_slot")[0].c, 16);
  schritt("Ohne passendes Equipment werden Übungen beim Start ersetzt, Plan bleibt");

  // 7. Ohne jedes Equipment geht es nicht: Meldung mit den fehlenden Mustern, keine neue Einheit
  await page.getByText("Weitere Aktionen").or(page.getByRole("button", { name: "Aufwärmen erledigt" })).first().waitFor();
  await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  await page.getByText("Weitere Aktionen").click();
  await page.getByRole("button", { name: "Einheit abbrechen" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/plan/equipment`);
  await box("Stange").uncheck();
  await speichern();
  await page
    .getByRole("heading", { name: "Plan", level: 1, exact: true })
    .waitFor();
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: "Training starten" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: /Mit dem Equipment des Plans gibt es für .*Ziehen vertikal/ })
    .waitFor();
  assert.equal(
    abfrage("select count(*) c from workout where status = 'laufend'")[0].c,
    0,
  );
  schritt("Ohne Equipment: Meldung mit fehlenden Mustern, keine Einheit gestartet");

  assert.deepEqual(fehler, [], "Browser-Fehler");
  await context.close();
}

await withApp(({ browser, dbPfad }) => ablauf(browser, dbPfad));

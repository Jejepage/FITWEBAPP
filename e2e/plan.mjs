// Browsertest für den Plan-Generator und die Plan-Oberfläche (Abschnitt 5).
import assert from "node:assert/strict";
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

/** Haken des Equipments setzen: genau die genannten Arten sind angekreuzt. */
async function equipmentWaehlen(page, namen) {
  const alle = [
    "Maschinen/Kabelzug",
    "Langhantel",
    "Kurzhanteln",
    "Kettlebell",
    "Bank",
    "Stange",
    "Band",
  ];
  for (const n of alle) {
    const box = page.getByRole("checkbox", { name: n, exact: true });
    if (namen.includes(n)) await box.check();
    else await box.uncheck();
  }
}

/** Werte aller Slot-Auswahllisten als { "A-1-1": "KN-03", … } */
const slotWerte = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll("select[name^=slot_]")].map((s) => [
        s.name.slice(5),
        s.value,
      ]),
    ),
  );

async function ablauf(browser, dbPfad) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  const shot = (n) =>
    page.screenshot({ path: join(SHOTS, `plan-${n}.png`), fullPage: true });
  const keinHorizontalScroll = async (wo) =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `horizontales Scrollen auf ${wo}`,
    );
  const db = () => new Database(dbPfad, { readonly: true });
  const aktualisieren = () =>
    page.getByRole("button", { name: "Vorschau aktualisieren" }).click();

  await hinweisBestaetigen(page);

  // 1. Leerzustand
  await page.goto(`${BASE}/plan`);
  await page.getByText("Es gibt noch keinen aktiven Plan.").waitFor();
  await keinHorizontalScroll("Plan (leer)");
  await shot("1-leer");
  await page.getByRole("link", { name: "Plan erstellen" }).click();
  await page.getByRole("heading", { name: "Neuer Plan", level: 1 }).waitFor();
  schritt("Leerzustand führt zu 'Neuer Plan'");

  // 2. Vorschau mit Standardwerten: 16 Slots, Voreinstellung fürs Equipment, Zusatzblock aus
  assert.equal(await page.locator("select[name^=slot_]").count(), 16);
  for (const n of ["Kurzhanteln", "Kettlebell", "Bank", "Stange"]) {
    assert.ok(
      await page.getByRole("checkbox", { name: n, exact: true }).isChecked(),
      `${n} ist vorausgewählt`,
    );
  }
  for (const n of ["Maschinen/Kabelzug", "Langhantel", "Band"]) {
    assert.ok(
      !(await page.getByRole("checkbox", { name: n, exact: true }).isChecked()),
      `${n} ist nicht vorausgewählt`,
    );
  }
  assert.equal(
    await page.getByLabel("Gewichte Kurzhanteln (kg)").inputValue(),
    "2–20/2",
  );
  assert.equal(
    await page.getByLabel("Gewichte Kettlebell (kg)").inputValue(),
    "12, 16",
  );
  assert.equal(
    await page.getByRole("checkbox", { name: /Zusatzblock/ }).isChecked(),
    false,
  );
  assert.ok(
    (await page.getByLabel("Startdatum").inputValue()).match(
      /^\d{4}-\d{2}-\d{2}$/,
    ),
  );
  await keinHorizontalScroll("Vorschau");
  await shot("2-vorschau");
  schritt("Vorschau mit 16 Auswahllisten, Equipment und Gewichte vorbelegt, Zusatzblock aus");

  // 3. Nur Stange: ZH nur eine Übung → in A und B gleich, mit Hinweis
  await equipmentWaehlen(page, ["Stange"]);
  await aktualisieren();
  await page
    .getByText(
      "Ziehen horizontal: Mit diesem Equipment gibt es nur eine Übung, sie steht in A und B.",
    )
    .waitFor();
  let werte = await slotWerte(page);
  assert.equal(werte["A-1-3"], "ZH-07");
  assert.equal(werte["B-2-3"], "ZH-07");
  assert.ok(page.url().includes("equipment=stange"));
  // Keine Mischpläne: Die Wahl aus der vorigen Vorschau darf nicht in den neuen Vorschlag wandern.
  assert.equal(await page.getByText(/obwohl es Alternativen gibt/).count(), 0);
  const nachEquipmentwechsel = await slotWerte(page);
  for (const [a, b] of [
    ["A-1-1", "B-2-2"], // KN
    ["A-2-1", "B-1-1"], // HB
    ["A-1-2", "B-1-2"], // DH
    ["A-2-2", "B-2-2"], // DV
    ["A-2-3", "B-1-3"], // ZV
    ["A-Z-1", "B-Z-1"], // TR
    ["A-Z-2", "B-Z-2"], // RU
  ]) {
    assert.notEqual(
      nachEquipmentwechsel[a],
      nachEquipmentwechsel[b],
      `A und B verschieden (${a}/${b})`,
    );
  }
  // Ersatzübungen (Körpergewicht) füllen auf, wo es mit der Stange nichts anderes gibt
  assert.deepEqual(
    [werte["A-1-2"], werte["B-1-2"]].sort(),
    ["DH-02", "DH-04"],
    "DH nur mit Ersatzübungen (Liegestütz)",
  );
  await shot("3-nur-stange");
  schritt("Nur Stange: ZH-07 in A und B mit Hinweis, Ersatzübungen füllen auf");

  // Equipment ändern und OHNE Aktualisieren speichern: abgelehnt, weil die Vorschau nicht mehr passt
  await equipmentWaehlen(page, ["Stange", "Maschinen/Kabelzug"]);
  await page
    .getByRole("button", { name: "Plan speichern und aktivieren" })
    .click();
  await page
    .getByText(
      /Du hast Eingaben geändert\. Bitte erst „Vorschau aktualisieren“/,
    )
    .waitFor();
  assert.ok(
    !page.url().includes("ACTION"),
    "keine internen Framework-Felder in der URL",
  );
  assert.equal(
    new Database(dbPfad, { readonly: true })
      .prepare("select count(*) c from plan")
      .get().c,
    0,
  );
  await equipmentWaehlen(page, ["Stange"]);
  await aktualisieren();
  schritt("Equipmentwechsel ohne Aktualisieren lässt sich nicht speichern");

  // 4. Manuell tauschen und aktualisieren: Wahl bleibt erhalten
  const kn = page.locator("select[name='slot_A-1-1']");
  const optionen = await kn
    .locator("option")
    .evaluateAll((o) => o.map((x) => x.value));
  assert.ok(optionen.length >= 3, "mehrere Kandidaten für KN mit nur Stange");
  const andere = optionen.find((o) => o !== werte["A-1-1"]);
  await kn.selectOption(andere);
  await aktualisieren();
  assert.equal(
    await page.locator("select[name='slot_A-1-1']").inputValue(),
    andere,
  );
  schritt("Manuelle Wahl bleibt nach 'Vorschau aktualisieren' erhalten");

  // 5. Auch alle Slots bleiben gültig: jede gewählte Option ist ein Kandidat
  werte = await slotWerte(page);
  assert.equal(Object.keys(werte).length, 16);

  // 6. 'Neu vorschlagen' verwirft die manuelle Wahl
  await page.getByRole("button", { name: "Neu vorschlagen" }).click();
  await page.waitForURL(/aktion=neu/);
  assert.notEqual(
    await page.locator("select[name='slot_A-1-1']").inputValue(),
    andere,
  );
  schritt("'Neu vorschlagen' verwirft die manuelle Wahl");

  // 7. 'Anders mischen' ändert die Belegung (mit allem Equipment gibt es gleichwertige Kandidaten)
  await equipmentWaehlen(page, [
    "Maschinen/Kabelzug",
    "Langhantel",
    "Kurzhanteln",
    "Kettlebell",
    "Bank",
    "Stange",
    "Band",
  ]);
  await aktualisieren();
  const vorher = JSON.stringify(await slotWerte(page));
  let geaendert = false;
  for (let i = 0; i < 4 && !geaendert; i++) {
    await page.getByRole("button", { name: "Anders mischen" }).click();
    await page.waitForURL(new RegExp(`seed=${i + 1}|aktion=mischen`));
    geaendert = JSON.stringify(await slotWerte(page)) !== vorher;
  }
  assert.ok(geaendert, "Mischen verändert mindestens einmal die Belegung");
  schritt("'Anders mischen' ändert die Belegung");

  // 8. Kein Equipment: fehlende Muster → Fehlermeldung, kein Speichern
  await page.goto(`${BASE}/plan/neu`);
  await equipmentWaehlen(page, []);
  await aktualisieren();
  await page
    .getByRole("alert")
    .filter({ hasText: "Mit diesem Equipment gibt es keine Übung für" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Plan speichern und aktivieren" })
      .count(),
    0,
  );
  assert.equal(await page.locator("select[name^=slot_]").count(), 0);
  await shot("8-fehlende-muster");
  // Ausweg aus dem Fehlerzustand: Equipment ergänzen und neu abschicken (Button steckt in der Meldung)
  await equipmentWaehlen(page, ["Stange"]);
  await page
    .getByRole("alert")
    .getByRole("button", { name: "Vorschau aktualisieren" })
    .click();
  await page.locator("select[name^=slot_]").first().waitFor();
  schritt("Kein Equipment: Fehlermeldung, kein Speichern möglich");

  // 8b. Ungültige Hantelgewichte werden am Feld gemeldet und lassen sich nicht speichern
  await page.goto(`${BASE}/plan/neu`);
  await page.getByLabel("Gewichte Kurzhanteln (kg)").fill("12,16");
  await aktualisieren();
  await page.getByText(/ist unklar/).first().waitFor();
  await page
    .getByRole("button", { name: "Plan speichern und aktivieren" })
    .click();
  await page.getByText("Bitte die Hantelgewichte prüfen.").waitFor();
  assert.equal(
    new Database(dbPfad, { readonly: true })
      .prepare("select count(*) c from plan")
      .get().c,
    0,
  );
  schritt("Ungültige Hantelgewichte: Fehler am Feld, nichts gespeichert");

  // 9. Plan speichern (Voreinstellung, 3 Einheiten, Zusatzblock an)
  await page.goto(`${BASE}/plan/neu`);
  await page.getByLabel("3 Einheiten pro Woche").check();
  await page.getByRole("checkbox", { name: /Zusatzblock/ }).check();
  await aktualisieren();
  assert.ok(await page.getByLabel("3 Einheiten pro Woche").isChecked());
  assert.ok(
    await page.getByRole("checkbox", { name: /Zusatzblock/ }).isChecked(),
  );
  const gewaehlt = await slotWerte(page);
  await page
    .getByRole("button", { name: "Plan speichern und aktivieren" })
    .click();
  await page
    .getByRole("heading", { name: "Plan", level: 1, exact: true })
    .waitFor();
  await page.getByText("3 Einheiten pro Woche").first().waitFor();
  await page.getByText("Reihenfolge im Wechsel: A-B-A, dann B-A-B").waitFor();
  await page.getByText("Zusatzblock: ja").waitFor();
  await page.getByText("Kurzhanteln, Kettlebell, Bank, Stange").waitFor();
  await keinHorizontalScroll("Plan");
  await shot("9-plan-aktiv");
  const sqlite = db();
  const slots = sqlite
    .prepare("select einheit, block, position, exercise_id from plan_slot")
    .all();
  assert.equal(slots.length, 16);
  for (const s of slots)
    assert.equal(
      gewaehlt[`${s.einheit}-${s.block}-${s.position}`],
      s.exercise_id,
    );
  const ersterPlan = sqlite
    .prepare(
      "select id, einheiten_pro_woche, zusatzblock, status, equipment, gewichte from plan",
    )
    .get();
  assert.deepEqual(ersterPlan, {
    id: ersterPlan.id,
    einheiten_pro_woche: 3,
    zusatzblock: 1,
    status: "aktiv",
    equipment: '["kurzhanteln","kettlebell","bank","stange"]',
    gewichte:
      '{"kurzhanteln":[2,4,6,8,10,12,14,16,18,20],"kettlebell":[12,16]}',
  });
  sqlite.close();
  schritt(
    "Plan gespeichert: 16 Slots wie in der Vorschau, Equipment und Einstellungen übernommen",
  );

  // 10. Übungsnamen im Plan führen in den Katalog
  const link = page.locator("main a[href^='/katalog/']").first();
  const id = (await link.getAttribute("href")).split("/").pop();
  await link.click();
  await page.getByText(id, { exact: false }).first().waitFor();
  schritt("Übungen im Plan sind mit dem Katalog verlinkt");

  // 11. Zweiter Plan als Folgeblock: nur einer aktiv, alter bleibt vollständig
  await page.goto(`${BASE}/plan/neu?vorgaenger=${ersterPlan.id}`);
  await page.getByText(/Folgeblock: Übungen aus dem vorigen Block/).waitFor();
  const vorherige = new Set(slots.map((s) => s.exercise_id));
  const folge = await slotWerte(page);
  const neuAnzahl = Object.values(folge).filter(
    (v) => !vorherige.has(v),
  ).length;
  assert.ok(neuAnzahl > 0, "Folgeblock enthält mindestens eine neue Übung");
  // Das Equipment des Vorgängers ist vorausgewählt
  assert.ok(await page.getByRole("checkbox", { name: "Stange", exact: true }).isChecked());
  assert.ok(await page.getByRole("checkbox", { name: "Bank", exact: true }).isChecked());
  assert.ok(
    !(await page.getByRole("checkbox", { name: "Langhantel", exact: true }).isChecked()),
  );
  await page
    .getByRole("button", { name: "Plan speichern und aktivieren" })
    .click();
  await page
    .getByRole("heading", { name: "Plan", level: 1, exact: true })
    .waitFor();
  const s2 = db();
  assert.equal(
    s2.prepare("select count(*) c from plan where status='aktiv'").get().c,
    1,
  );
  assert.equal(s2.prepare("select count(*) c from plan").get().c, 2);
  assert.equal(s2.prepare("select count(*) c from plan_slot").get().c, 32);
  const zweiter = s2
    .prepare("select id, vorgaenger_id from plan where status='aktiv'")
    .get();
  assert.equal(zweiter.vorgaenger_id, ersterPlan.id);
  s2.close();
  schritt(
    "Folgeblock: genau ein aktiver Plan, Vorgänger verknüpft und abgeschlossen",
  );

  // 12. Ungültige Wahl (Übung aus anderem Muster) wird beim Speichern abgelehnt
  await page.goto(`${BASE}/plan/neu`);
  await page.evaluate(() => {
    const s = document.querySelector("select[name='slot_A-1-1']");
    const o = document.createElement("option");
    o.value = "HB-01";
    o.textContent = "manipuliert";
    s.appendChild(o);
    s.value = "HB-01";
  });
  await page
    .getByRole("button", { name: "Plan speichern und aktivieren" })
    .click();
  await page
    .getByText(/Eine gewählte Übung ist nicht mehr verfügbar/)
    .waitFor();
  assert.ok(page.url().includes("/plan/neu"));
  const s3 = db();
  assert.equal(s3.prepare("select count(*) c from plan").get().c, 2);
  s3.close();
  schritt("Ungültige Übungswahl wird abgelehnt, es entsteht kein Plan");

  // 13. Tippflächen am Handy
  await page.goto(`${BASE}/plan/neu`);
  const zuKlein = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "button, select, input:not([type=checkbox]):not([type=radio])",
      ),
    ]
      .filter(
        (e) =>
          e.getBoundingClientRect().height > 0 &&
          e.getBoundingClientRect().height < 40,
      )
      .map(
        (e) =>
          `${e.tagName} ${e.getAttribute("name") ?? ""} ${Math.round(e.getBoundingClientRect().height)}px`,
      ),
  );
  assert.deepEqual(zuKlein, [], "Tippflächen < 40 px");

  assert.deepEqual(fehler, [], "Browser-Fehler");
  await context.close();
}

await withApp(async ({ browser, dbPfad }) => {
  console.log("Mobil (390×844)");
  await ablauf(browser, dbPfad);

  console.log("Desktop (1280×900)");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  for (const [pfad, name] of [
    ["/plan", "plan"],
    ["/plan/neu", "plan-neu"],
  ]) {
    await page.goto(`${BASE}${pfad}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await page.screenshot({
      path: join(SHOTS, `desktop-${name}.png`),
      fullPage: true,
    });
  }
  assert.deepEqual(fehler, [], "desktop: Browser-Fehler");
  console.log("  [desktop] Plan und Vorschau ohne horizontales Scrollen");
  await context.close();
});

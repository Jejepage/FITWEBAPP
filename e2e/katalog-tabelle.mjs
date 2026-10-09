// Browsertest für die Tabellenansicht des Katalogs (Abschnitt B): Gruppen, Kopfzeilenfilter,
// Sortierung, wählbare Spalten, Ansicht merken, Handy vs. PC.
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  SHOTS,
  hinweisBestaetigen,
  sammleFehler,
  withApp,
} from "./harness.mjs";

const schritt = (s) => console.log(`  ${s}`);

async function ablauf(browser, BASE) {
  // ================= PC (1440 × 900) =================
  const pc = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await pc.newPage();
  const fehler = sammleFehler(page);
  const shot = (n) =>
    page.screenshot({ path: join(SHOTS, `tabelle-${n}.png`) });
  await hinweisBestaetigen(page);
  const zeilen = () => page.locator("tbody tr:not(:has(th[scope=rowgroup]))");
  const kopfzellen = async () =>
    (await page.locator("thead tr:first-child th").allInnerTexts()).map((t) =>
      t.replace(/[▲▼↕]/g, "").trim(),
    );
  const warteUrl = (re) => page.waitForURL(re);

  await page.goto(`${BASE}/katalog`);
  await page.getByRole("table").waitFor();
  assert.deepEqual(
    await kopfzellen(),
    ["Name", "Stufe", "Equipment"],
    "Standardspalten",
  );
  assert.equal(
    await page.locator("tbody th[scope=rowgroup]").count(),
    8,
    "acht Muster-Gruppen",
  );
  const gruppen = (
    await page.locator("tbody th[scope=rowgroup]").allInnerTexts()
  ).map((t) => t.split("(")[0].trim());
  assert.deepEqual(gruppen, [
    "Kniebeuge",
    "Hüftbeuge",
    "Drücken horizontal",
    "Drücken vertikal",
    "Ziehen horizontal",
    "Ziehen vertikal",
    "Tragen",
    "Rumpf",
  ]);
  assert.equal(await zeilen().count(), 76);
  assert.equal(
    await page.getByRole("heading", { level: 2 }).count(),
    0,
    "Karten sind am PC aus",
  );
  await shot("1-standard");
  schritt(
    "PC: Tabelle mit Name/Stufe/Equipment, 8 Gruppen in Spec-Reihenfolge, 76 Zeilen",
  );

  // --- Kopfzeilenfilter wirken sofort, ohne die Seite neu zu laden ---------------------------
  await page.evaluate(() => (window.__marke = "bleibt"));
  await page.locator("thead").getByLabel("Stufe filtern").selectOption("2");
  await warteUrl(/stufe=2/);
  await page.getByText("24 von 76 Übungen").waitFor();
  assert.equal(await zeilen().count(), 24);
  assert.equal(
    await page.evaluate(() => window.__marke),
    "bleibt",
    "weiche Navigation, kein Neuladen",
  );

  await page.locator("thead").getByLabel("Name oder ID suchen").click();
  await page.keyboard.type("kniebeuge");
  await warteUrl(/q=kniebeuge/);
  const treffer = await zeilen().count();
  assert.ok(treffer >= 1 && treffer < 24);
  for (const n of await page
    .locator("tbody tr:not(:has(th[scope=rowgroup])) :is(td,th):first-child")
    .allInnerTexts()) {
    assert.match(n.toLowerCase(), /kniebeuge/);
  }
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    ),
    "Name oder ID suchen",
    "Fokus bleibt im Suchfeld",
  );
  assert.equal(
    await page.locator("thead").getByLabel("Name oder ID suchen").inputValue(),
    "kniebeuge",
  );
  await shot("2-gefiltert");
  schritt(
    `Filter in der Kopfzeile: Stufe 2 → 24, Suche "kniebeuge" → ${treffer}; Fokus bleibt`,
  );

  await page.getByRole("link", { name: "Zurücksetzen" }).first().click();
  await page.getByText("76 von 76 Übungen").waitFor();
  await page
    .locator("thead")
    .getByLabel("Equipment-Profil")
    .selectOption({ label: "Machbar: Unterwegs" });
  await warteUrl(/profil=/);
  await page.waitForFunction(
    () =>
      document.querySelectorAll("tbody tr:not(:has(th[scope=rowgroup]))")
        .length < 76,
  );
  const unterwegs = await zeilen().count();
  assert.ok(unterwegs > 0 && unterwegs < 76, "Unterwegs engt ein");
  await page.getByText(`${unterwegs} von 76 Übungen`).first().waitFor();
  await page.locator("thead").getByLabel("Equipment-Profil").selectOption("");
  await page
    .locator("thead")
    .getByLabel("Gerät", { exact: true })
    .selectOption({ label: "Braucht Stange" });
  await warteUrl(/geraet=stange/);
  await page.waitForFunction(
    () => new URL(location.href).searchParams.get("profil") === null,
  );
  await page.waitForFunction(
    () =>
      document.querySelectorAll("tbody tr:not(:has(th[scope=rowgroup]))")
        .length !== 76,
  );
  const stange = await zeilen().count();
  await page.getByText(`${stange} von 76 Übungen`).first().waitFor();
  assert.ok(
    stange > 0 && stange < 76,
    `Gerät Stange: ${stange} Zeilen, URL ${page.url()}`,
  );
  schritt(
    `Equipment-Filter: Profil Unterwegs → ${unterwegs}, Gerät Stange → ${stange}`,
  );

  // Weitere Spaltenfilter (erst nach dem Laden der Skripte bedienen, sonst geht die Auswahl
  // vor der Hydrierung verloren; die Videospalte macht die Seite spürbar größer)
  await page.goto(
    `${BASE}/katalog?spalten=name,stufe,einseitig,belastung,status,aktiv,video`,
    { waitUntil: "networkidle" },
  );
  await page
    .locator("thead")
    .getByLabel("Einseitig filtern")
    .selectOption("ja");
  await warteUrl(/einseitig=ja/);
  const einseitig = await zeilen().count();
  assert.ok(einseitig > 0 && einseitig < 30);
  await page.locator("thead").getByLabel("Belastungsart").selectOption("zeit");
  await warteUrl(/belastungsart=zeit/);
  assert.ok((await zeilen().count()) <= einseitig);
  await page
    .locator("thead")
    .getByLabel("Status", { exact: true })
    .selectOption("geprueft");
  await warteUrl(/status=geprueft/);
  await page
    .locator("p:visible", { hasText: "Keine Übung passt zu diesen Filtern." })
    .waitFor();
  assert.equal(
    await page
      .locator("thead")
      .getByLabel("Status", { exact: true })
      .inputValue(),
    "geprueft",
    "Kopfzeile bleibt bedienbar",
  );
  schritt(
    "Filter Einseitig, Belastungsart und Status; ohne Treffer bleibt die Kopfzeile bedienbar",
  );

  // --- Sortierung --------------------------------------------------------------------------------
  await page.goto(`${BASE}/katalog`);
  await page.getByRole("link", { name: "Nach Name sortieren" }).click();
  await warteUrl(/sort=name&dir=auf/);
  const namen = async () =>
    (
      await page
        .locator(
          "tbody tr:not(:has(th[scope=rowgroup])) :is(td,th):first-child",
        )
        .allInnerTexts()
    ).slice(0, 12); // erste Gruppe: Kniebeuge mit 12 Übungen
  const auf = await namen();
  assert.deepEqual(
    auf,
    [...auf].sort((a, b) => a.localeCompare(b, "de")),
    "erste Gruppe aufsteigend",
  );
  assert.equal(
    await page
      .locator("thead tr:first-child th")
      .first()
      .getAttribute("aria-sort"),
    "ascending",
  );
  await page.getByRole("link", { name: "Nach Name sortieren" }).click();
  await warteUrl(/dir=ab/);
  assert.deepEqual(await namen(), [...auf].reverse());
  assert.equal(
    await page
      .locator("thead tr:first-child th")
      .first()
      .getAttribute("aria-sort"),
    "descending",
  );
  assert.equal(
    await page.locator("tbody th[scope=rowgroup]").count(),
    8,
    "Gruppen bleiben erhalten",
  );
  schritt(
    "Sortierung per Klick auf die Überschrift, auf- und absteigend, innerhalb der Gruppen",
  );

  // --- Spalten wählen und merken --------------------------------------------------------------------
  await page.goto(`${BASE}/katalog?q=klimmzug`);
  await page.getByText("Spalten", { exact: false }).first().click();
  const wahl = page.locator("details", { hasText: "Angezeigte Spalten" });
  assert.equal(
    await wahl.getByLabel("Name").isDisabled(),
    true,
    "Name ist Pflicht",
  );
  await wahl.getByLabel("Einseitig").check();
  await wahl.getByLabel("Hauptmuskeln").check();
  await wahl.getByLabel("Video").check();
  await wahl.getByRole("button", { name: "Übernehmen" }).click();
  // Server Action leitet zurück; die Filter bleiben erhalten
  await page.waitForFunction(
    () => document.querySelectorAll("thead tr:first-child th").length === 6,
  );
  assert.match(page.url(), /q=klimmzug/);
  assert.deepEqual(await kopfzellen(), [
    "Name",
    "Stufe",
    "Equipment",
    "Einseitig",
    "Hauptmuskeln",
    "Video",
  ]);
  await page.goto(`${BASE}/katalog`);
  assert.deepEqual(
    await kopfzellen(),
    ["Name", "Stufe", "Equipment", "Einseitig", "Hauptmuskeln", "Video"],
    "Cookie merkt die Spalten",
  );
  await shot("3-spalten");
  // Adresse hat Vorrang vor dem Cookie
  await page.goto(`${BASE}/katalog?spalten=id,status`);
  assert.deepEqual(await kopfzellen(), ["Name", "Status", "ID"]);
  schritt(
    "Spalten wählbar (Name Pflicht), Filter bleiben, Auswahl wird gemerkt, Adresse geht vor",
  );

  // --- Ansicht wechseln und merken -------------------------------------------------------------------
  await page.goto(`${BASE}/katalog`);
  await page.getByRole("button", { name: "Karten" }).click();
  await page.getByRole("heading", { name: "Kniebeuge", level: 2 }).waitFor();
  assert.equal(await page.getByRole("table").count(), 0, "Tabelle ist aus");
  await page.goto(`${BASE}/katalog`);
  await page.getByRole("heading", { name: "Kniebeuge", level: 2 }).waitFor();
  await page.getByRole("button", { name: "Tabelle" }).click();
  await page.getByRole("table").waitFor();
  schritt("Ansicht Karten/Tabelle umschaltbar und gemerkt");

  // --- Zeile führt zur Übung ---------------------------------------------------------------------------
  await page.goto(`${BASE}/katalog`);
  await page.getByRole("link", { name: "Beinpresse", exact: true }).click();
  await page.getByRole("heading", { name: "Beinpresse", level: 1 }).waitFor();
  assert.deepEqual(fehler, [], "Browser-Fehler");
  await pc.close();

  // ================= Handy (390 × 844) =================
  const handy = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const m = await handy.newPage();
  const fehlerM = sammleFehler(m);
  const kein = async (wo) =>
    assert.ok(
      await m.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `horizontales Scrollen: ${wo}`,
    );
  await m.goto(`${BASE}/katalog`);
  await m.getByRole("heading", { name: "Kniebeuge", level: 2 }).waitFor();
  assert.equal(await m.getByRole("table").count(), 0, "am Handy Karten");
  await kein("Karten");
  // Neue Filter im Kartenformular
  await m.locator("summary", { hasText: "Filter" }).click();
  await m.getByLabel("Suche (Name oder ID)").fill("klimmzug");
  await m.getByRole("button", { name: "Filtern" }).click();
  await m.waitForURL(/q=klimmzug/);
  await m.getByText(/von 76 Übungen/).waitFor();
  // Erzwungene Tabelle am Handy: scrollt nur der Tabellenbereich
  await m.goto(
    `${BASE}/katalog?ansicht=tabelle&spalten=name,stufe,equipment,muskeln,steigerung,leiter,video`,
  );
  await m.getByRole("table").waitFor();
  await kein("Tabelle am Handy");
  await m.screenshot({
    path: join(SHOTS, "tabelle-4-handy.png"),
    fullPage: true,
  });
  assert.deepEqual(fehlerM, [], "Browser-Fehler (Handy)");
  await handy.close();
  schritt(
    "Handy: Karten (mit den neuen Filtern), erzwungene Tabelle scrollt nur im Tabellenbereich",
  );
}

console.log("Katalog-Tabelle");
await withApp(({ browser, BASE }) => ablauf(browser, BASE));

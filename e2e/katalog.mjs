// Browsertest für den Katalog (Abschnitt 3). Start: npm run build && npm run e2e
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  BASE,
  SHOTS,
  hinweisBestaetigen,
  planAnlegen,
  sammleFehler,
  withApp,
} from "./harness.mjs";

let browser;

async function ablauf(name, viewport) {
  const context = await browser.newContext({
    viewport,
    hasTouch: viewport.width < 600,
  });
  // Diese Suite prüft die Kartenansicht (die Tabelle hat e2e/katalog-tabelle.mjs)
  await context.addCookies([
    { name: "fit_katalog", value: "ansicht=karten", url: BASE },
  ]);
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  const shot = (n) =>
    page.screenshot({ path: join(SHOTS, `${name}-${n}.png`), fullPage: true });
  const keinHorizontalScroll = async (wo) =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `${name}: horizontales Scrollen auf ${wo}`,
    );
  const schritt = (s) => console.log(`  [${name}] ${s}`);

  await hinweisBestaetigen(page); // erster Start: Hinweis bestätigen

  // 1. Liste
  await page.goto(`${BASE}/katalog`);
  await page.getByText("76 von 76 Übungen").waitFor();
  await keinHorizontalScroll("Liste");
  schritt("Liste zeigt 76 Übungen");
  await shot("1-liste");

  // 2. Filter: Muster ZV + machbar mit dem Equipment des aktiven Plans (nur Stange)
  await planAnlegen(page, { equipment: ["Stange"] });
  await page.goto(`${BASE}/katalog`);
  await page.locator("summary", { hasText: "Filter" }).click();
  await page.getByLabel("Muster").selectOption("ZV");
  await page
    .getByLabel("Machbar mit meinem Equipment")
    .selectOption({ label: "Nur machbare" });
  await shot("2-filter-offen");
  await page.getByRole("button", { name: "Filtern" }).click();
  await page.getByText("5 von 76 Übungen").waitFor();
  const namen = await page
    .locator("main a[href^='/katalog/ZV-']")
    .allInnerTexts();
  assert.equal(namen.length, 5, "Stange/ZV: fünf Übungen");
  assert.ok(page.url().includes("muster=ZV") && page.url().includes("machbar=ja"));
  schritt("Filter Muster+machbar funktioniert (ZV/nur Stange → 5)");

  // Filter zurücksetzen (Bereich bleibt nach dem Filtern offen), dann Stufe+einseitig
  await page.getByRole("link", { name: "Zurücksetzen" }).first().click();
  await page.getByText("76 von 76 Übungen").waitFor();
  await page.goto(`${BASE}/katalog?muster=RU&einseitig=ja`);
  await page.getByText("5 von 76 Übungen").waitFor();
  schritt("Filter einseitig (RU → 5)");

  // Ungültiger Wert im Link: Filter wird ignoriert und nicht als aktiv angezeigt
  await page.goto(`${BASE}/katalog?machbar=vielleicht`);
  await page.getByText("76 von 76 Übungen").waitFor();
  assert.equal(await page.locator("summary", { hasText: "●" }).count(), 0);
  schritt("Ungültiger Machbar-Wert wird ignoriert");

  // 3. Detail mit Leiter
  await page.goto(`${BASE}/katalog/ZV-04`);
  await page.getByRole("heading", { name: "Klimmzug mit Fußhilfe" }).waitFor();
  await keinHorizontalScroll("Detail");
  assert.equal(
    await page
      .getByRole("list", { name: "Stufenleiter" })
      .getByRole("link")
      .count(),
    5,
  );
  await shot("3-detail");
  await page
    .getByRole("list", { name: "Stufenleiter" })
    .getByRole("link", { name: /ZV-05/ })
    .click();
  await page.getByRole("heading", { name: "Negativer Klimmzug" }).waitFor();
  schritt("Detail + Stufenleiter anklickbar");

  // 4. Bearbeiten: Name ändern, als geprüft setzen
  await page.goto(`${BASE}/katalog/ZV-04/bearbeiten`);
  await keinHorizontalScroll("Formular");
  await shot("4-formular");
  await page
    .getByLabel("Name", { exact: true })
    .fill("Klimmzug mit Stuhlhilfe");
  await page.getByLabel("Prüfstatus").selectOption("geprueft");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page
    .getByRole("heading", { name: "Klimmzug mit Stuhlhilfe" })
    .waitFor();
  await page.getByText("geprüft", { exact: true }).first().waitFor();
  schritt("Bearbeiten speichert Name und Prüfstatus");

  // 5. Validierungsfehler: Eingaben bleiben erhalten
  await page.goto(`${BASE}/katalog/ZV-04/bearbeiten`);
  await page
    .getByLabel("Name", { exact: true })
    .fill("Nur Test, nicht speichern");
  await page.getByLabel("Standardbereich").fill("12–8");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByText("erste Zahl höchstens so groß wie die zweite").waitFor();
  assert.equal(
    await page.getByLabel("Name", { exact: true }).inputValue(),
    "Nur Test, nicht speichern",
  );
  await shot("5-fehler");
  schritt("Validierungsfehler sichtbar, Eingaben bleiben erhalten");

  // Leere Stufe: Fehlermeldung statt "NaN"
  await page.goto(`${BASE}/katalog/ZV-04/bearbeiten`);
  await page.getByLabel("Stufe (1–5)").fill("");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByText("Stufe zwischen 1 und 5 wählen.").waitFor();
  assert.equal(await page.getByLabel("Stufe (1–5)").inputValue(), "");
  schritt("Leere Stufe wird abgelehnt, Feld bleibt leer");

  // Leiter-Fehler: schwerere Übung mit niedrigerer Stufe
  await page.goto(`${BASE}/katalog/KN-03/bearbeiten`);
  await page.getByLabel("Stufe (1–5)").fill("5");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page
    .getByText(/braucht eine (höhere|niedrigere) Stufe/)
    .first()
    .waitFor();
  schritt("Stufenänderung gegen bestehende Leiter wird abgelehnt");

  // 6. Neue Übung anlegen
  await page.goto(`${BASE}/katalog/neu`);
  await page.getByRole("button", { name: "Speichern" }).click(); // leer → Fehler
  await page.getByText("Bitte ein Bewegungsmuster wählen.").waitFor();
  await page.getByLabel("Bewegungsmuster").selectOption("ZH");
  await page.getByLabel("Name", { exact: true }).fill("Rudern mit Handtuch");
  await page
    .getByLabel("Hauptmuskeln", { exact: false })
    .first()
    .fill("oberer Rücken\nBizeps");
  await page
    .getByLabel("Ausführung", { exact: true })
    .fill("Handtuch an Türklinke binden\nZurücklehnen\nKörper heranziehen");
  await page
    .getByLabel("Typische Fehler")
    .first()
    .fill("Hüfte hängt durch\nSchultern hochgezogen");
  await page
    .getByLabel("Hinweise (Gelenke, Alternativen)")
    .fill("Tür muss fest geschlossen und belastbar sein.");
  await page
    .getByRole("group", { name: "Geräte" })
    .getByLabel("Band")
    .check();
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByRole("heading", { name: "Rudern mit Handtuch" }).waitFor();
  assert.ok(
    page.url().endsWith("/katalog/ZH-09"),
    `neue ID ZH-09, war ${page.url()}`,
  );
  await page.getByText("Band", { exact: true }).waitFor();
  schritt("Neue Übung angelegt (ZH-09, Equipment Band)");

  // 7. Deaktivieren
  await page.getByRole("button", { name: "Deaktivieren" }).click();
  await page.getByText("inaktiv", { exact: true }).first().waitFor();
  await page.goto(`${BASE}/katalog?muster=ZH`);
  await page.getByText("8 von 76 Übungen").waitFor();
  assert.equal(await page.locator("a[href='/katalog/ZH-09']").count(), 0);
  await page.goto(`${BASE}/katalog?muster=ZH&inaktive=1`);
  await page.getByText("9 von 77 Übungen").waitFor();
  await page.locator("a[href='/katalog/ZH-09']").waitFor();
  schritt(
    "Deaktivierte Übung verschwindet aus der Liste und erscheint mit 'inaktive anzeigen'",
  );

  // 8. Mobile: Tippflächen mindestens 44 px hoch
  if (viewport.width < 600) {
    await page.goto(`${BASE}/katalog/ZV-02/bearbeiten`);
    const zuKlein = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          "button, select, input:not([type=checkbox]), a",
        ),
      ]
        .filter(
          (e) =>
            e.getBoundingClientRect().height > 0 &&
            e.getBoundingClientRect().height < 40,
        )
        .map(
          (e) =>
            `${e.tagName} ${e.textContent?.trim().slice(0, 20) ?? ""} ${Math.round(e.getBoundingClientRect().height)}px`,
        ),
    );
    assert.deepEqual(
      zuKlein.filter((z) => !z.startsWith("A ")),
      [],
      "Tippflächen < 40 px",
    );
  }

  assert.deepEqual(fehler, [], `${name}: Browser-Fehler`);
  await context.close();
}

await withApp(async (app) => {
  browser = app.browser;
  console.log("Mobil (390×844)");
  await ablauf("mobil", { width: 390, height: 844 });
  console.log("Desktop (1280×900)");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/katalog`);
  await page.getByText(/\d+ von \d+ Übungen/).waitFor();
  await page.screenshot({
    path: join(SHOTS, "desktop-1-liste.png"),
    fullPage: true,
  });
  await page.goto(`${BASE}/katalog/KN-04`);
  await page.getByRole("heading", { name: "Goblet Squat" }).waitFor();
  await page.screenshot({
    path: join(SHOTS, "desktop-3-detail.png"),
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  console.log("  [desktop] Liste und Detail ohne horizontales Scrollen");
  await context.close();
});

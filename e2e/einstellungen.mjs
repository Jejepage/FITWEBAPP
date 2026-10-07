// Browsertest für Einstellungen, Equipment-Profile und den Erststart-Hinweis (Abschnitt 4).
import assert from "node:assert/strict";
import { join } from "node:path";
import { BASE, SHOTS, sammleFehler, withApp } from "./harness.mjs";

const schritt = (s) => console.log(`  ${s}`);

async function ablauf(browser, name, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
  context.on("dialog", (d) => d.accept()); // confirm() beim Löschen
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  const shot = (n) => page.screenshot({ path: join(SHOTS, `${name}-${n}.png`), fullPage: true });
  const keinHorizontalScroll = async (wo) =>
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${name}: horizontales Scrollen auf ${wo}`,
    );
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  const profilKarte = (n) => page.getByRole("link", { name: new RegExp(`^${n}`) });

  // 1. Erster Start: Hinweis blockiert die App, bis er bestätigt ist
  await page.goto(`${BASE}/katalog`);
  await page.getByRole("heading", { name: "Wichtiger Hinweis" }).waitFor();
  assert.equal(await nav.count(), 0, "Navigation darf vor der Bestätigung nicht sichtbar sein");
  await page.getByText("ersetzt keine ärztliche oder physiotherapeutische Beratung").waitFor();
  await keinHorizontalScroll("Hinweis");
  await shot("1-hinweis");
  await page.getByRole("button", { name: "Verstanden" }).click();
  await nav.waitFor();
  await page.reload();
  await nav.waitFor();
  assert.equal(await page.getByRole("heading", { name: "Wichtiger Hinweis" }).count(), 0);
  schritt(`[${name}] Hinweis erscheint beim ersten Start und danach nicht wieder`);

  // 2. Einstellungen ändern und nach Neuladen wiederfinden
  await page.goto(`${BASE}/einstellungen`);
  await page.getByRole("heading", { name: "Einstellungen", level: 1 }).waitFor();
  await keinHorizontalScroll("Einstellungen");
  await shot("2-einstellungen");
  await page.getByLabel("Kniebeuge (KN)").selectOption("4");
  await page.getByLabel("Rumpf (RU)").selectOption("1");
  await page.getByLabel("3 pro Woche").check();
  await page.getByLabel(/Zusatzblock/).check();
  await page.getByLabel("Aufwärmprogramm (Text)").fill("Zehn Minuten locker radeln.");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByText("Einstellungen gespeichert.").waitFor();
  await page.reload();
  assert.equal(await page.getByLabel("Kniebeuge (KN)").inputValue(), "4");
  assert.equal(await page.getByLabel("Rumpf (RU)").inputValue(), "1");
  assert.equal(await page.getByLabel("Hüftbeuge (HB)").inputValue(), "2");
  assert.ok(await page.getByLabel("3 pro Woche").isChecked());
  assert.ok(await page.getByLabel(/Zusatzblock/).isChecked());
  assert.equal(
    await page.getByLabel("Aufwärmprogramm (Text)").inputValue(),
    "Zehn Minuten locker radeln.",
  );
  schritt(`[${name}] Einstellungen werden gespeichert und nach Neuladen wiedergefunden`);

  // Validierung: leerer Aufwärmtext
  await page.getByLabel("Aufwärmprogramm (Text)").fill("");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByText("Bitte einen Aufwärmtext angeben.").waitFor();
  schritt(`[${name}] Leerer Aufwärmtext wird abgelehnt`);

  // 3. Profilliste mit Machbarkeit (von Hand aus der Spec nachgezählt)
  await page.goto(`${BASE}/einstellungen`);
  await profilKarte("Studio").getByText("Standard", { exact: true }).waitFor();
  await profilKarte("Studio").getByText("60 von 60 Übungen machbar").waitFor();
  await profilKarte("Zuhause").getByText("47 von 60 Übungen machbar").waitFor();
  await profilKarte("Zuhause")
    .getByText("Kurzhanteln: 2–20/2 kg · Kettlebell: 12, 16 kg")
    .waitFor();
  await profilKarte("Unterwegs").getByText("26 von 60 Übungen machbar").waitFor();
  await shot("3-profile");
  schritt(`[${name}] Profilliste: Studio 60, Zuhause 47, Unterwegs 26 Übungen machbar`);

  // 4. Profil "Unterwegs": Vorschau je Muster
  await profilKarte("Unterwegs").click();
  await page.getByRole("heading", { name: "Profil „Unterwegs“" }).waitFor();
  const zeile = (muster) =>
    page
      .locator("dt", { hasText: new RegExp(`^${muster}$`) })
      .locator("xpath=following-sibling::dd[1]");
  assert.equal(await zeile("Ziehen horizontal").innerText(), "1");
  assert.equal(await zeile("Ziehen vertikal").innerText(), "4");
  assert.equal(await zeile("Kniebeuge").innerText(), "4");
  assert.equal(
    await page.getByRole("alert").filter({ hasText: "keine Übung" }).count(),
    0,
    "Unterwegs hat in jedem Muster mindestens eine Übung",
  );
  await keinHorizontalScroll("Profil");
  await shot("4-profil-unterwegs");
  schritt(`[${name}] Vorschau Unterwegs: ZH 1, ZV 4, KN 4, keine Warnung`);

  // 5. Neues Profil "Garage" (Kurzhanteln + Bank), Validierung zuerst
  await page.goto(`${BASE}/einstellungen/profile/neu`);
  await page.getByLabel("Kurzhanteln", { exact: true }).check();
  await page.getByLabel("Gewichte Kurzhanteln (kg)").fill("abc");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByText("Bitte einen Namen angeben.").waitFor();
  await page.getByText(/„abc“ ist keine gültige Angabe/).waitFor();
  schritt(`[${name}] Ungültige Gewichte und fehlender Name werden abgelehnt`);
  await page.getByLabel("Name").fill("Garage");
  await page.getByLabel("Bank", { exact: true }).check();
  await page.getByLabel("Gewichte Kurzhanteln (kg)").fill("2,5–10/2,5");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByRole("heading", { name: "Equipment-Profile" }).waitFor();
  await profilKarte("Garage").getByText("Kurzhanteln: 2,5–10/2,5 kg").waitFor();
  await profilKarte("Garage").getByText("35 von 60 Übungen machbar").waitFor();
  schritt(`[${name}] Garage angelegt (Gewichte 2,5–10/2,5, 35 Übungen machbar)`);

  // Garage hat keine Stange: für Ziehen vertikal gibt es nichts → Warnung
  await profilKarte("Garage").click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Für Ziehen vertikal gibt es mit diesem Profil keine Übung" })
    .waitFor();
  assert.equal(await page.getByLabel("Gewichte Kurzhanteln (kg)").inputValue(), "2,5–10/2,5");
  await shot("5-profil-garage");
  schritt(`[${name}] Warnung bei fehlendem Muster, Gewichte kompakt wieder angezeigt`);

  // Im Katalog wählbar, Anzahl passt zur Vorschau
  await page.goto(`${BASE}/katalog`);
  await page.locator("summary", { hasText: "Filter" }).click();
  await page.getByLabel("Equipment-Profil").selectOption({ label: "Garage" });
  await page.getByRole("button", { name: "Filtern" }).click();
  await page.getByText("35 von 60 Übungen").waitFor();
  schritt(`[${name}] Katalogfilter „Garage“ zeigt 35 Übungen`);

  // 6. Standardprofil wechseln
  await page.goto(`${BASE}/einstellungen`);
  await profilKarte("Garage").click();
  await page.getByLabel("Als Standardprofil verwenden").check();
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByRole("heading", { name: "Equipment-Profile" }).waitFor();
  await profilKarte("Garage").getByText("Standard", { exact: true }).waitFor();
  assert.equal(await page.getByText("Standard", { exact: true }).count(), 1);
  await profilKarte("Studio").click();
  assert.ok(await page.getByLabel("Als Standardprofil verwenden").isEnabled());
  schritt(`[${name}] Standardprofil gewechselt (genau ein Standard)`);

  // 7. Standardprofil löschen: ein anderes wird Standard
  await page.goto(`${BASE}/einstellungen`);
  await profilKarte("Garage").click();
  assert.ok(await page.getByLabel("Als Standardprofil verwenden").isDisabled());
  await page.getByRole("button", { name: "Profil löschen" }).click();
  await page.getByRole("heading", { name: "Equipment-Profile" }).waitFor();
  assert.equal(await profilKarte("Garage").count(), 0);
  assert.equal(await page.getByText("Standard", { exact: true }).count(), 1);
  schritt(`[${name}] Standardprofil gelöscht, ein anderes ist Standard`);

  // 8. Das letzte Profil lässt sich nicht löschen
  for (const n of ["Zuhause", "Unterwegs"]) {
    await profilKarte(n).click();
    await page.getByRole("button", { name: "Profil löschen" }).click();
    await page.getByRole("heading", { name: "Equipment-Profile" }).waitFor();
  }
  await profilKarte("Studio").click();
  await page.getByRole("button", { name: "Profil löschen" }).click();
  await page.getByText("Das letzte Profil kann nicht gelöscht werden.").waitFor();
  schritt(`[${name}] Das letzte Profil bleibt erhalten`);

  // 9. Tippflächen am Handy
  if (viewport.width < 600) {
    await page.goto(`${BASE}/einstellungen`);
    const zuKlein = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          "button, select, input:not([type=checkbox]):not([type=radio]), textarea",
        ),
      ]
        .filter(
          (e) => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40,
        )
        .map(
          (e) =>
            `${e.tagName} ${e.getAttribute("name") ?? ""} ${Math.round(e.getBoundingClientRect().height)}px`,
        ),
    );
    assert.deepEqual(zuKlein, [], "Tippflächen < 40 px");
  }

  assert.deepEqual(fehler, [], `${name}: Browser-Fehler`);
  await context.close();
}

await withApp(async ({ browser }) => {
  console.log("Mobil (390×844)");
  await ablauf(browser, "mobil", { width: 390, height: 844 });
});

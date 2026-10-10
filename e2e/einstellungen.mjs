// Browsertest für Einstellungen und den Erststart-Hinweis (Abschnitt 4).
import assert from "node:assert/strict";
import { join } from "node:path";
import { BASE, SHOTS, sammleFehler, withApp } from "./harness.mjs";

const schritt = (s) => console.log(`  ${s}`);

async function ablauf(browser, name, viewport) {
  const context = await browser.newContext({
    viewport,
    hasTouch: viewport.width < 600,
  });
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
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });

  // 1. Erster Start: Hinweis blockiert die App, bis er bestätigt ist
  await page.goto(`${BASE}/katalog`);
  await page.getByRole("heading", { name: "Wichtiger Hinweis" }).waitFor();
  assert.equal(
    await nav.count(),
    0,
    "Navigation darf vor der Bestätigung nicht sichtbar sein",
  );
  await page
    .getByText("ersetzt keine ärztliche oder physiotherapeutische Beratung")
    .waitFor();
  await keinHorizontalScroll("Hinweis");
  await shot("1-hinweis");
  await page.getByRole("button", { name: "Verstanden" }).click();
  await nav.waitFor();
  await page.reload();
  await nav.waitFor();
  assert.equal(
    await page.getByRole("heading", { name: "Wichtiger Hinweis" }).count(),
    0,
  );
  schritt(
    `[${name}] Hinweis erscheint beim ersten Start und danach nicht wieder`,
  );

  // 2. Einstellungen ändern und nach Neuladen wiederfinden
  await page.goto(`${BASE}/einstellungen`);
  await page
    .getByRole("heading", { name: "Einstellungen", level: 1 })
    .waitFor();
  await keinHorizontalScroll("Einstellungen");
  await shot("2-einstellungen");
  await page.getByLabel("Kniebeuge (KN)").selectOption("4");
  await page.getByLabel("Rumpf (RU)").selectOption("1");
  await page.getByLabel("3 pro Woche").check();
  await page.getByLabel(/Zusatzblock/).check();
  await page
    .getByLabel("Aufwärmprogramm (Text)")
    .fill("Zehn Minuten locker radeln.");
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
  schritt(
    `[${name}] Einstellungen werden gespeichert und nach Neuladen wiedergefunden`,
  );

  // Validierung: leerer Aufwärmtext
  await page.getByLabel("Aufwärmprogramm (Text)").fill("");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByText("Bitte einen Aufwärmtext angeben.").waitFor();
  schritt(`[${name}] Leerer Aufwärmtext wird abgelehnt`);

  // 3. Equipment gehört zum Plan: Die Einstellungen weisen darauf hin und verlinken den Plan
  await page.goto(`${BASE}/einstellungen`);
  await page
    .getByText(/Das Equipment \(Geräte und Hantelgewichte\) legst du für jeden Plan fest/)
    .waitFor();
  assert.equal(await page.getByText("Equipment-Profile").count(), 0);
  await page.getByRole("link", { name: "Zum Plan" }).click();
  await page.getByRole("heading", { name: "Plan", level: 1, exact: true }).waitFor();
  schritt(`[${name}] Equipment-Hinweis mit Link zum Plan, keine Profile mehr`);

  // 4. Tippflächen am Handy
  if (viewport.width < 600) {
    await page.goto(`${BASE}/einstellungen`);
    const zuKlein = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          "button, select, input:not([type=checkbox]):not([type=radio]), textarea",
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
  }

  assert.deepEqual(fehler, [], `${name}: Browser-Fehler`);
  await context.close();
}

await withApp(async ({ browser }) => {
  console.log("Mobil (390×844)");
  await ablauf(browser, "mobil", { width: 390, height: 844 });

  console.log("Desktop (1280×900)");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await context.addCookies([
    { name: "fit_katalog", value: "ansicht=karten", url: BASE },
  ]);
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  for (const [pfad, titel] of [
    ["/einstellungen", "Einstellungen"],
    ["/einstellungen/daten", "Datensicherung"],
  ]) {
    await page.goto(`${BASE}${pfad}`);
    await page.getByRole("heading", { name: titel, level: 1 }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await page.screenshot({
      path: join(SHOTS, `desktop-${titel.replace(/\W+/g, "-")}.png`),
      fullPage: true,
    });
  }
  assert.deepEqual(fehler, [], "desktop: Browser-Fehler");
  console.log(
    "  [desktop] Einstellungen und Datensicherung ohne horizontales Scrollen",
  );
  await context.close();
});

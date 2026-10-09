// Browsertest für den YouTube-Link je Übung (Änderungswunsch A).
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
const STANDARD = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

async function ablauf(browser, dbPfad) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  await context.addCookies([
    { name: "fit_katalog", value: "ansicht=karten", url: BASE },
  ]);
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  const schreibe = (sql, ...args) => {
    const d = new Database(dbPfad);
    d.prepare(sql).run(...args);
    d.close();
  };
  const lies = (sql, ...args) => {
    const d = new Database(dbPfad, { readonly: true });
    try {
      return d.prepare(sql).get(...args);
    } finally {
      d.close();
    }
  };
  await hinweisBestaetigen(page);

  // --- 0. Der Seed bringt für jede Übung einen Link mit ----------------------------------------
  await page.goto(`${BASE}/katalog/KN-03/bearbeiten`);
  const feld = page.getByLabel("YouTube-Link (optional)");
  const seedLink = lies("select video_url v from exercise where id = 'KN-03'").v;
  assert.match(seedLink, /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
  assert.equal(await feld.inputValue(), seedLink, "Seed-Link steht im Formular");
  assert.equal(
    lies("select count(*) c from exercise where video_url is null").c,
    0,
    "jede Seed-Übung hat einen Link",
  );
  schritt("Seed-Übungen bringen einen YouTube-Link mit");
  // Für die folgenden Schritte: alle Links leeren, damit nur KN-03 einen bekommt.
  schreibe("update exercise set video_url = null");
  await page.reload();

  // --- 1. Link eintragen (unübliche Schreibweise) ------------------------------------------------
  assert.equal(await feld.inputValue(), "", "Links geleert");
  await feld.fill("youtu.be/dQw4w9WgXcQ?t=42&si=abc");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.waitForURL(/\/katalog\/KN-03$/); // erst nach dem Speichern auf der Detailseite
  assert.equal(
    lies("select video_url v from exercise where id = 'KN-03'").v,
    `${STANDARD}&t=42s`,
  );
  const knopf = page.getByRole("link", { name: /Video ansehen/ });
  assert.equal(await knopf.getAttribute("href"), `${STANDARD}&t=42s`);
  assert.equal(await knopf.getAttribute("target"), "_blank");
  assert.match((await knopf.getAttribute("rel")) ?? "", /noopener/);
  assert.match((await knopf.getAttribute("rel")) ?? "", /noreferrer/);
  const box = await knopf.boundingBox();
  assert.ok(box && box.height >= 44, "Tippfläche ≥ 44 px");
  await page.screenshot({
    path: join(SHOTS, "video-1-detail.png"),
    fullPage: true,
  });
  schritt(
    "Link in anderer Schreibweise gespeichert, Standardadresse und sicherer Link im Detail",
  );

  // --- 2. Liste markiert Übungen mit Video -------------------------------------------------------
  await page.goto(`${BASE}/katalog`);
  const karte = page.locator("a", { hasText: "KN-03" });
  await karte.getByText("Video", { exact: true }).waitFor();
  assert.equal(
    await page
      .locator("li a")
      .filter({ has: page.getByText("Video", { exact: true }) })
      .count(),
    1,
  );
  schritt("Katalogliste zeigt das Video-Kennzeichen nur bei KN-03");

  // --- 3. Ungültiger Link: Fehler am Feld, Eingabe bleibt, nichts geändert -------------------------
  await page.goto(`${BASE}/katalog/KN-03/bearbeiten`);
  assert.equal(
    await page.getByLabel("YouTube-Link (optional)").inputValue(),
    `${STANDARD}&t=42s`,
  );
  await page
    .getByLabel("YouTube-Link (optional)")
    .fill("https://example.com/video");
  await page.getByLabel("Name").fill("Name geändert");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page
    .getByText(/Bitte einen YouTube-Link zu einem einzelnen Video/)
    .waitFor();
  assert.equal(
    await page.getByLabel("YouTube-Link (optional)").inputValue(),
    "https://example.com/video",
  );
  assert.equal(
    await page.getByLabel("Name").inputValue(),
    "Name geändert",
    "andere Eingaben bleiben",
  );
  assert.equal(
    lies("select video_url v from exercise where id = 'KN-03'").v,
    `${STANDARD}&t=42s`,
  );
  await page.getByLabel("YouTube-Link (optional)").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page
    .getByText(/Bitte einen YouTube-Link zu einem einzelnen Video/)
    .waitFor();
  assert.equal(
    lies("select video_url v from exercise where id = 'KN-03'").v,
    `${STANDARD}&t=42s`,
  );
  schritt(
    "Ungültige und gefährliche Links werden mit Fehler am Feld abgelehnt",
  );

  // --- 4. Training zeigt den Knopf --------------------------------------------------------------
  await page.goto(`${BASE}/plan/neu`);
  await page
    .getByRole("button", { name: "Plan speichern und aktivieren" })
    .click();
  await page
    .getByRole("heading", { name: "Plan", level: 1, exact: true })
    .waitFor();
  schreibe("update exercise set video_url = ?", STANDARD);
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: "Training starten" }).click();
  await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  const trainingKnopf = page.getByRole("link", { name: /Video ansehen/ });
  assert.equal(await trainingKnopf.getAttribute("href"), STANDARD);
  assert.equal(await trainingKnopf.getAttribute("target"), "_blank");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page.screenshot({
    path: join(SHOTS, "video-2-training.png"),
    fullPage: true,
  });
  schritt("Training: Knopf „Video ansehen“ direkt unter der Eingabe");

  // --- 5. Manipulierter Wert in der DB wird nicht verlinkt -----------------------------------------
  schreibe(
    "update exercise set video_url = 'javascript:alert(1)' where id = 'KN-02'",
  );
  await page.goto(`${BASE}/katalog/KN-02`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  assert.equal(
    await page.getByRole("link", { name: /Video ansehen/ }).count(),
    0,
  );
  assert.equal(await page.locator('a[href^="javascript:"]').count(), 0);
  schritt("Ein ungültiger Wert in der Datenbank erzeugt keinen Link");

  // --- 6. Link entfernen -----------------------------------------------------------------------------
  await page.goto(`${BASE}/katalog/KN-03/bearbeiten`);
  await page.getByLabel("YouTube-Link (optional)").fill("");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.waitForURL(/\/katalog\/KN-03$/);
  assert.equal(
    lies("select video_url v from exercise where id = 'KN-03'").v,
    null,
  );
  assert.equal(
    await page.getByRole("link", { name: /Video ansehen/ }).count(),
    0,
  );
  schritt("Feld leeren entfernt den Link");

  assert.deepEqual(fehler, [], "Browser-Fehler");
  await context.close();
}

console.log("Mobil (390×844)");
await withApp(({ browser, dbPfad }) => ablauf(browser, dbPfad));

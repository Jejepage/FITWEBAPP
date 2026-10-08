// Browsertest für das Training (Abschnitt 6). Läuft über die LAN-Adresse per HTTP, also im
// unsicheren Kontext (kein Wake Lock, kein crypto.randomUUID), genau wie später im Heimnetz.
import assert from "node:assert/strict";
import { join } from "node:path";
import Database from "better-sqlite3";
import {
  SHOTS,
  hinweisBestaetigen,
  sammleFehler,
  withApp,
} from "./harness.mjs";

const schritt = (s) => console.log(`  ${s}`);

async function ablauf(browser, BASE, dbPfad) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  context.on("dialog", (d) => d.accept()); // confirm() bei Abbruch/vorzeitigem Abschluss
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  const shot = (n) =>
    page.screenshot({ path: join(SHOTS, `training-${n}.png`), fullPage: true });
  const db = () => new Database(dbPfad, { readonly: true });
  const keinHorizontalScroll = async (wo) =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `horizontales Scrollen auf ${wo}`,
    );

  // --- Vorbereitung: Hinweis bestätigen, Plan über die Oberfläche anlegen -----------------
  await hinweisBestaetigen(page, BASE);
  await page.goto(`${BASE}/plan/neu`);
  await page
    .getByRole("button", { name: "Plan speichern und aktivieren" })
    .click();
  await page
    .getByRole("heading", { name: "Plan", level: 1, exact: true })
    .waitFor();

  // --- 1. Startseite ---------------------------------------------------------------------
  await page.goto(`${BASE}/`);
  await page.getByText("Einheit A · Woche 1 von 6").waitFor();
  await page.getByText("3 × 10–12 Wdh · Leicht").waitFor();
  await keinHorizontalScroll("Start");
  await shot("1-start");
  const kontext = await page.evaluate(() => ({
    sicher: window.isSecureContext,
    uuid: typeof crypto.randomUUID,
    wakeLock: "wakeLock" in navigator,
  }));
  assert.deepEqual(
    kontext,
    { sicher: false, uuid: "undefined", wakeLock: false },
    "HTTP-Kontext",
  );
  schritt(
    "Startseite zeigt Einheit A, Woche 1 und Vorgabe; Test läuft im unsicheren Kontext",
  );

  // --- 2. Training starten, Aufwärmen ----------------------------------------------------
  await page.getByRole("button", { name: "Training starten" }).click();
  await page.waitForURL(/\/training\/\d+$/);
  await page.getByRole("heading", { name: "Aufwärmen", level: 1 }).waitFor();
  await page.getByText(/Bildschirm bleibt nicht automatisch an/).waitFor();
  await keinHorizontalScroll("Aufwärmen");
  await shot("2-aufwaermen");
  await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  schritt("Aufwärmen, Hinweis zur Auto-Sperre (kein Wake Lock über HTTP)");

  // --- Hilfsfunktionen für den Satzablauf ------------------------------------------------
  const fortschritt = async () =>
    Number(await page.getByRole("progressbar").getAttribute("aria-valuenow"));
  const titel = () => page.getByRole("heading", { level: 1 }).innerText();
  const naechsterSatz = async () => {
    const weiter = page.getByRole("button", { name: "Weiter", exact: true });
    const fertig = page.getByRole("heading", { name: "Geschafft", level: 1 });
    await weiter
      .or(fertig)
      .or(page.getByRole("button", { name: "Satz erledigt" }))
      .first()
      .waitFor();
    if (await weiter.isVisible()) await weiter.click();
    await page
      .getByRole("button", { name: "Satz erledigt" })
      .or(fertig)
      .first()
      .waitFor();
  };
  const satzErledigt = async () => {
    await page.getByRole("button", { name: "Satz erledigt" }).click();
    await naechsterSatz();
  };

  // --- 3. Erste Sätze: Vorgaben, Zielanzeige --------------------------------------
  await page.getByText(/Block 1 · Runde 1 von 3 · Übung 1 von 3/).waitFor();
  await page.getByText(/Ziel:.*10–12 Wdh · Leicht/).waitFor();
  await page.getByText("Noch keine Werte").waitFor();
  assert.equal(
    await page.getByLabel("Wiederholungen", { exact: true }).inputValue(),
    "10",
  );
  assert.equal(
    await page
      .getByRole("radio", { name: "Leicht", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  await keinHorizontalScroll("Satz");
  await shot("3-satz");

  // Tippflächen am Handy: alle sichtbaren Bedienelemente mindestens 44 px hoch
  const zuKlein = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "button, input:not([type=checkbox]), summary",
      ),
    ]
      .filter(
        (e) =>
          e.getBoundingClientRect().height > 0 &&
          e.getBoundingClientRect().height < 44,
      )
      .map(
        (e) =>
          `${e.tagName} ${e.textContent?.trim().slice(0, 25) ?? ""} ${Math.round(e.getBoundingClientRect().height)}px`,
      ),
  );
  assert.deepEqual(zuKlein, [], "Tippflächen < 44 px");

  await page.getByRole("button", { name: "Satz erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  await page.getByText(/Übung 2 von 3/).waitFor();
  assert.equal(
    await page.getByText("Pause", { exact: true }).count(),
    0,
    "kein Pausenbildschirm",
  );
  assert.equal(await fortschritt(), 1);
  await shot("4-naechster-satz");
  schritt("Satz gespeichert, direkt der nächste Satz (kein Pausentimer)");

  // --- 4. Übung ersetzen (zweiter Schritt, Block 1 Übung 2) ------------------------------
  const geplant = await titel();
  await page.getByText("Übung ersetzen", { exact: true }).click();
  const alternativen = page
    .locator("details", { hasText: "Übung ersetzen" })
    .getByRole("button");
  const ersatzText = await alternativen.first().innerText();
  const ersatzName = ersatzText.split("\n")[0].trim();
  await alternativen.first().click();
  await page.getByRole("heading", { name: ersatzName, level: 1 }).waitFor();
  await page.getByText("ersetzt", { exact: true }).waitFor();
  assert.notEqual(ersatzName, geplant);
  schritt(`Übung ersetzt: ${geplant} → ${ersatzName}`);

  // --- 5. Weiter bis Satz 5, dann unterbrechen und fortsetzen ----------------------------
  await satzErledigt(); // Satz 2
  await satzErledigt(); // Satz 3
  await satzErledigt(); // Satz 4 (Runde 2, Übung 1)
  await satzErledigt(); // Satz 5 (Runde 2, Übung 2 = Ersatzübung)
  assert.equal(await fortschritt(), 5);
  assert.equal(await titel(), await titel());
  const sechster = await titel();
  await page.goto(`${BASE}/`);
  await page.getByText("Training läuft").waitFor();
  await page.getByRole("link", { name: "Training fortsetzen" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  assert.equal(await fortschritt(), 5);
  assert.equal(await titel(), sechster, "Fortsetzen springt zum sechsten Satz");
  assert.equal(
    await page.getByRole("heading", { name: "Aufwärmen", level: 1 }).count(),
    0,
  );
  schritt(
    "Unterbrechen und fortsetzen: gleicher Fortschritt, kein erneutes Aufwärmen",
  );

  // --- 6. Vorigen Satz korrigieren --------------------------------------------------------
  await page.getByText("Weitere Aktionen").click();
  await page.getByRole("button", { name: "Vorigen Satz ändern" }).click();
  await page
    .getByText("Du änderst einen bereits gespeicherten Satz.")
    .waitFor();
  const wdh = page.getByLabel("Wiederholungen", { exact: true });
  await wdh.fill("12");
  await page.getByRole("radio", { name: "Gut", exact: true }).click();
  await page
    .locator("p[aria-live=polite]", { hasText: "noch etwa 2 Wiederholungen" })
    .waitFor();
  await page.getByRole("button", { name: "Korrektur speichern" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  assert.equal(
    await fortschritt(),
    5,
    "Korrektur erzeugt keinen zusätzlichen Satz",
  );
  assert.equal(await titel(), sechster);
  schritt("Vorigen Satz korrigiert (überschrieben, kein Duplikat)");

  // --- 7. Netzausfall: Satz bleibt lokal und wird später gespeichert ---------------------
  const zaehle = () => {
    const d = db();
    const n = d.prepare("select count(*) c from set_log").get().c;
    d.close();
    return n;
  };
  await page.waitForTimeout(500);
  const vorher = zaehle();
  assert.equal(vorher, 5);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Satz erledigt" }).click();
  await page.getByText(/Satz ist noch nicht gespeichert/).waitFor();
  assert.equal(zaehle(), vorher, "offline wurde nichts gespeichert");
  assert.equal(await fortschritt(), 6, "Anzeige geht trotzdem weiter");
  await shot("5-offline");
  await context.setOffline(false);
  await page
    .getByText(/noch nicht gespeichert/)
    .waitFor({ state: "detached", timeout: 20000 });
  assert.equal(zaehle(), vorher + 1, "nach dem Netzausfall gespeichert");
  schritt("Netzausfall: Satz lokal gehalten, automatisch nachgespeichert");
  await naechsterSatz();

  // --- 8. Rest der Einheit (Blockwechsel, Runden) bis zum Ende ---------------------------
  let sawBlock = false;
  while ((await fortschritt()) < 18) {
    await page.getByRole("button", { name: "Satz erledigt" }).click();
    const weiter = page.getByRole("button", { name: "Weiter", exact: true });
    const fertig = page.getByRole("heading", { name: "Geschafft", level: 1 });
    await weiter
      .or(fertig)
      .or(page.getByRole("button", { name: "Satz erledigt" }))
      .first()
      .waitFor();
    if (await weiter.isVisible()) {
      sawBlock = true;
      await page
        .getByText(/geschafft/)
        .first()
        .waitFor();
      await shot("6-blockwechsel");
      await weiter.click();
    }
    await page
      .getByRole("button", { name: "Satz erledigt" })
      .or(fertig)
      .first()
      .waitFor();
  }
  assert.ok(sawBlock, "Blockwechsel wurde angezeigt");
  await page.getByRole("heading", { name: "Geschafft", level: 1 }).waitFor();
  await keinHorizontalScroll("Abschluss");
  await shot("7-fertig");
  schritt("Alle 18 Sätze inkl. Blockwechsel durchlaufen");

  // --- 9. Abschließen mit Notiz ----------------------------------------------------------
  await page.getByLabel(/Notiz zur Einheit/).fill("Knie fühlte sich gut an.");
  await page.getByRole("button", { name: "Einheit abschließen" }).click();
  // Nach dem Abschluss: Zusammenfassung mit Protokoll und "Nächstes Mal"-Vorschlägen
  await page.getByText("Einheit gespeichert. Gut gemacht!").waitFor();
  await page.getByRole("heading", { name: "Nächstes Mal", level: 2 }).waitFor();
  await page
    .getByText(
      /Vorschlag für die nächste Einheit mit diesen Übungen \(Woche 2\)/,
    )
    .waitFor();
  assert.equal(
    await page.getByRole("heading", { name: "Protokoll", level: 2 }).count(),
    1,
    "Protokoll der Einheit",
  );
  await keinHorizontalScroll("Zusammenfassung");
  await shot("7b-zusammenfassung");
  await page.getByRole("link", { name: "Zur Startseite" }).click();
  await page.getByText("Einheit B · Woche 1 von 6").waitFor();
  const d = db();
  const w1 = d.prepare("select * from workout where id = 1").get();
  assert.equal(w1.status, "abgeschlossen");
  assert.equal(w1.notiz, "Knie fühlte sich gut an.");
  assert.equal(w1.einheit, "A");
  const saetze = d
    .prepare("select * from set_log where workout_id = 1 order by rowid")
    .all();
  assert.equal(saetze.length, 18);
  assert.equal(
    new Set(saetze.map((s) => s.id)).size,
    18,
    "keine doppelten Satz-IDs",
  );
  assert.ok(
    saetze.every((s) => /^[0-9a-f-]{36}$/.test(s.id)),
    "UUIDs auch ohne crypto.randomUUID",
  );
  const korrigiert = saetze[4];
  assert.ok(
    korrigiert.wdh === 12 && korrigiert.rpe === 8,
    "fünfter Satz wurde korrigiert",
  );
  const ersetzt = saetze.filter(
    (s) =>
      s.exercise_id !==
      d
        .prepare("select exercise_id from plan_slot where id = ?")
        .get(s.plan_slot_id).exercise_id,
  );
  assert.equal(
    ersetzt.length,
    3,
    "Ersatzübung in allen drei Runden protokolliert",
  );
  const slotErsatz = JSON.parse(w1.ersetzungen);
  assert.equal(Object.keys(slotErsatz).length, 1);
  d.close();
  schritt(
    "Einheit abgeschlossen: 18 Sätze, Notiz, UUIDs, Korrektur und Ersatzübung in der Datenbank",
  );

  // --- 10. Zweite Einheit B mit Zusatzblock: 22 Schritte ---------------------------------
  await page.getByLabel(/Zusatzblock/).check();
  await page.getByRole("button", { name: "Training starten" }).click();
  await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  assert.equal(
    await page.getByRole("progressbar").getAttribute("aria-valuemax"),
    "22",
  );
  // Einheit vorzeitig abschließen nach einem Satz (zählt) statt alle 22 durchzuklicken
  await satzErledigt();
  await page.getByText("Weitere Aktionen").click();
  await page
    .getByRole("button", { name: "Einheit vorzeitig abschließen" })
    .click();
  await page.getByRole("heading", { name: "Geschafft", level: 1 }).waitFor();
  await page.getByRole("button", { name: "Einheit abschließen" }).click();
  await page.getByText("Einheit gespeichert. Gut gemacht!").waitFor();
  await page.getByRole("link", { name: "Zur Startseite" }).click();
  await page.getByText("Einheit A · Woche 2 von 6").waitFor();
  await page.getByText("3 × 10–12 Wdh · Leicht").waitFor();
  schritt(
    "Zweite Einheit (B, mit Zusatzblock = 22 Schritte), vorzeitig abgeschlossen, danach Woche 2",
  );

  // --- 11. Woche 2: Vorschlag aus der Historie ---------------------------------------------
  await page.getByRole("button", { name: "Training starten" }).click();
  await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  await page.getByText(/Letztes Mal:/).waitFor();
  await page.getByText(/Letztes Mal: \d\d\.\d\d\. · .*Wdh/).waitFor();
  assert.equal(
    await page.getByLabel("Wiederholungen", { exact: true }).inputValue(),
    "11",
    "Vorschlag: eine Wiederholung mehr als zuletzt (10 → 11)",
  );
  await page
    .getByText("Vorschlag: eine Wiederholung mehr als zuletzt.")
    .waitFor();
  await shot("8-woche2");
  schritt(
    "Woche 2: 'Letztes Mal' und Vorschlag 11 Wdh (Steigerungslogik angebunden)",
  );

  // --- 12. Abbrechen zählt nicht ------------------------------------------------------------
  await page.getByRole("button", { name: "Satz erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  await page.getByText("Weitere Aktionen").click();
  await page.getByRole("button", { name: "Einheit abbrechen" }).click();
  await page.getByText("Einheit A · Woche 2 von 6").waitFor();
  const d2 = db();
  assert.equal(
    d2.prepare("select status from workout where id = 3").get().status,
    "abgebrochen",
  );
  assert.equal(
    d2.prepare("select count(*) c from set_log where workout_id = 3").get().c,
    1,
  );
  assert.equal(
    d2
      .prepare("select count(*) c from workout where status = 'abgeschlossen'")
      .get().c,
    2,
  );
  d2.close();
  schritt(
    "Einheit abgebrochen: Satz bleibt gespeichert, zählt aber nicht für den Fortschritt",
  );

  assert.deepEqual(
    fehler.filter(
      (f) =>
        !/net::ERR_INTERNET_DISCONNECTED|Failed to fetch|Load failed/.test(f),
    ),
    [],
    "Browser-Fehler",
  );
  await context.close();
}

await withApp(
  async ({ browser, BASE, dbPfad }) => {
    console.log("Mobil (390×844) über LAN-Adresse (HTTP)");
    await ablauf(browser, BASE, dbPfad);
  },
  { lan: true },
);

// Browsertest für Steigerung und Verlauf (Abschnitt 7): Stufen-Check, nächster Block, Einheitenliste,
// Übungsverlauf mit Diagramm. Die Einheiten eines kompletten Blocks werden per SQL angelegt.
import assert from "node:assert/strict";
import { join } from "node:path";
import Database from "better-sqlite3";
import { BASE, SHOTS, hinweisBestaetigen, sammleFehler, withApp } from "./harness.mjs";

const schritt = (s) => console.log(`  ${s}`);

/** Legt 12 abgeschlossene Einheiten (Woche 1–6, 2×/Woche) mit Sätzen an. */
function legeBlockAn(dbPfad) {
  const d = new Database(dbPfad);
  const plan = d.prepare("select * from plan where status = 'aktiv'").get();
  const slots = d.prepare("select * from plan_slot where plan_id = ?").all(plan.id);
  const insertWorkout = d.prepare(
    `insert into workout (plan_id, datum, einheit, woche, profil_id, ad_hoc, zusatzblock, status, ersetzungen, beendet_am)
     values (?, ?, ?, ?, ?, 0, 0, 'abgeschlossen', '{}', '2026-10-07T10:00:00.000Z')`,
  );
  const insertSatz = d.prepare(
    `insert into set_log (id, workout_id, plan_slot_id, exercise_id, runde, gewicht, wdh, sekunden, meter, rpe, tempo, erledigt)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
  );
  const werte = (muster) =>
    muster === "KN"
      ? { wdh: 40, sek: 100, m: 100, rpe: 6 } // weit über der Obergrenze, leicht → Stufe erhöhen
      : muster === "HB"
        ? { wdh: 1, sek: 1, m: 1, rpe: 9 } // unter der Untergrenze, sehr hart → Stufe senken
        : { wdh: 10, sek: 30, m: 30, rpe: 7 };
  for (let n = 0; n < 12; n++) {
    const woche = Math.floor(n / 2) + 1;
    const einheit = n % 2 === 0 ? "A" : "B";
    const datum =
      n < 8
        ? `2026-10-${String(n + 1).padStart(2, "0")}`
        : `2026-11-${String(n - 7).padStart(2, "0")}`;
    const w = insertWorkout.run(plan.id, datum, einheit, woche, plan.profil_id).lastInsertRowid;
    for (const slot of slots.filter((s) => s.einheit === einheit && s.block !== "Z")) {
      const runden = woche === 6 ? 2 : 3;
      const v = werte(slot.muster);
      for (let r = 1; r <= runden; r++) {
        insertSatz.run(
          `e2e-${w}-${slot.id}-${r}`.padEnd(10, "0"),
          w,
          slot.id,
          slot.exercise_id,
          r,
          10,
          v.wdh,
          v.sek,
          v.m,
          v.rpe,
        );
      }
    }
  }
  d.close();
  return plan;
}

async function ablauf(browser, dbPfad) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  const shot = (n) => page.screenshot({ path: join(SHOTS, `verlauf-${n}.png`), fullPage: true });
  const keinHorizontalScroll = async (wo) =>
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `horizontales Scrollen auf ${wo}`,
    );
  const db = () => new Database(dbPfad, { readonly: true });

  await hinweisBestaetigen(page);

  // --- 0. Leerer Verlauf ---------------------------------------------------------------
  await page.goto(`${BASE}/verlauf`);
  await page.getByText("Noch keine abgeschlossene Einheit.").waitFor();
  await page.getByText("Noch keine Übung mit Verlauf.").waitFor();
  schritt("Leerer Verlauf zeigt Hinweise");

  // --- 1. Plan anlegen (Standardwerte), danach einen kompletten Block in die DB schreiben ------
  await page.goto(`${BASE}/plan/neu`);
  await page.getByRole("button", { name: "Plan speichern und aktivieren" }).click();
  await page.getByRole("heading", { name: "Plan", level: 1, exact: true }).waitFor();
  assert.equal(
    await page.getByRole("heading", { name: "Stufen-Check" }).count(),
    0,
    "kein Check vor Blockende",
  );
  const altPlan = legeBlockAn(dbPfad);
  schritt("Plan angelegt, 12 Einheiten (Woche 1–6) per SQL eingefügt");

  // --- 2. Startseite: Block abgeschlossen → Link zum Stufen-Check --------------------------
  await page.goto(`${BASE}/`);
  await page.getByText("Block abgeschlossen").waitFor();
  await page.getByRole("link", { name: "Stufen-Check und nächster Block" }).click();
  await page.getByRole("heading", { name: "Stufen-Check", level: 2 }).waitFor();

  // --- 3. Stufen-Check: Empfehlungen je Muster ---------------------------------------------
  const zeile = (name) =>
    page
      .locator("li", { has: page.getByText(name, { exact: true }) })
      .filter({ has: page.locator("select") });
  const kn = zeile("Kniebeuge");
  await kn.getByText("Stufe erhöhen.").waitFor();
  assert.equal(await page.locator("select[name=stufe_KN]").inputValue(), "3");
  const hb = zeile("Hüftbeuge");
  await hb.getByText("Stufe senken.").waitFor();
  assert.equal(await page.locator("select[name=stufe_HB]").inputValue(), "1");
  assert.equal(
    await page.locator("select[name=stufe_DH]").inputValue(),
    "2",
    "ohne klare Tendenz: halten",
  );
  assert.equal(await page.locator("select[name^=stufe_]").count(), 8);
  await keinHorizontalScroll("Stufen-Check");
  await shot("1-stufencheck");
  schritt("Stufen-Check: Kniebeuge erhöhen, Hüftbeuge senken, Rest gehalten, vorbelegt");

  // --- 4. Nächsten Block erstellen (Stufe für DH manuell auf 4) ------------------------------
  await page.locator("select[name=stufe_DH]").selectOption("4");
  await page.getByRole("button", { name: "Nächsten Block erstellen" }).click();
  await page.getByRole("heading", { name: "Neuer Plan", level: 1 }).waitFor();
  const url = new URL(page.url());
  assert.equal(url.searchParams.get("vorgaenger"), String(altPlan.id));
  assert.equal(url.searchParams.get("stufe_KN"), "3");
  assert.equal(url.searchParams.get("stufe_HB"), "1");
  assert.equal(url.searchParams.get("stufe_DH"), "4");
  await page
    .getByText("Folgeblock: Übungen aus dem vorigen Block werden nach Möglichkeit vermieden.")
    .waitFor();
  assert.equal(await page.locator("select[name=stufe_KN]").inputValue(), "3");
  assert.equal(await page.locator("select[name=slot_A-1-1]").count(), 1);
  const alt = db();
  const altIds = new Set(
    alt
      .prepare("select exercise_id from plan_slot where plan_id = ?")
      .all(altPlan.id)
      .map((r) => r.exercise_id),
  );
  alt.close();
  const neuIds = await page.evaluate(() =>
    [...document.querySelectorAll("select[name^=slot_]")].map((s) => s.value),
  );
  assert.equal(neuIds.length, 16);
  assert.ok(
    neuIds.some((id) => !altIds.has(id)),
    "mindestens eine neue Übungsvariante im Folgeblock",
  );
  await page.getByRole("button", { name: "Plan speichern und aktivieren" }).click();
  await page.getByRole("heading", { name: "Plan", level: 1, exact: true }).waitFor();
  const d = db();
  const plaene = d.prepare("select * from plan order by id").all();
  assert.equal(plaene.length, 2);
  assert.equal(plaene[0].status, "abgeschlossen");
  assert.equal(plaene[1].status, "aktiv");
  assert.equal(plaene[1].vorgaenger_id, altPlan.id);
  const stufen = JSON.parse(plaene[1].stufen);
  assert.deepEqual([stufen.KN, stufen.HB, stufen.DH, stufen.ZV], [3, 1, 4, 2]);
  d.close();
  assert.equal(
    await page.getByRole("heading", { name: "Stufen-Check" }).count(),
    0,
    "neuer Block: noch kein Check",
  );
  schritt(
    "Nächster Block: Vorgänger, Stufen 3/1/4, Übungsvarianten gewechselt, alter Block abgeschlossen",
  );

  // --- 5. Verlaufsliste und Blockübersicht -------------------------------------------------
  await page.goto(`${BASE}/verlauf`);
  await page.getByRole("heading", { name: "Blöcke", level: 2 }).waitFor();
  await page.getByText("0 von 12 Einheiten").first().waitFor(); // neuer aktiver Block
  await page.getByText("12 von 12 Einheiten").waitFor(); // früherer Block
  await page.getByRole("heading", { name: "November 2026", level: 3 }).waitFor();
  await page.getByRole("heading", { name: "Oktober 2026", level: 3 }).waitFor();
  const eintraege = page.locator("a[href^='/verlauf/einheit/']");
  assert.equal(await eintraege.count(), 12);
  await keinHorizontalScroll("Verlauf");
  await shot("2-liste");
  schritt("Verlaufsliste: 12 Einheiten nach Monat, Blockübersicht mit aktivem und früherem Block");

  // --- 6. Einheit im Detail ------------------------------------------------------------------
  await eintraege.first().click();
  await page.getByRole("heading", { name: "Protokoll", level: 2 }).waitFor();
  await page.getByText("Woche 6 ist Entlastung und Test: keine Steigerung.").waitFor();
  assert.equal(await page.getByText(/Runde 3:/).count(), 0, "Woche 6 hat nur zwei Runden");
  await page
    .getByText(/Runde 2:/)
    .first()
    .waitFor();
  await keinHorizontalScroll("Einheit");
  await shot("3-einheit");
  await page.goBack();
  await eintraege.last().click(); // Woche 1: der Block ist komplett → keine weiteren Vorschläge
  await page.getByText(/Der Block ist zu Ende/).waitFor();
  schritt("Einheit im Detail: Protokoll, Hinweis zu Woche 6 bzw. Blockende");

  // --- 7. Übungsverlauf mit Diagramm ---------------------------------------------------------
  await page.goto(`${BASE}/verlauf`);
  const uebung = page.locator("a[href^='/verlauf/uebung/']").first();
  await uebung.click();
  await page.locator("svg[role=img]").waitFor();
  const zeilen = await page.locator("tbody tr").count();
  assert.equal(zeilen, 6, "eine Zeile je Einheit dieser Übung (A oder B jeweils 6)");
  assert.ok((await page.locator("svg[role=img] circle").count()) >= 6);
  await page.getByRole("link", { name: "Volumen", exact: true }).click();
  await page.waitForURL(/metrik=volumen/);
  await page.locator("svg[role=img]").waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Volumen", exact: true }).getAttribute("aria-current"),
    "true",
  );
  await keinHorizontalScroll("Übungsverlauf");
  await shot("4-uebung");
  const fehlerLinks = await page.evaluate(
    () => document.querySelectorAll("svg[role=img]:not([aria-label])").length,
  );
  assert.equal(fehlerLinks, 0, "Diagramm hat einen Alternativtext");
  schritt("Übungsverlauf: Diagramm, Tabelle (6 Zeilen), Umschalter Bester Satz / Volumen");

  // --- 8. Tippflächen und Katalog-Link -------------------------------------------------------
  const zuKlein = await page.evaluate(() =>
    [...document.querySelectorAll("main a, main button, nav a")]
      .map((el) => ({ t: el.textContent.trim().slice(0, 30), r: el.getBoundingClientRect() }))
      .filter((x) => x.r.height > 0 && x.r.height < 40 && x.t.length > 0)
      .map((x) => `${x.t} (${Math.round(x.r.height)} px)`),
  );
  assert.deepEqual(
    zuKlein.filter((t) => !t.startsWith("←")),
    [],
    "Tippflächen < 40 px",
  );
  const kat = await page.locator("a[href^='/katalog/']").first().getAttribute("href");
  await page.goto(`${BASE}${kat}`);
  await page.getByRole("link", { name: "Verlauf ansehen" }).click();
  await page.locator("svg[role=img]").waitFor();
  schritt("Katalogdetail verlinkt den Verlauf");

  assert.deepEqual(fehler, [], "Browser-Fehler");
  await context.close();
}

console.log("Mobil (390×844)");
await withApp(({ browser, dbPfad }) => ablauf(browser, dbPfad));

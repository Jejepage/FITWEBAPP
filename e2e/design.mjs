// Gestaltungsprüfung: Screenshots aller Hauptseiten in Hell und Dunkel bei Handy-, Tablet- und
// PC-Breite plus automatische Prüfungen (kein horizontales Scrollen, Tippflächen, Eingabeschrift,
// Textkontrast, Konsolenfehler).
//
//   npm run build && node e2e/design.mjs
//
// Umgebung (alle optional):
//   SHOTS_DIR=…            Zielordner (Screenshots in <SHOTS_DIR>/design/)
//   DESIGN_SEITEN=a,b      nur diese Seiten (Schlüssel siehe SEITEN)
//   DESIGN_BREITEN=390,1440 nur diese Breiten
//   DESIGN_SCHEMA=hell|dunkel  nur ein Farbschema
//   DESIGN_STRENG=1        Befunde lassen den Lauf fehlschlagen
//   DESIGN_OHNE_BILDER=1   nur prüfen, keine Screenshots
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { pruefeSeite } from "./design-pruefung.mjs";
import {
  BASE,
  SHOTS,
  hinweisBestaetigen,
  sammleFehler,
  withApp,
} from "./harness.mjs";

const BREITEN = [
  { b: 390, h: 844, touch: true },
  { b: 820, h: 1180, touch: true },
  { b: 1440, h: 900, touch: false },
  { b: 1920, h: 1080, touch: false },
];
const SCHEMEN = [
  ["hell", "light"],
  ["dunkel", "dark"],
];
const filter = (env) => (process.env[env] ? process.env[env].split(",") : null);
const nurSeiten = filter("DESIGN_SEITEN");
const nurBreiten = filter("DESIGN_BREITEN")?.map(Number);
const nurSchema = process.env.DESIGN_SCHEMA;
const streng = process.env.DESIGN_STRENG === "1";
const ohneBilder = process.env.DESIGN_OHNE_BILDER === "1";

/** 8 abgeschlossene Einheiten (Wochen 1–4) mit Sätzen, damit Verlauf und Diagramme Daten haben. */
function legeVerlaufAn(dbPfad) {
  const d = new Database(dbPfad);
  const plan = d.prepare("select * from plan where status = 'aktiv'").get();
  const slots = d
    .prepare("select * from plan_slot where plan_id = ?")
    .all(plan.id);
  const insertWorkout = d.prepare(
    `insert into workout (plan_id, datum, einheit, woche, zusatzblock, status, ersetzungen, beendet_am)
     values (?, ?, ?, ?, 0, 'abgeschlossen', '{}', '2026-10-07T10:00:00.000Z')`,
  );
  const insertSatz = d.prepare(
    `insert into set_log (id, workout_id, plan_slot_id, exercise_id, runde, gewicht, wdh, sekunden, meter, rpe, tempo, erledigt)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
  );
  let letzte = 0;
  for (let n = 0; n < 8; n++) {
    const woche = Math.floor(n / 2) + 1;
    const einheit = n % 2 === 0 ? "A" : "B";
    const w = insertWorkout.run(
      plan.id,
      `2026-09-${String(n * 3 + 2).padStart(2, "0")}`,
      einheit,
      woche,
    ).lastInsertRowid;
    letzte = Number(w);
    for (const slot of slots.filter(
      (s) => s.einheit === einheit && s.block !== "Z",
    )) {
      for (let r = 1; r <= 3; r++) {
        insertSatz.run(
          `design-${w}-${slot.id}-${r}`.padEnd(12, "0"),
          w,
          slot.id,
          slot.exercise_id,
          r,
          10 + woche * 2,
          8 + (r % 3) + (woche > 2 ? 1 : 0),
          30 + woche * 5,
          30,
          6 + ((n + r) % 3),
        );
      }
    }
  }
  d.close();
  return { plan, letzteEinheit: letzte };
}

async function ablauf(browser, BASE0, dbPfad) {
  const ziel = join(SHOTS, "design");
  mkdirSync(ziel, { recursive: true });
  const alleBefunde = [];

  // ---- Daten anlegen (PC, hell) ----
  const setup = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const sp = await setup.newPage();
  await hinweisBestaetigen(sp);
  await sp.goto(`${BASE}/plan/neu`);
  await sp
    .getByRole("button", { name: "Plan speichern und aktivieren" })
    .click();
  await sp
    .getByRole("heading", { name: "Plan", level: 1, exact: true })
    .waitFor();
  const { letzteEinheit } = legeVerlaufAn(dbPfad);
  await setup.close();

  const SEITEN = {
    start: { pfad: "/" },
    katalog: { pfad: "/katalog" },
    "katalog-karten": { pfad: "/katalog?ansicht=karten" },
    "katalog-spalten": {
      pfad: "/katalog?ansicht=tabelle&spalten=name,stufe,equipment,einseitig,belastung,bereich,muskeln,status,video",
    },
    "katalog-detail": { pfad: "/katalog/ZV-04" },
    "katalog-bearbeiten": { pfad: "/katalog/ZV-04/bearbeiten" },
    "katalog-neu": { pfad: "/katalog/neu" },
    plan: { pfad: "/plan" },
    "plan-neu": { pfad: "/plan/neu" },
    verlauf: { pfad: "/verlauf" },
    "verlauf-einheit": { pfad: `/verlauf/einheit/${letzteEinheit}` },
    "verlauf-uebung": { pfad: "/verlauf/uebung/ZV-04" },
    einstellungen: { pfad: "/einstellungen" },
    "plan-equipment": { pfad: "/plan/equipment" },
    "einstellungen-daten": { pfad: "/einstellungen/daten" },
    offline: { pfad: "/offline.html", ohneNav: true },
  };

  for (const { b, h, touch } of BREITEN) {
    if (nurBreiten && !nurBreiten.includes(b)) continue;
    for (const [schemaName, colorScheme] of SCHEMEN) {
      if (nurSchema && nurSchema !== schemaName) continue;
      const context = await browser.newContext({
        viewport: { width: b, height: h },
        colorScheme,
        hasTouch: touch,
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const fehler = sammleFehler(page);
      const aufnehmen = async (schluessel, optionen = {}) => {
        const wo = `${schluessel} @${b} ${schemaName}`;
        if (!ohneBilder)
          await page.screenshot({
            path: join(ziel, `${schluessel}-${b}-${schemaName}.png`),
            fullPage: optionen.vollSeite !== false,
          });
        const befunde = await pruefeSeite(page, { touch, breite: b });
        for (const f of befunde) alleBefunde.push(`${wo}: ${f}`);
      };

      for (const [schluessel, seite] of Object.entries(SEITEN)) {
        if (nurSeiten && !nurSeiten.includes(schluessel)) continue;
        await page.goto(`${BASE}${seite.pfad}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(150);
        await aufnehmen(schluessel);
      }

      // Training: Aufwärmen und Satz (die Einheit wird danach abgebrochen, damit der Lauf wiederholbar ist)
      if (!nurSeiten || nurSeiten.includes("training")) {
        await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Training starten" }).click();
        await page
          .getByRole("heading", { name: "Aufwärmen", level: 1 })
          .waitFor();
        await aufnehmen("training-aufwaermen");
        await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
        await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
        await aufnehmen("training-satz");
        await page.getByRole("button", { name: "Satz erledigt" }).click();
        await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
        await aufnehmen("training-satz-2");
        const d = new Database(dbPfad);
        d.prepare(
          "update workout set status = 'abgebrochen' where status = 'laufend'",
        ).run();
        d.close();
      }
      if (fehler.length)
        alleBefunde.push(
          `@${b} ${schemaName}: Konsolen-/HTTP-Fehler: ${fehler.join(" | ")}`,
        );
      await context.close();
    }
  }

  // ---- Seiten ohne Navigation: Hinweis (frische DB nötig) und Login laufen in eigenen Skripten ----
  writeFileSync(join(ziel, "befunde.txt"), alleBefunde.join("\n") + "\n");
  console.log(
    `\n${alleBefunde.length} Befunde (Liste: ${join(ziel, "befunde.txt")})`,
  );
  for (const f of alleBefunde.slice(0, 80)) console.log(`  - ${f}`);
  if (alleBefunde.length > 80)
    console.log(`  … ${alleBefunde.length - 80} weitere`);
  if (streng && alleBefunde.length)
    throw new Error(`${alleBefunde.length} Gestaltungsbefunde`);
}

await withApp(({ browser, BASE: b, dbPfad }) => ablauf(browser, b, dbPfad));

// Upgrade-Pfad: Eine bestehende Datenbank mit Daten wird per Migration angehoben, ohne dass Daten
// verloren gehen.
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROJEKT_ROOT } from "./test-utils";

const ordner = join(PROJEKT_ROOT, "drizzle");
const migrationen = readdirSync(ordner)
  .filter((n) => /^\d{4}_.+\.sql$/.test(n))
  .sort();
const anwenden = (db: Database.Database, datei: string) => {
  for (const stmt of readFileSync(join(ordner, datei), "utf8").split("--> statement-breakpoint")) {
    if (stmt.trim()) db.exec(stmt);
  }
};

describe("Migrationen", () => {
  it("0002 fügt exercise.video_url zu einer bestehenden Datenbank hinzu, Daten bleiben", () => {
    const db = new Database(":memory:");
    for (const datei of migrationen.filter((n) => n < "0002")) anwenden(db, datei);
    db.exec(`insert into exercise (id, name, muster, stufe, einseitig, equipment, optionale_last,
      hauptmuskeln, belastungsart, standard_bereich, steigerungsart, ausfuehrung, fehler, hinweise,
      aktiv, pruefstatus)
      values ('KN-01', 'Alt', 'KN', 1, 0, '[]', '[]', '["Beine"]', 'wdh', '8–12', '["wdh"]',
      '["a","b","c"]', '["x","y"]', 'h', 1, 'zu_pruefen')`);
    const spaltenVorher = db.prepare("pragma table_info(exercise)").all() as { name: string }[];
    expect(spaltenVorher.map((s) => s.name)).not.toContain("video_url");

    for (const datei of migrationen.filter((n) => n >= "0002")) anwenden(db, datei);

    const spalten = db.prepare("pragma table_info(exercise)").all() as {
      name: string;
      notnull: number;
    }[];
    expect(spalten.find((s) => s.name === "video_url")).toMatchObject({ notnull: 0 });
    expect(db.prepare("select name, video_url from exercise where id = 'KN-01'").get()).toEqual({
      name: "Alt",
      video_url: null,
    });
    db.close();
  });

  it("0003 trennt den Kabelzug von den Maschinen in Profilen und Startkatalog", () => {
    const db = new Database(":memory:");
    for (const datei of migrationen.filter((n) => n < "0003")) anwenden(db, datei);
    const profil = db.prepare(
      "insert into equipment_profile (name, equipment, gewichte, ist_standard) values (?, ?, '{}', 0)",
    );
    profil.run("Studio", '["maschinen","langhantel","kurzhanteln"]');
    profil.run("Zuhause", '["kurzhanteln","bank"]');
    profil.run("Schon neu", '["maschinen","kabelzug"]');
    const uebung = db.prepare(`insert into exercise (id, name, muster, stufe, einseitig, equipment,
      optionale_last, hauptmuskeln, belastungsart, standard_bereich, steigerungsart, ausfuehrung,
      fehler, hinweise, aktiv, pruefstatus)
      values (?, ?, 'ZH', 1, 0, ?, '[]', '["Rücken"]', 'wdh', '8–12', '["wdh"]', '["a","b","c"]',
      '["x","y"]', 'h', 1, 'zu_pruefen')`);
    uebung.run("ZH-01", "Kabelrudern sitzend", '[["maschinen"]]');
    uebung.run("ZV-01", "Latzug", '[["maschinen"],["bank"]]'); // vom Nutzer geändert
    uebung.run("RU-05", "Pallof Press", '[["maschinen","band"]]');
    uebung.run("KN-02", "Beinpresse", '[["maschinen"]]');

    for (const datei of migrationen.filter((n) => n >= "0003" && n < "0004")) anwenden(db, datei);

    expect(db.prepare("select name, equipment from equipment_profile order by id").all()).toEqual([
      { name: "Studio", equipment: '["maschinen","kabelzug","langhantel","kurzhanteln"]' },
      { name: "Zuhause", equipment: '["kurzhanteln","bank"]' },
      { name: "Schon neu", equipment: '["maschinen","kabelzug"]' },
    ]);
    expect(db.prepare("select id, equipment from exercise order by id").all()).toEqual([
      { id: "KN-02", equipment: '[["maschinen"]]' },
      { id: "RU-05", equipment: '[["kabelzug","band"]]' },
      { id: "ZH-01", equipment: '[["kabelzug"]]' },
      { id: "ZV-01", equipment: '[["maschinen"],["bank"]]' },
    ]);
    db.close();
  });

  it("0004 fügt exercise.ersatz hinzu und kennzeichnet vorhandenes Körpergewicht und Band", () => {
    const db = new Database(":memory:");
    for (const datei of migrationen.filter((n) => n < "0004")) anwenden(db, datei);
    const einfuegen = (id: string, equipment: string, last: string) =>
      db.exec(`insert into exercise (id, name, muster, stufe, einseitig, equipment, optionale_last,
        hauptmuskeln, belastungsart, standard_bereich, steigerungsart, ausfuehrung, fehler,
        hinweise, aktiv, pruefstatus)
        values ('${id}', 'x', 'KN', 1, 0, '${equipment}', '${last}', '["Beine"]', 'wdh', '8–12',
        '["wdh"]', '["a","b","c"]', '["x","y"]', 'h', 1, 'zu_pruefen')`);
    einfuegen("KN-01", "[]", "[]");
    einfuegen("KN-05", "[]", '["kurzhanteln"]');
    einfuegen("KN-04", '[["kurzhanteln","kettlebell"]]', "[]");
    einfuegen("KN-09", '[["band"]]', "[]");
    einfuegen("KN-10", '[["maschinen","band"]]', "[]");

    for (const datei of migrationen.filter((n) => n >= "0004" && n < "0005")) anwenden(db, datei);

    const zeilen = db.prepare("select id, ersatz from exercise order by id").all();
    expect(zeilen).toEqual([
      { id: "KN-01", ersatz: 1 },
      { id: "KN-04", ersatz: 0 },
      { id: "KN-05", ersatz: 0 },
      { id: "KN-09", ersatz: 1 },
      { id: "KN-10", ersatz: 0 },
    ]);
    db.close();
  });

  it("0007 macht die Equipment-Bedingung flach und entfernt die optionale Last", () => {
    const db = new Database(":memory:");
    for (const datei of migrationen.filter((n) => n < "0007")) anwenden(db, datei);
    const uebung = db.prepare(`insert into exercise (id, name, muster, stufe, einseitig, equipment,
      optionale_last, hauptmuskeln, belastungsart, standard_bereich, steigerungsart, ausfuehrung,
      fehler, hinweise, aktiv, pruefstatus)
      values (?, 'Alt', 'KN', 1, 0, ?, ?, '["Beine"]', 'wdh', '8–12', '["wdh"]', '["a","b","c"]',
      '["x","y"]', 'h', 1, 'zu_pruefen')`);
    uebung.run("KN-01", "[]", '["kurzhanteln"]');
    uebung.run("KN-02", '[["maschinen"]]', "[]");
    uebung.run("KN-03", '[["kurzhanteln","kettlebell"]]', "[]");
    uebung.run("KN-04", '[["bank"],["kurzhanteln","langhantel"]]', "[]");

    for (const datei of migrationen.filter((n) => n >= "0007")) anwenden(db, datei);

    const spalten = db.prepare("pragma table_info(exercise)").all() as { name: string }[];
    expect(spalten.map((s) => s.name)).not.toContain("optionale_last");
    expect(db.prepare("select id, equipment from exercise order by id").all()).toEqual([
      { id: "KN-01", equipment: "[]" },
      { id: "KN-02", equipment: '["maschinen"]' },
      { id: "KN-03", equipment: '["kurzhanteln"]' },
      { id: "KN-04", equipment: '["bank","kurzhanteln"]' },
    ]);
    db.close();
  });

  it("0005/0006: Profile entfallen, Plan hat Equipment, Pläne und Einheiten (Testdaten) werden verworfen", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    for (const datei of migrationen.filter((n) => n < "0005")) anwenden(db, datei);
    db.exec(`insert into exercise (id, name, muster, stufe, einseitig, equipment, optionale_last,
      hauptmuskeln, belastungsart, standard_bereich, steigerungsart, ausfuehrung, fehler, hinweise,
      aktiv, pruefstatus)
      values ('KN-01', 'Alt', 'KN', 1, 0, '[]', '[]', '["Beine"]', 'wdh', '8–12', '["wdh"]',
      '["a","b","c"]', '["x","y"]', 'h', 1, 'zu_pruefen')`);
    db.exec(`insert into settings (id, stufen, einheiten_pro_woche, zusatzblock, aufwaermen_text)
      values (1, '{"KN":3}', 3, 1, 'Text')`);
    db.exec(`insert into equipment_profile (id, name, equipment, gewichte, ist_standard)
      values (1, 'Studio', '["maschinen"]', '{}', 1)`);
    db.exec(`insert into plan (id, profil_id, start_datum, einheiten_pro_woche, zusatzblock, stufen,
      status) values (1, 1, '2026-10-07', 2, 0, '{"KN":2}', 'aktiv')`);
    db.exec(`insert into plan_slot (id, plan_id, einheit, block, position, muster, exercise_id)
      values (1, 1, 'A', '1', 1, 'KN', 'KN-01')`);
    db.exec(`insert into workout (id, plan_id, datum, einheit, woche, profil_id, ad_hoc, zusatzblock,
      status) values (1, 1, '2026-10-08', 'A', 1, 1, 0, 0, 'abgeschlossen')`);
    db.exec(`insert into set_log (id, workout_id, plan_slot_id, exercise_id, runde, wdh, erledigt)
      values ('satz-0001', 1, 1, 'KN-01', 1, 10, 1)`);

    for (const datei of migrationen.filter((n) => n >= "0005")) anwenden(db, datei);

    const tabellen = (
      db.prepare("select name from sqlite_master where type = 'table'").all() as { name: string }[]
    ).map((t) => t.name);
    expect(tabellen).not.toContain("equipment_profile");
    const spalten = (tabelle: string) =>
      (db.prepare(`pragma table_info(${tabelle})`).all() as { name: string }[]).map((c) => c.name);
    expect(spalten("plan")).toContain("equipment");
    expect(spalten("plan")).toContain("gewichte");
    expect(spalten("plan")).not.toContain("profil_id");
    expect(spalten("workout")).not.toContain("profil_id");
    expect(spalten("workout")).not.toContain("ad_hoc");

    // Pläne, Einheiten und Sätze sind weg, Katalog und Einstellungen bleiben
    for (const t of ["plan", "plan_slot", "workout", "set_log"]) {
      expect(db.prepare(`select count(*) as n from ${t}`).get(), t).toEqual({ n: 0 });
    }
    expect(db.prepare("select name from exercise").all()).toEqual([{ name: "Alt" }]);
    expect(db.prepare("select einheiten_pro_woche as n from settings").get()).toEqual({ n: 3 });

    // Die neuen Tabellen sind benutzbar, die Fremdschlüssel stimmen
    db.exec(`insert into plan (equipment, gewichte, start_datum, einheiten_pro_woche, zusatzblock,
      stufen, status) values ('["bank"]', '{}', '2026-10-09', 2, 0, '{"KN":2}', 'aktiv')`);
    expect(db.prepare("pragma foreign_key_check").all()).toEqual([]);
    db.close();
  });

  it("0005/0006 laufen auch mit dem echten Migrator (in einer Transaktion) auf vorhandenen Daten", () => {
    // Ordner mit nur den Migrationen bis 0004 anlegen, migrieren, Daten einfügen, dann vollständig migrieren.
    const alt = mkdtempSync(join(tmpdir(), "fit-migration-"));
    try {
      cpSync(ordner, alt, { recursive: true });
      const journal = JSON.parse(readFileSync(join(alt, "meta/_journal.json"), "utf8")) as {
        entries: { idx: number }[];
      };
      writeFileSync(
        join(alt, "meta/_journal.json"),
        JSON.stringify({ ...journal, entries: journal.entries.filter((e) => e.idx < 5) }),
      );
      const sqlite = new Database(":memory:");
      sqlite.pragma("foreign_keys = ON");
      const db = drizzle(sqlite);
      migrate(db, { migrationsFolder: alt });

      sqlite.exec(`insert into equipment_profile (id, name, equipment, gewichte, ist_standard)
        values (1, 'Studio', '["maschinen"]', '{}', 1)`);
      sqlite.exec(`insert into exercise (id, name, muster, stufe, einseitig, equipment, optionale_last,
        hauptmuskeln, belastungsart, standard_bereich, steigerungsart, ausfuehrung, fehler, hinweise,
        aktiv, pruefstatus) values ('KN-01', 'Alt', 'KN', 1, 0, '[]', '[]', '["Beine"]', 'wdh',
        '8–12', '["wdh"]', '["a","b","c"]', '["x","y"]', 'h', 1, 'zu_pruefen')`);
      sqlite.exec(`insert into plan (id, profil_id, start_datum, einheiten_pro_woche, zusatzblock,
        stufen, status) values (1, 1, '2026-10-07', 2, 0, '{"KN":2}', 'aktiv')`);
      sqlite.exec(`insert into plan_slot (id, plan_id, einheit, block, position, muster, exercise_id)
        values (1, 1, 'A', '1', 1, 'KN', 'KN-01')`);
      sqlite.exec(`insert into workout (id, plan_id, datum, einheit, woche, profil_id, ad_hoc,
        zusatzblock, status) values (1, 1, '2026-10-08', 'A', 1, 1, 0, 0, 'abgeschlossen')`);

      migrate(db, { migrationsFolder: ordner });

      expect(sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
      expect(sqlite.prepare("select count(*) as n from plan").get()).toEqual({ n: 0 });
      expect(sqlite.prepare("select count(*) as n from exercise").get()).toEqual({ n: 1 });
      sqlite.close();
    } finally {
      rmSync(alt, { recursive: true, force: true });
    }
  });

  it("das Journal kennt alle Migrationsdateien", () => {
    const journal = JSON.parse(readFileSync(join(ordner, "meta/_journal.json"), "utf8")) as {
      entries: { tag: string }[];
    };
    expect(journal.entries.map((e) => `${e.tag}.sql`)).toEqual(migrationen);
  });
});

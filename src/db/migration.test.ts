// Upgrade-Pfad: Eine bestehende Datenbank mit Daten wird per Migration angehoben, ohne dass Daten
// verloren gehen.
import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
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

    for (const datei of migrationen.filter((n) => n >= "0003")) anwenden(db, datei);

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

  it("das Journal kennt alle Migrationsdateien", () => {
    const journal = JSON.parse(readFileSync(join(ordner, "meta/_journal.json"), "utf8")) as {
      entries: { tag: string }[];
    };
    expect(journal.entries.map((e) => `${e.tag}.sql`)).toEqual(migrationen);
  });
});

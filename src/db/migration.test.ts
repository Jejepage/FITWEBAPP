// Upgrade-Pfad: Eine bestehende Datenbank (Stand vor dem Video-Link) mit Daten bekommt die neue
// Spalte per Migration, ohne dass Daten verloren gehen.
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

  it("0003 fügt exercise.ersatz hinzu und kennzeichnet vorhandenes Körpergewicht und Band", () => {
    const db = new Database(":memory:");
    for (const datei of migrationen.filter((n) => n < "0003")) anwenden(db, datei);
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

    for (const datei of migrationen.filter((n) => n >= "0003")) anwenden(db, datei);

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

  it("das Journal kennt alle Migrationsdateien", () => {
    const journal = JSON.parse(readFileSync(join(ordner, "meta/_journal.json"), "utf8")) as {
      entries: { tag: string }[];
    };
    expect(journal.entries.map((e) => `${e.tag}.sql`)).toEqual(migrationen);
  });
});

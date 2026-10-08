import { describe, expect, it } from "vitest";
import { neueSeedDb } from "@/db/test-utils";
import type { AllesDaten, BackupDatei } from "@/domain/backup-types";
import { exportiere, importiereAlles, importiereDatei, importiereKatalog } from "./backup";
import { alleUebungen, setAktiv } from "./exercises";
import { legeBlockAn } from "./test-helfer";
import { updateSettings } from "./settings";
import { MUSTER } from "@/domain/types";

const JETZT = new Date("2026-10-08T10:00:00Z");
const kopie = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const alles = (d: BackupDatei): AllesDaten => {
  if (d.art !== "alles") throw new Error("kein Gesamt-Backup");
  return d.daten;
};

function dbMitDaten() {
  const db = neueSeedDb();
  legeBlockAn(db, { einheiten: 5 });
  setAktiv(db, "KN-01", false);
  return db;
}

describe("exportiere", () => {
  it("Gesamt-Backup enthält alle Tabellen mit ihren Zeilen", () => {
    const db = dbMitDaten();
    const d = exportiere(db, "alles", JETZT);
    expect(d).toMatchObject({ format: "fit-backup", version: 1, art: "alles" });
    expect(d.erstelltAm).toBe("2026-10-08T10:00:00.000Z");
    const a = alles(d);
    expect(a.uebungen).toHaveLength(60);
    expect(a.profile).toHaveLength(3);
    expect(a.plaene).toHaveLength(1);
    expect(a.planSlots).toHaveLength(16);
    expect(a.einheiten).toHaveLength(5);
    expect(a.saetze.length).toBeGreaterThan(50);
    expect(a.uebungen.find((u) => u.id === "KN-01")?.aktiv).toBe(false);
  });

  it("Katalog-Backup enthält nur Übungen", () => {
    const d = exportiere(neueSeedDb(), "katalog", JETZT);
    expect(Object.keys(d.daten)).toEqual(["uebungen"]);
  });

  it("ist deterministisch (sortiert)", () => {
    const db = dbMitDaten();
    expect(exportiere(db, "alles", JETZT)).toEqual(exportiere(db, "alles", JETZT));
  });
});

describe("Vollimport", () => {
  it("Round-Trip: Export → Import in eine andere Datenbank → identischer Export", () => {
    const quelle = dbMitDaten();
    updateSettings(quelle, {
      stufen: Object.fromEntries(MUSTER.map((m) => [m, 3])) as Record<
        (typeof MUSTER)[number],
        number
      >,
      einheitenProWoche: 3,
      zusatzblock: true,
      aufwaermenText: "Eigener Text",
    });
    const datei = kopie(exportiere(quelle, "alles", JETZT));

    const ziel = neueSeedDb(); // andere Daten (anderer Plan, Standard-Einstellungen)
    legeBlockAn(ziel, { einheiten: 2, einheitenProWoche: 3 });
    const r = importiereDatei(ziel, datei, "alles");
    expect(r).toMatchObject({
      ok: true,
      bilanz: { uebungen: 60, profile: 3, plaene: 1, einheiten: 5 },
    });
    expect(exportiere(ziel, "alles", JETZT)).toEqual(datei);
  });

  it("behält IDs bei, sodass Verweise stimmen", () => {
    const quelle = dbMitDaten();
    const datei = exportiere(quelle, "alles", JETZT);
    const ziel = neueSeedDb();
    expect(importiereAlles(ziel, kopie(alles(datei))).ok).toBe(true);
    const a = alles(exportiere(ziel, "alles", JETZT));
    expect(a.plaene.map((p) => p.id)).toEqual(alles(datei).plaene.map((p) => p.id));
    expect(a.einheiten.map((w) => w.id)).toEqual(alles(datei).einheiten.map((w) => w.id));
  });

  it("Vorgängerverweise funktionieren auch bei umgekehrter ID-Reihenfolge", () => {
    const db = neueSeedDb();
    legeBlockAn(db, { einheiten: 1 });
    const d = kopie(alles(exportiere(db, "alles", JETZT)));
    const p = d.plaene[0]!;
    d.plaene = [
      { ...p, id: 2, vorgaengerId: 7, status: "aktiv" },
      { ...p, id: 7, vorgaengerId: null, status: "abgeschlossen" },
    ];
    d.planSlots = d.planSlots.map((s) => ({ ...s, planId: 2 }));
    d.einheiten = d.einheiten.map((w) => ({ ...w, planId: 2 }));
    const r = importiereAlles(neueSeedDb(), d);
    expect(r.ok).toBe(true);
  });

  it("Fehler mitten im Import: alter Stand bleibt (Rollback)", () => {
    const db = dbMitDaten();
    const vorher = exportiere(db, "alles", JETZT);
    const kaputt = kopie(alles(exportiere(neueSeedDb(), "alles", JETZT)));
    kaputt.planSlots = [
      {
        id: 1,
        planId: 99,
        einheit: "A",
        block: "1",
        position: 1,
        muster: "KN",
        exerciseId: "KN-01",
      },
    ]; // Plan 99 existiert nicht → Fremdschlüsselfehler
    const r = importiereAlles(db, kaputt);
    expect(r.ok).toBe(false);
    expect(exportiere(db, "alles", JETZT)).toEqual(vorher);
  });

  it("falsche Datei über importiereDatei: Fehlerliste, nichts geändert", () => {
    const db = dbMitDaten();
    const vorher = exportiere(db, "alles", JETZT);
    for (const roh of [null, "text", { format: "x" }, { ...kopie(vorher), version: 99 }]) {
      const r = importiereDatei(db, roh, "alles");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.fehler.length).toBeGreaterThan(0);
    }
    expect(exportiere(db, "alles", JETZT)).toEqual(vorher);
  });

  it("Katalog-Datei bei erwartetem Gesamt-Backup wird abgelehnt", () => {
    const db = dbMitDaten();
    const r = importiereDatei(db, kopie(exportiere(db, "katalog", JETZT)), "alles");
    expect(r.ok).toBe(false);
  });
});

describe("Katalogimport", () => {
  it("aktualisiert vorhandene und legt neue Übungen an, lässt alles andere unberührt", () => {
    const db = dbMitDaten();
    const vorherAlles = alles(exportiere(db, "alles", JETZT));
    const datei = kopie(exportiere(db, "katalog", JETZT));
    datei.daten.uebungen[1]!.name = "Umbenannt";
    datei.daten.uebungen[1]!.aktiv = false;
    const neu = {
      ...kopie(datei.daten.uebungen[0]!),
      id: "KN-99",
      name: "Neu",
      leichterId: null,
      schwererId: null,
    };
    neu.muster = "KN";
    datei.daten.uebungen.push(neu);

    const r = importiereDatei(db, datei, "katalog");
    expect(r).toEqual({ ok: true, bilanz: { uebungen: 61, neu: 1 } });
    const nach = alleUebungen(db);
    expect(nach).toHaveLength(61);
    const geaendert = nach.find((u) => u.id === datei.daten.uebungen[1]!.id)!;
    expect(geaendert).toMatchObject({ name: "Umbenannt", aktiv: false });
    const nachAlles = alles(exportiere(db, "alles", JETZT));
    expect(nachAlles.plaene).toEqual(vorherAlles.plaene);
    expect(nachAlles.einheiten).toEqual(vorherAlles.einheiten);
    expect(nachAlles.saetze).toEqual(vorherAlles.saetze);
    expect(nachAlles.profile).toEqual(vorherAlles.profile);
  });

  it("lehnt ein geändertes Bewegungsmuster einer vorhandenen Übung ab", () => {
    const db = dbMitDaten();
    const vorher = exportiere(db, "alles", JETZT);
    const datei = alles({ ...kopie(vorher) });
    const k = { uebungen: kopie(datei.uebungen) };
    k.uebungen[0] = { ...k.uebungen[0]!, muster: "RU" };
    const r = importiereKatalog(db, k);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler[0]).toContain("Bewegungsmuster");
    expect(exportiere(db, "alles", JETZT)).toEqual(vorher);
  });

  it("zweimal importieren ändert nichts (idempotent)", () => {
    const db = dbMitDaten();
    const datei = kopie(exportiere(db, "katalog", JETZT));
    importiereDatei(db, datei, "katalog");
    const einmal = exportiere(db, "alles", JETZT);
    importiereDatei(db, datei, "katalog");
    expect(exportiere(db, "alles", JETZT)).toEqual(einmal);
  });
});

import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type AllesDaten,
  type BackupArt,
  type BackupDatei,
  type PlanSlotZeile,
  type SatzZeile,
} from "./backup-types";
import {
  BACKUP_MAX_MELDUNGEN,
  BACKUP_MAX_NOTIZ_ZEICHEN,
  BACKUP_ZEILEN_LIMIT,
  backupDateiSchema,
  parseBackup,
} from "./backup";
import { SLOT_VORLAGE } from "./plan-types";
import { testKatalog } from "./test-katalog";
import { MUSTER, type Muster } from "./types";

// ---- Testdaten --------------------------------------------------------------------------------

const katalog = testKatalog();
const erste = (muster: Muster) => katalog.find((u) => u.muster === muster)!;
const zweite = (muster: Muster) => katalog.filter((u) => u.muster === muster)[1]!;

const stufen = (n: number) =>
  Object.fromEntries(MUSTER.map((m) => [m, n])) as Record<Muster, number>;

const slotsFuerPlan = (planId: number, ersteId: number): PlanSlotZeile[] =>
  SLOT_VORLAGE.map((v, i) => ({
    id: ersteId + i,
    planId,
    einheit: v.einheit,
    block: v.block,
    position: v.position,
    muster: v.muster,
    exerciseId: erste(v.muster).id,
  }));

const satz = (nr: number, extra: Partial<SatzZeile> = {}): SatzZeile => ({
  id: `satz-${String(nr).padStart(6, "0")}`,
  workoutId: 2,
  planSlotId: 1,
  exerciseId: erste("KN").id,
  runde: 1,
  gewicht: 40,
  wdh: 10,
  sekunden: null,
  meter: null,
  rpe: 7.5,
  tempo: false,
  erledigt: true,
  erstelltAm: "2026-09-14T17:30:00.000Z",
  ...extra,
});

type AllesBackup = Extract<BackupDatei, { art: "alles" }>;

/**
 * Kleines, vollständig gültiges Gesamt-Backup: zwei Profile, zwei Pläne (der aktive mit dem
 * abgeschlossenen als Vorgänger), je eine abgeschlossene und eine laufende Einheit.
 */
function gueltigeDatei(): AllesBackup {
  const daten: AllesDaten = {
    uebungen: katalog.map((u) => ({ ...u })),
    profile: [
      {
        id: 1,
        seedKey: "studio",
        name: "Studio",
        equipment: ["maschinen", "langhantel", "bank"],
        gewichte: {},
        istStandard: true,
      },
      {
        id: 2,
        seedKey: null,
        name: "Zuhause",
        equipment: ["kurzhanteln", "band"],
        gewichte: { kurzhanteln: [4, 8, 12.5] },
        istStandard: false,
      },
    ],
    einstellungen: {
      stufen: stufen(2),
      einheitenProWoche: 2,
      zusatzblock: true,
      aufwaermenText: "Schultern kreisen.\nHüfte mobilisieren.",
      hinweisAkzeptiertAm: "2026-09-01T08:30:00.000Z",
    },
    plaene: [
      {
        id: 1,
        profilId: 1,
        startDatum: "2026-09-14",
        einheitenProWoche: 2,
        zusatzblock: true,
        stufen: stufen(2),
        status: "aktiv",
        vorgaengerId: 2,
        erstelltAm: "2026-09-13T10:00:00.000Z",
      },
      {
        id: 2,
        profilId: 2,
        startDatum: "2026-08-03",
        einheitenProWoche: 3,
        zusatzblock: false,
        stufen: stufen(1),
        status: "abgeschlossen",
        vorgaengerId: null,
        erstelltAm: "2026-08-02T10:00:00.000Z",
      },
    ],
    planSlots: [...slotsFuerPlan(1, 1), ...slotsFuerPlan(2, 101)],
    einheiten: [
      {
        id: 1,
        planId: 2,
        datum: "2026-09-10",
        einheit: "A",
        woche: 6,
        profilId: 2,
        adHoc: false,
        zusatzblock: false,
        status: "abgeschlossen",
        ersetzungen: { "101": zweite("KN").id },
        notiz: "Lief gut.",
        gestartetAm: "2026-09-10T17:00:00.000Z",
        beendetAm: "2026-09-10T17:55:00.000Z",
      },
      {
        id: 2,
        planId: 1,
        datum: "2026-09-14",
        einheit: "A",
        woche: 1,
        profilId: 1,
        adHoc: false,
        zusatzblock: true,
        status: "laufend",
        ersetzungen: {},
        notiz: null,
        gestartetAm: "2026-09-14T17:00:00.000Z",
        beendetAm: null,
      },
    ],
    saetze: [
      satz(1),
      satz(2, { runde: 2, rpe: null }),
      satz(3, {
        workoutId: 1,
        planSlotId: 101,
        exerciseId: zweite("KN").id,
        gewicht: null,
        wdh: null,
        sekunden: 30,
      }),
      satz(4, { planSlotId: null, exerciseId: erste("TR").id, wdh: null, meter: 20, tempo: true }),
    ],
  };
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    art: "alles",
    erstelltAm: "2026-09-14T18:00:00.000Z",
    daten,
  };
}

function katalogDatei(): Extract<BackupDatei, { art: "katalog" }> {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    art: "katalog",
    erstelltAm: "2026-09-14T18:00:00.000Z",
    daten: { uebungen: katalog.map((u) => ({ ...u })) },
  };
}

function fehlerVon(roh: unknown, erwartet?: BackupArt): string[] {
  const ergebnis = parseBackup(roh, erwartet);
  if (ergebnis.ok) throw new Error("Die Prüfung hätte scheitern müssen");
  return ergebnis.fehler;
}

// ---- Tests ------------------------------------------------------------------------------------

describe("parseBackup: gültige Dateien", () => {
  it("akzeptiert ein vollständiges Gesamt-Backup und liefert die Daten unverändert", () => {
    const roh = gueltigeDatei();
    const ergebnis = parseBackup(roh);
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) expect(ergebnis.datei).toEqual(roh);
  });

  it("akzeptiert ein Katalog-Backup", () => {
    const roh = katalogDatei();
    const ergebnis = parseBackup(roh, "katalog");
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) expect(ergebnis.datei).toEqual(roh);
  });

  it("akzeptiert die Art, die erwartet wurde, und jede Art ohne Erwartung", () => {
    expect(parseBackup(gueltigeDatei(), "alles").ok).toBe(true);
    expect(parseBackup(katalogDatei()).ok).toBe(true);
  });

  it("akzeptiert ein Backup ohne Pläne, Einheiten und Sätze", () => {
    const roh = gueltigeDatei();
    roh.daten.plaene = [];
    roh.daten.planSlots = [];
    roh.daten.einheiten = [];
    roh.daten.saetze = [];
    expect(parseBackup(roh).ok).toBe(true);
  });

  it("akzeptiert eine leere Datenbank ohne Profile", () => {
    const roh = gueltigeDatei();
    roh.daten.profile = [];
    roh.daten.plaene = [];
    roh.daten.planSlots = [];
    roh.daten.einheiten = [];
    roh.daten.saetze = [];
    expect(parseBackup(roh).ok).toBe(true);
  });

  it("akzeptiert Zeitstempel mit Zeitzonenversatz und ohne Millisekunden", () => {
    const roh = gueltigeDatei();
    roh.erstelltAm = "2026-09-14T20:00:00+02:00";
    roh.daten.plaene[0]!.erstelltAm = "2026-09-13T10:00:00Z";
    expect(parseBackup(roh).ok).toBe(true);
  });

  it("verwirft unbekannte Zusatzfelder still", () => {
    const roh = gueltigeDatei();
    (roh as Record<string, unknown>).zukunft = true;
    (roh.daten as unknown as Record<string, unknown>).neueTabelle = [1];
    (roh.daten.saetze[0] as unknown as Record<string, unknown>).kommentar = "neu";
    (roh.daten.profile[0] as unknown as Record<string, unknown>).farbe = "rot";
    const ergebnis = parseBackup(roh);
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok || ergebnis.datei.art !== "alles") return;
    expect(ergebnis.datei).not.toHaveProperty("zukunft");
    expect(ergebnis.datei.daten).not.toHaveProperty("neueTabelle");
    expect(ergebnis.datei.daten.saetze[0]).not.toHaveProperty("kommentar");
    expect(ergebnis.datei.daten.profile[0]).not.toHaveProperty("farbe");
  });

  it("verändert die Eingabe nicht", () => {
    const roh = gueltigeDatei();
    const kopie = structuredClone(roh);
    parseBackup(roh);
    expect(roh).toEqual(kopie);
  });

  it("stimmt mit backupDateiSchema überein", () => {
    expect(backupDateiSchema.safeParse(gueltigeDatei()).success).toBe(true);
    expect(backupDateiSchema.safeParse(katalogDatei()).success).toBe(true);
    expect(backupDateiSchema.safeParse({ ...katalogDatei(), version: 2 }).success).toBe(false);
  });
});

describe("parseBackup: Kopf", () => {
  it("lehnt ein fremdes Format ab", () => {
    const f = fehlerVon({ ...gueltigeDatei(), format: "anderes-backup" });
    expect(f).toEqual(["Die Datei ist kein FIT-Backup (Feld format ist nicht „fit-backup“)."]);
  });

  it("lehnt eine andere Version mit klarer Meldung ab", () => {
    expect(fehlerVon({ ...gueltigeDatei(), version: 2 })).toEqual([
      "Backup-Version 2 wird nicht unterstützt (diese App liest Version 1).",
    ]);
    expect(fehlerVon({ ...gueltigeDatei(), version: "1" })[0]).toContain(
      "Backup-Version 1 wird nicht unterstützt",
    );
    expect(fehlerVon({ ...gueltigeDatei(), version: 0 })[0]).toContain("Backup-Version 0");
  });

  it("meldet eine fehlende Version", () => {
    const roh: Record<string, unknown> = { ...gueltigeDatei() };
    delete roh.version;
    expect(fehlerVon(roh)).toEqual(["Die Backup-Version fehlt."]);
  });

  it("lehnt eine unbekannte Art ab", () => {
    expect(fehlerVon({ ...gueltigeDatei(), art: "teilweise" })[0]).toContain(
      "Unbekannte Backup-Art teilweise",
    );
    const roh: Record<string, unknown> = { ...gueltigeDatei() };
    delete roh.art;
    expect(fehlerVon(roh)[0]).toContain("Unbekannte Backup-Art");
  });

  it("lehnt die falsche Art ab, wenn eine bestimmte erwartet wird", () => {
    expect(fehlerVon(katalogDatei(), "alles")).toEqual([
      "Die Datei enthält ein Katalog-Backup, erwartet wurde ein Gesamt-Backup.",
    ]);
    expect(fehlerVon(gueltigeDatei(), "katalog")).toEqual([
      "Die Datei enthält ein Gesamt-Backup, erwartet wurde ein Katalog-Backup.",
    ]);
  });

  it("verlangt einen ISO-Zeitstempel in erstelltAm", () => {
    for (const wert of ["gestern", "2026-09-14", "2026-02-30T10:00:00Z", 1789000000, null]) {
      expect(fehlerVon({ ...gueltigeDatei(), erstelltAm: wert })).toEqual([
        "Das Feld erstelltAm ist kein gültiger ISO-Zeitstempel.",
      ]);
    }
  });

  it("sammelt mehrere Kopffehler und prüft dann die Daten nicht", () => {
    const f = fehlerVon({ format: "x", version: 9, art: "alles", erstelltAm: "?", daten: 5 });
    expect(f).toHaveLength(3);
  });

  it("verlangt ein Objekt in daten", () => {
    for (const daten of [undefined, null, 5, "x", []]) {
      expect(fehlerVon({ ...katalogDatei(), daten })).toEqual([
        "Das Feld daten fehlt oder ist kein Objekt.",
      ]);
    }
  });
});

describe("parseBackup: beliebige Eingaben", () => {
  it("liefert bei Müll ein Fehlerergebnis und wirft nie", () => {
    const muell: unknown[] = [
      null,
      undefined,
      0,
      42,
      NaN,
      "",
      "fit-backup",
      "{}",
      true,
      [],
      [1, 2],
      {},
      { format: BACKUP_FORMAT },
      () => 1,
      Symbol("x"),
      10n,
      new Date(),
      Object.create(null),
    ];
    for (const roh of muell) {
      const ergebnis = parseBackup(roh);
      expect(ergebnis.ok).toBe(false);
      if (!ergebnis.ok) {
        expect(ergebnis.fehler.length).toBeGreaterThan(0);
        expect(ergebnis.fehler.every((f) => typeof f === "string" && f !== "")).toBe(true);
      }
    }
  });

  it("meldet bei Nicht-Objekten, dass ein JSON-Objekt erwartet wird", () => {
    for (const roh of [null, 42, "text", []]) {
      expect(fehlerVon(roh)).toEqual([
        "Die Datei ist kein gültiges Backup (erwartet wird ein JSON-Objekt).",
      ]);
    }
  });

  it("fängt Eingaben ab, deren Lesen wirft", () => {
    const boese = {
      get format(): string {
        throw new Error("Zugriff verweigert");
      },
    };
    expect(fehlerVon(boese)).toEqual(["Die Datei konnte nicht gelesen werden."]);
  });

  it("meldet Müll in den Tabellen, statt zu werfen", () => {
    const roh = gueltigeDatei() as unknown as { daten: Record<string, unknown> };
    roh.daten.uebungen = "keine Liste";
    roh.daten.profile = [null, 3, "x", []];
    roh.daten.einstellungen = [];
    const f = fehlerVon(roh);
    expect(f).toContain("Übungen: muss eine Liste sein");
    expect(f).toContain("Profil Nr. 1: muss ein Objekt sein");
    expect(f).toContain("Einstellungen muss ein Objekt sein");
  });
});

describe("parseBackup: Schema der Zeilen", () => {
  it("nennt Fundstelle und Feld bei Übungen", () => {
    const roh = gueltigeDatei();
    const u = roh.daten.uebungen[3]!;
    u.ausfuehrung = ["nur eins"];
    expect(fehlerVon(roh)).toEqual([
      `Übung ${u.id}: Feld ausfuehrung muss mindestens 3 Einträge haben`,
    ]);
  });

  it("nennt Fundstelle bei Pfaden in Listen", () => {
    const roh = gueltigeDatei();
    const u = roh.daten.uebungen[0]!;
    u.ausfuehrung = ["a", "", "c"];
    expect(fehlerVon(roh)).toEqual([
      `Übung ${u.id}: Feld ausfuehrung (Eintrag 2) darf nicht leer sein`,
    ]);
  });

  it("zeigt Fehler aus exerciseSchema mit Fundstelle", () => {
    const roh = gueltigeDatei();
    const u = roh.daten.uebungen[0]!;
    u.standardBereich = "viel";
    u.id = "xx-1";
    const f = fehlerVon(roh);
    expect(f).toContain("Übung xx-1: Feld id hat ein ungültiges Format");
    expect(f.some((z) => z.startsWith("Übung xx-1: Feld standardBereich: Format 8–12"))).toBe(true);
  });

  it("lehnt RPE 10,5 und RPE ohne halben Schritt ab", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze[0]!.rpe = 10.5;
    expect(fehlerVon(roh)).toEqual(["Satz satz-000001: Feld rpe darf höchstens 10 sein"]);
    roh.daten.saetze[0]!.rpe = 7.3;
    expect(fehlerVon(roh)).toEqual([
      "Satz satz-000001: Feld rpe muss in halben Schritten angegeben werden",
    ]);
    roh.daten.saetze[0]!.rpe = 0.5;
    expect(fehlerVon(roh)).toEqual(["Satz satz-000001: Feld rpe muss mindestens 1 sein"]);
  });

  it("lehnt 0 Wiederholungen ab", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze[0]!.wdh = 0;
    expect(fehlerVon(roh)).toEqual(["Satz satz-000001: Feld wdh muss mindestens 1 sein"]);
  });

  it("lehnt Nachkommastellen bei ganzzahligen Feldern ab", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze[0]!.wdh = 8.5;
    expect(fehlerVon(roh)).toEqual(["Satz satz-000001: Feld wdh muss eine ganze Zahl sein"]);
  });

  it("verlangt mindestens einen Messwert je Satz", () => {
    const roh = gueltigeDatei();
    Object.assign(roh.daten.saetze[0]!, { wdh: null, sekunden: null, meter: null });
    expect(fehlerVon(roh)).toEqual([
      "Satz satz-000001: Wiederholungen, Sekunden oder Meter fehlen (mindestens ein Messwert nötig)",
    ]);
  });

  it("lehnt unmögliche Kalenderdaten ab", () => {
    const roh = gueltigeDatei();
    roh.daten.plaene[0]!.startDatum = "2026-02-30";
    expect(fehlerVon(roh)).toEqual([
      "Plan 1: Feld startDatum ist kein gültiges Datum (erwartet JJJJ-MM-TT)",
    ]);
    roh.daten.plaene[0]!.startDatum = "2026-09-14T10:00:00Z";
    expect(fehlerVon(roh)[0]).toContain("Feld startDatum ist kein gültiges Datum");
    roh.daten.plaene[0]!.startDatum = "2028-02-29"; // Schaltjahr
    expect(parseBackup(roh).ok).toBe(true);
    roh.daten.plaene[0]!.startDatum = "2027-02-29";
    expect(parseBackup(roh).ok).toBe(false);
  });

  it("lehnt Zeitstempel ohne Zeitzone oder als Datum ab", () => {
    const roh = gueltigeDatei();
    roh.daten.einheiten[0]!.gestartetAm = "2026-09-10T17:00:00";
    roh.daten.einheiten[0]!.beendetAm = "2026-09-10";
    roh.daten.einstellungen.hinweisAkzeptiertAm = "heute";
    expect(fehlerVon(roh)).toEqual([
      "Einstellungen: Feld hinweisAkzeptiertAm ist kein gültiger ISO-Zeitstempel (z. B. 2026-01-31T12:00:00Z)",
      "Einheit 1: Feld gestartetAm ist kein gültiger ISO-Zeitstempel (z. B. 2026-01-31T12:00:00Z)",
      "Einheit 1: Feld beendetAm ist kein gültiger ISO-Zeitstempel (z. B. 2026-01-31T12:00:00Z)",
    ]);
  });

  it("lehnt Stufe 6 und fehlende Muster in Stufen ab", () => {
    const roh = gueltigeDatei();
    roh.daten.plaene[0]!.stufen.KN = 6;
    roh.daten.einstellungen.stufen.RU = 0;
    expect(fehlerVon(roh)).toEqual([
      "Einstellungen: Feld stufen.RU muss mindestens 1 sein",
      "Plan 1: Feld stufen.KN darf höchstens 5 sein",
    ]);
    delete (roh.daten.plaene[0]!.stufen as Partial<Record<Muster, number>>).HB;
    roh.daten.plaene[0]!.stufen.KN = 5;
    roh.daten.einstellungen.stufen.RU = 1;
    expect(fehlerVon(roh)).toEqual(["Plan 1: Feld stufen.HB fehlt"]);
  });

  it("lehnt einheitenProWoche 4 ab", () => {
    const roh = gueltigeDatei();
    roh.daten.plaene[0]!.einheitenProWoche = 4;
    roh.daten.einstellungen.einheitenProWoche = 1;
    expect(fehlerVon(roh)).toEqual([
      "Einstellungen: Feld einheitenProWoche muss 2 oder 3 sein",
      "Plan 1: Feld einheitenProWoche muss 2 oder 3 sein",
    ]);
  });

  it("prüft Woche, Runde, Position und Aufzählungen", () => {
    const roh = gueltigeDatei();
    roh.daten.einheiten[0]!.woche = 7;
    roh.daten.saetze[0]!.runde = 7;
    roh.daten.planSlots[0]!.position = 4;
    (roh.daten.planSlots[1]! as unknown as Record<string, unknown>).block = "3";
    (roh.daten.plaene[0]! as unknown as Record<string, unknown>).status = "offen";
    const f = fehlerVon(roh);
    expect(f).toContain("Einheit 1: Feld woche darf höchstens 6 sein");
    expect(f).toContain("Satz satz-000001: Feld runde darf höchstens 6 sein");
    expect(f).toContain("Plan-Slot 1: Feld position darf höchstens 3 sein");
    expect(f).toContain("Plan-Slot 2: Feld block muss einer der Werte „1“, „2“, „Z“ sein");
    expect(f).toContain("Plan 1: Feld status muss einer der Werte „aktiv“, „abgeschlossen“ sein");
  });

  it("lehnt ungültige Messwerte ab", () => {
    const roh = gueltigeDatei();
    const s = roh.daten.saetze;
    s[0]!.gewicht = 500.5;
    s[1]!.gewicht = -1;
    s[2]!.sekunden = 7201;
    s[3]!.meter = 0.5;
    const f = fehlerVon(roh);
    expect(f).toContain("Satz satz-000001: Feld gewicht darf höchstens 500 sein");
    expect(f).toContain("Satz satz-000002: Feld gewicht muss mindestens 0 sein");
    expect(f).toContain("Satz satz-000003: Feld sekunden darf höchstens 7200 sein");
    expect(f).toContain("Satz satz-000004: Feld meter muss mindestens 1 sein");
  });

  it("lehnt ungültige Satz-IDs und IDs von Zeilen ab", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze[0]!.id = "kurz";
    roh.daten.saetze[1]!.id = "leer zeichen!";
    roh.daten.plaene[0]!.id = 0;
    roh.daten.profile[0]!.id = 1.5;
    const f = fehlerVon(roh);
    expect(f).toContain(
      "Satz kurz: Feld id ist keine gültige Satz-ID (8 bis 64 Zeichen: Buchstaben, Ziffern, Bindestrich)",
    );
    expect(f).toContain("Plan 0: Feld id muss mindestens 1 sein");
    expect(f).toContain("Profil 1.5: Feld id muss eine ganze Zahl sein");
    expect(f).toHaveLength(4);
  });

  it("lehnt zu lange Notizen, leere Profilnamen und unpassende Gewichte ab", () => {
    const roh = gueltigeDatei();
    roh.daten.einheiten[0]!.notiz = "x".repeat(BACKUP_MAX_NOTIZ_ZEICHEN + 1);
    roh.daten.profile[0]!.name = "   ";
    roh.daten.profile[1]!.gewichte = { kurzhanteln: [0, 501], kettlebell: Array(101).fill(8) };
    const f = fehlerVon(roh);
    expect(f).toContain("Einheit 1: Feld notiz darf höchstens 2000 Zeichen lang sein");
    expect(f).toContain("Profil 1: Feld name darf nicht leer sein");
    expect(f).toContain("Profil 2: Feld gewichte.kurzhanteln (Eintrag 1) muss größer als 0 sein");
    expect(f).toContain("Profil 2: Feld gewichte.kurzhanteln (Eintrag 2) darf höchstens 500 sein");
    expect(f).toContain("Profil 2: Feld gewichte.kettlebell darf höchstens 100 Einträge haben");
  });

  it("lehnt unbekannte Equipment-Arten ab", () => {
    const roh = gueltigeDatei();
    (roh.daten.profile[0] as unknown as { equipment: string[] }).equipment = ["rudergeraet"];
    (roh.daten.profile[1]!.gewichte as Record<string, number[]>).hantelscheiben = [5];
    const f = fehlerVon(roh);
    expect(f).toHaveLength(2);
    expect(f[0]).toContain("Profil 1: Feld equipment (Eintrag 1) muss einer der Werte");
    expect(f[1]).toBe("Profil 2: Feld gewichte enthält unbekannte Schlüssel: hantelscheiben");
  });

  it("lehnt ungültige Schlüssel und Werte in ersetzungen ab", () => {
    const roh = gueltigeDatei();
    roh.daten.einheiten[0]!.ersetzungen = { abc: "KN-01" };
    expect(fehlerVon(roh)).toEqual([
      "Einheit 1: Feld ersetzungen hat Schlüssel, die keine Plan-Slot-IDs (positive ganze Zahlen) sind",
    ]);
    roh.daten.einheiten[0]!.ersetzungen = { "101": "" };
    expect(fehlerVon(roh)).toEqual(["Einheit 1: Feld ersetzungen.101 darf nicht leer sein"]);
  });

  it("meldet fehlende Felder und fehlende Tabellen", () => {
    const roh = gueltigeDatei() as unknown as { daten: Record<string, unknown> };
    delete (roh.daten.plaene as Record<string, unknown>[])[0]!.startDatum;
    delete roh.daten.saetze;
    delete roh.daten.einstellungen;
    const f = fehlerVon(roh);
    expect(f).toContain("Plan 1: Feld startDatum fehlt");
    expect(f).toContain("Sätze: fehlt");
    expect(f).toContain("Einstellungen fehlt");
  });

  it("verlangt bei Katalog-Backups nur Übungen", () => {
    const roh = katalogDatei();
    (roh.daten as unknown as Record<string, unknown>).uebungen = undefined;
    expect(fehlerVon(roh)).toEqual(["Übungen: fehlt"]);
  });

  it("prüft die Integrität erst nach erfolgreicher Schemaprüfung", () => {
    const roh = gueltigeDatei();
    roh.daten.plaene[0]!.profilId = 99; // Integritätsfehler
    roh.daten.saetze[0]!.wdh = 0; // Schemafehler
    expect(fehlerVon(roh)).toEqual(["Satz satz-000001: Feld wdh muss mindestens 1 sein"]);
  });

  it("sammelt mehrere Schemafehler, statt beim ersten abzubrechen", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze[0]!.wdh = 0;
    roh.daten.saetze[1]!.rpe = 11;
    roh.daten.plaene[0]!.startDatum = "kaputt";
    expect(fehlerVon(roh)).toHaveLength(3);
  });
});

describe("parseBackup: Grenzgrößen", () => {
  it("akzeptiert die äußersten gültigen Werte", () => {
    const roh = gueltigeDatei();
    const s = roh.daten.saetze;
    Object.assign(s[0]!, { gewicht: 500, wdh: 200, rpe: 10 });
    Object.assign(s[1]!, { gewicht: 0, wdh: 1, rpe: 1 });
    Object.assign(s[2]!, { wdh: null, sekunden: 7200, meter: null });
    Object.assign(s[3]!, { wdh: null, sekunden: null, meter: 5000 });
    roh.daten.einheiten[0]!.notiz = "x".repeat(BACKUP_MAX_NOTIZ_ZEICHEN);
    roh.daten.einheiten[0]!.woche = 6;
    roh.daten.plaene[0]!.stufen = stufen(5);
    roh.daten.plaene[0]!.einheitenProWoche = 3;
    roh.daten.einstellungen.stufen = stufen(1);
    roh.daten.profile[1]!.gewichte = {
      kurzhanteln: Array.from({ length: 100 }, (_, i) => (i + 1) * 5),
    };
    expect(parseBackup(roh).ok).toBe(true);
  });

  it("akzeptiert genau 50 Profile", () => {
    const roh = gueltigeDatei();
    roh.daten.profile = Array.from({ length: BACKUP_ZEILEN_LIMIT.profile }, (_, i) => ({
      id: i + 1,
      seedKey: null,
      name: `Profil ${i + 1}`,
      equipment: [],
      gewichte: {},
      istStandard: i === 0,
    }));
    roh.daten.plaene = [];
    roh.daten.planSlots = [];
    roh.daten.einheiten = [];
    roh.daten.saetze = [];
    expect(parseBackup(roh).ok).toBe(true);
  });

  it.each([
    ["uebungen", "Übungen", 500],
    ["profile", "Profile", 50],
    ["plaene", "Pläne", 200],
    ["planSlots", "Plan-Slots", 3200],
    ["einheiten", "Einheiten", 5000],
    ["saetze", "Sätze", 200_000],
  ] as const)("lehnt mehr als %s-Obergrenze ab (%s: höchstens %i)", (tabelle, name, limit) => {
    const roh = gueltigeDatei();
    const zeile = (roh.daten[tabelle] as unknown[])[0];
    (roh.daten as unknown as Record<string, unknown[]>)[tabelle] = Array.from(
      { length: limit + 1 },
      () => zeile,
    );
    expect(fehlerVon(roh)).toEqual([`${name}: darf höchstens ${limit} Einträge haben`]);
  });

  it("hält die Obergrenzen der Spezifikation ein", () => {
    expect(BACKUP_ZEILEN_LIMIT).toEqual({
      uebungen: 500,
      profile: 50,
      plaene: 200,
      slotsJePlan: 16,
      planSlots: 3200,
      einheiten: 5000,
      saetze: 200_000,
    });
    expect(SLOT_VORLAGE).toHaveLength(BACKUP_ZEILEN_LIMIT.slotsJePlan);
  });
});

describe("parseBackup: Meldungen kürzen", () => {
  const schlechteSaetze = (anzahl: number): AllesBackup => {
    const roh = gueltigeDatei();
    roh.daten.saetze = Array.from({ length: anzahl }, (_, i) => satz(i + 1, { wdh: 0 }));
    return roh;
  };

  it("liefert bei genau 10 Fehlern alle 10 ohne Hinweis", () => {
    const f = fehlerVon(schlechteSaetze(BACKUP_MAX_MELDUNGEN));
    expect(f).toHaveLength(10);
    expect(f.some((z) => z.startsWith("…"))).toBe(false);
  });

  it("kürzt bei 11 Fehlern auf 10 plus Hinweis im Singular", () => {
    const f = fehlerVon(schlechteSaetze(11));
    expect(f).toHaveLength(11);
    expect(f[10]).toBe("… und 1 weiterer Fehler");
  });

  it("kürzt bei 15 Fehlern auf 10 plus Hinweis", () => {
    const f = fehlerVon(schlechteSaetze(15));
    expect(f).toHaveLength(11);
    expect(f[0]).toBe("Satz satz-000001: Feld wdh muss mindestens 1 sein");
    expect(f[9]).toBe("Satz satz-000010: Feld wdh muss mindestens 1 sein");
    expect(f[10]).toBe("… und 5 weitere Fehler");
  });

  it("kürzt auch Integritätsfehler", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze = Array.from({ length: 14 }, (_, i) =>
      satz(i + 1, { planSlotId: null, exerciseId: "KN-99" }),
    );
    const f = fehlerVon(roh);
    expect(f).toHaveLength(11);
    expect(f[0]).toBe("Satz satz-000001: Übung KN-99 existiert nicht.");
    expect(f[10]).toBe("… und 4 weitere Fehler");
  });
});

describe("parseBackup: Integrität im Katalog", () => {
  const beide = (aendere: (daten: { uebungen: AllesDaten["uebungen"] }) => void) => [
    [
      "Katalog-Backup",
      () => {
        const r = katalogDatei();
        aendere(r.daten);
        return r;
      },
    ] as const,
    [
      "Gesamt-Backup",
      () => {
        const r = gueltigeDatei();
        aendere(r.daten);
        return r;
      },
    ] as const,
  ];

  it.each(
    beide((d) => {
      d.uebungen.push({ ...d.uebungen[0]! });
    }),
  )("meldet eine doppelte Übungs-ID (%s)", (_name, bauen) => {
    const id = katalog[0]!.id;
    expect(fehlerVon(bauen())).toEqual([`Übung ${id}: Die ID kommt mehrfach vor.`]);
  });

  it.each(
    beide((d) => {
      d.uebungen.find((u) => u.muster === "KN")!.schwererId = "KN-99";
    }),
  )("meldet einen fehlenden Leiter-Verweis (%s)", (_name, bauen) => {
    const id = erste("KN").id;
    expect(fehlerVon(bauen())).toEqual([
      `Übung ${id}: Feld schwererId verweist auf KN-99, die nicht existiert.`,
    ]);
  });

  it.each(
    beide((d) => {
      d.uebungen.find((u) => u.muster === "KN")!.leichterId = erste("HB").id;
    }),
  )("meldet einen Leiter-Verweis auf ein anderes Muster (%s)", (_name, bauen) => {
    expect(fehlerVon(bauen())).toEqual([
      `Übung ${erste("KN").id}: Feld leichterId verweist auf ${erste("HB").id} aus dem Muster HB, ` +
        "erwartet wurde KN.",
    ]);
  });

  it.each(
    beide((d) => {
      const u = d.uebungen.find((x) => x.muster === "KN")!;
      u.schwererId = u.id;
    }),
  )("meldet einen Leiter-Verweis auf sich selbst (%s)", (_name, bauen) => {
    expect(fehlerVon(bauen())).toEqual([
      `Übung ${erste("KN").id}: Feld schwererId verweist auf die Übung selbst.`,
    ]);
  });

  it("akzeptiert Leiter-Verweise innerhalb desselben Musters", () => {
    const roh = katalogDatei();
    roh.daten.uebungen.find((u) => u.muster === "KN")!.schwererId = zweite("KN").id;
    expect(parseBackup(roh).ok).toBe(true);
  });
});

describe("parseBackup: fehlende Verweise im Gesamt-Backup", () => {
  it("Plan: Profil fehlt", () => {
    const roh = gueltigeDatei();
    roh.daten.plaene[0]!.profilId = 9;
    expect(fehlerVon(roh)).toEqual(["Plan 1: Profil 9 existiert nicht."]);
  });

  it("Plan: Vorgänger fehlt oder ist der Plan selbst", () => {
    const roh = gueltigeDatei();
    roh.daten.plaene[0]!.vorgaengerId = 7;
    expect(fehlerVon(roh)).toEqual(["Plan 1: Vorgänger 7 existiert nicht."]);
    roh.daten.plaene[0]!.vorgaengerId = 1;
    expect(fehlerVon(roh)).toEqual(["Plan 1: Der Plan ist sein eigener Vorgänger."]);
    roh.daten.plaene[0]!.vorgaengerId = null;
    expect(parseBackup(roh).ok).toBe(true);
  });

  it("Plan-Slot: Plan oder Übung fehlt", () => {
    const roh = gueltigeDatei();
    roh.daten.planSlots[0]!.planId = 8;
    roh.daten.planSlots[1]!.exerciseId = "DH-99";
    const f = fehlerVon(roh);
    expect(f).toContain("Plan-Slot 1: Plan 8 existiert nicht.");
    expect(f).toContain("Plan-Slot 2: Übung DH-99 existiert nicht.");
  });

  it("Einheit: Plan oder Profil fehlt", () => {
    const roh = gueltigeDatei();
    roh.daten.einheiten[0]!.planId = 8;
    roh.daten.einheiten[1]!.profilId = 6;
    roh.daten.einheiten[0]!.ersetzungen = {};
    roh.daten.saetze[2]!.planSlotId = null;
    expect(fehlerVon(roh)).toEqual([
      "Einheit 1: Plan 8 existiert nicht.",
      "Einheit 2: Profil 6 existiert nicht.",
    ]);
  });

  it("Satz: Einheit, Plan-Slot oder Übung fehlt", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze[0]!.workoutId = 55;
    roh.daten.saetze[1]!.planSlotId = 999;
    roh.daten.saetze[2]!.exerciseId = "ZH-99";
    const f = fehlerVon(roh);
    expect(f).toContain("Satz satz-000001: Einheit 55 existiert nicht.");
    expect(f).toContain("Satz satz-000002: Plan-Slot 999 existiert nicht.");
    expect(f).toContain("Satz satz-000003: Übung ZH-99 existiert nicht.");
  });

  it("Satz ohne Plan-Slot (Ad-hoc) braucht keinen Slot", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze = [
      satz(1, { planSlotId: null }),
      satz(2, { planSlotId: null }), // gleiche Runde, aber ohne Slot kein „Schritt“
    ];
    expect(parseBackup(roh).ok).toBe(true);
  });

  it("Satz: Plan-Slot gehört zu einem anderen Plan als die Einheit", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze[0]!.planSlotId = 101; // Slot von Plan 2, Einheit 2 gehört zu Plan 1
    expect(fehlerVon(roh)).toEqual([
      "Satz satz-000001: Plan-Slot 101 gehört zu Plan 2, die Einheit 2 aber zu Plan 1.",
    ]);
  });
});

describe("parseBackup: Eindeutigkeit", () => {
  it("meldet doppelte IDs je Tabelle", () => {
    const roh = gueltigeDatei();
    roh.daten.plaene.push({ ...roh.daten.plaene[1]!, status: "abgeschlossen", vorgaengerId: null });
    roh.daten.planSlots.push({ ...roh.daten.planSlots[3]!, position: 3 });
    roh.daten.einheiten.push({ ...roh.daten.einheiten[0]!, status: "abgeschlossen" });
    roh.daten.saetze.push({ ...roh.daten.saetze[3]!, runde: 2 });
    const f = fehlerVon(roh);
    expect(f).toContain("Plan 2: Die ID kommt mehrfach vor.");
    expect(f).toContain("Plan-Slot 4: Die ID kommt mehrfach vor.");
    expect(f).toContain("Einheit 1: Die ID kommt mehrfach vor.");
    expect(f).toContain("Satz satz-000004: Die ID kommt mehrfach vor.");
  });

  it("meldet eine doppelte Profil-ID und einen doppelten seedKey", () => {
    const roh = gueltigeDatei();
    roh.daten.profile[1]!.id = 1;
    roh.daten.profile[1]!.seedKey = "studio";
    const f = fehlerVon(roh);
    expect(f).toContain("Profil 1: Die ID kommt mehrfach vor.");
    expect(f).toContain("Profil 1: seedKey „studio“ kommt mehrfach vor.");
  });

  it("erlaubt mehrere Profile ohne seedKey", () => {
    const roh = gueltigeDatei();
    roh.daten.profile.push({ ...roh.daten.profile[1]!, id: 3 });
    expect(parseBackup(roh).ok).toBe(true);
  });

  it("meldet zwei aktive Pläne", () => {
    const roh = gueltigeDatei();
    roh.daten.plaene[1]!.status = "aktiv";
    expect(fehlerVon(roh)).toEqual(["Pläne: Mehrere Pläne sind aktiv (1, 2), erlaubt ist einer."]);
  });

  it("erlaubt einen Datenstand ganz ohne aktiven Plan", () => {
    const roh = gueltigeDatei();
    roh.daten.plaene[0]!.status = "abgeschlossen";
    expect(parseBackup(roh).ok).toBe(true);
  });

  it("meldet zwei laufende Einheiten", () => {
    const roh = gueltigeDatei();
    roh.daten.einheiten[0]!.status = "laufend";
    expect(fehlerVon(roh)).toEqual([
      "Einheiten: Mehrere Einheiten laufen (1, 2), erlaubt ist eine.",
    ]);
  });

  it("verlangt genau ein Standardprofil, sobald Profile vorhanden sind", () => {
    const roh = gueltigeDatei();
    roh.daten.profile[1]!.istStandard = true;
    expect(fehlerVon(roh)).toEqual(["Profile: Mehrere Profile sind als Standard markiert (1, 2)."]);
    roh.daten.profile[0]!.istStandard = false;
    roh.daten.profile[1]!.istStandard = false;
    expect(fehlerVon(roh)).toEqual(["Profile: Kein Profil ist als Standard markiert."]);
  });

  it("meldet eine doppelt belegte Slot-Position im selben Plan", () => {
    const roh = gueltigeDatei();
    roh.daten.planSlots.push({ ...roh.daten.planSlots[0]!, id: 500 });
    expect(fehlerVon(roh)).toEqual([
      "Plan-Slot 500: Die Position A-1-1 ist in Plan 1 mehrfach belegt.",
    ]);
  });

  it("erlaubt dieselbe Slot-Position in verschiedenen Plänen", () => {
    expect(parseBackup(gueltigeDatei()).ok).toBe(true);
  });

  it("meldet mehrere Sätze für denselben Schritt", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze.push(satz(9)); // gleiche Einheit, gleicher Slot, gleiche Runde wie satz 1
    expect(fehlerVon(roh)).toEqual([
      "Satz satz-000009: Für Einheit 2, Plan-Slot 1 und Runde 1 gibt es mehrere Sätze.",
    ]);
  });

  it("erlaubt gleiche Runde in verschiedenen Slots und Einheiten", () => {
    const roh = gueltigeDatei();
    roh.daten.saetze.push(satz(9, { planSlotId: 2, exerciseId: erste("DH").id }));
    roh.daten.saetze.push(satz(10, { workoutId: 1, planSlotId: 1 + 100, runde: 2 }));
    expect(parseBackup(roh).ok).toBe(true);
  });
});

describe("parseBackup: Plan-Slots", () => {
  it("meldet ein Slot-Muster, das nicht zum Muster der Übung passt", () => {
    const roh = gueltigeDatei();
    roh.daten.planSlots[0]!.exerciseId = erste("HB").id; // Slot 1 ist ein KN-Slot
    expect(fehlerVon(roh)).toEqual([
      `Plan-Slot 1: Muster KN passt nicht zur Übung ${erste("HB").id} (Muster HB).`,
    ]);
  });

  it("meldet eine Position, die es in keinem Plan gibt", () => {
    const roh = gueltigeDatei();
    // Block Z hat nur zwei Positionen
    Object.assign(roh.daten.planSlots[0]!, { einheit: "A", block: "Z", position: 3 });
    const f = fehlerVon(roh);
    expect(f).toContain("Plan-Slot 1: Die Position A-Z-3 gibt es in keinem Plan.");
  });

  it("meldet ein Slot-Muster, das nicht zur Vorlage der Position passt", () => {
    const roh = gueltigeDatei();
    const slot = roh.daten.planSlots[0]!; // A-1-1 ist KN
    slot.muster = "HB";
    slot.exerciseId = erste("HB").id;
    expect(fehlerVon(roh)).toEqual([
      "Plan-Slot 1: Muster HB passt nicht zur Position A-1-1 (Muster KN).",
    ]);
  });
});

describe("parseBackup: Ersetzungen", () => {
  it("meldet einen Slot, der nicht zum Plan der Einheit gehört", () => {
    const roh = gueltigeDatei();
    roh.daten.einheiten[1]!.ersetzungen = { "101": zweite("KN").id }; // Slot von Plan 2
    expect(fehlerVon(roh)).toEqual([
      "Einheit 2: Die Ersetzung für Slot 101 gehört nicht zu Plan 1.",
    ]);
  });

  it("meldet einen Slot, den es nicht gibt", () => {
    const roh = gueltigeDatei();
    roh.daten.einheiten[1]!.ersetzungen = { "4711": zweite("KN").id };
    expect(fehlerVon(roh)).toEqual([
      "Einheit 2: Die Ersetzung für Slot 4711 gehört nicht zu Plan 1.",
    ]);
  });

  it("meldet eine Ersatzübung, die es nicht gibt", () => {
    const roh = gueltigeDatei();
    roh.daten.einheiten[1]!.ersetzungen = { "1": "KN-99" };
    expect(fehlerVon(roh)).toEqual([
      "Einheit 2: Die Ersetzung für Slot 1 nennt Übung KN-99, die nicht existiert.",
    ]);
  });

  it("akzeptiert Ersetzungen für Slots des eigenen Plans", () => {
    const roh = gueltigeDatei();
    roh.daten.einheiten[1]!.ersetzungen = { "1": zweite("KN").id, "4": zweite("HB").id };
    expect(parseBackup(roh).ok).toBe(true);
  });
});

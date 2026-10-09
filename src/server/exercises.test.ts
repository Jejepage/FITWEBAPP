import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { exercise } from "@/db/schema";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { exerciseZuFormWerte, leereFormWerte } from "@/domain/exercise-form";
import { testProfile } from "@/domain/test-katalog";
import { istStandardYoutubeUrl } from "@/domain/youtube";
import {
  alleUebungen,
  createExercise,
  getExercise,
  getLadder,
  leiterKandidaten,
  listExercises,
  setAktiv,
  setPruefstatus,
  updateExercise,
} from "./exercises";

let db: Db;
beforeEach(() => {
  db = neueSeedDb();
});

const ids = (l: { id: string }[]) => l.map((e) => e.id);
const equipmentVon = (key: string) => testProfile.find((p) => p.seedKey === key)!.equipment;

describe("listExercises", () => {
  it("liefert alle 63 sortiert nach Muster, Stufe, ID", () => {
    const { items, gesamt } = listExercises(db);
    expect(items).toHaveLength(63);
    expect(gesamt).toBe(63);
    expect(ids(items).slice(0, 3)).toEqual(["KN-01", "KN-02", "KN-03"]);
    expect(items.at(-1)!.id).toBe("RU-08");
  });

  it("filtert nach Muster, Stufe und einseitig", () => {
    expect(ids(listExercises(db, { muster: "ZV" }).items)).toEqual([
      "ZV-01",
      "ZV-02",
      "ZV-03",
      "ZV-04",
      "ZV-05",
      "ZV-06",
      "ZV-07",
    ]);
    expect(ids(listExercises(db, { muster: "KN", stufe: 3 }).items)).toEqual([
      "KN-05",
      "KN-06",
    ]);
    const einseitig = listExercises(db, {
      muster: "RU",
      einseitig: true,
    }).items;
    expect(ids(einseitig)).toEqual(["RU-02", "RU-04", "RU-05", "RU-08"]);
    expect(
      listExercises(db, { muster: "RU", einseitig: false }).items.every(
        (e) => !e.einseitig,
      ),
    ).toBe(true);
  });

  it("filtert nach Ersatzübungen; der Seed kennzeichnet reines Körpergewicht und Band", () => {
    const ersatz = ids(listExercises(db, { ersatz: true }).items);
    expect(ersatz).toContain("DH-04"); // Liegestütz
    expect(ersatz).toContain("ZH-02"); // Rudern mit Band
    expect(ersatz).toContain("RU-03"); // Plank
    // beladbar mit Kurzhanteln: bleibt Planübung
    expect(ersatz).not.toContain("KN-05");
    expect(ersatz).not.toContain("HB-09");
    // braucht ein Gerät
    expect(ersatz).not.toContain("KN-04");
    const plan = ids(listExercises(db, { ersatz: false }).items);
    expect(plan).toContain("KN-04");
    expect(ersatz.length + plan.length).toBe(63);
  });

  it("Equipment 'nur Stange' liefert genau die machbaren Übungen", () => {
    const { items } = listExercises(db, { machbarMit: equipmentVon("unterwegs") });
    const nach = (m: string) => ids(items.filter((e) => e.muster === m));
    expect(nach("ZH")).toEqual(["ZH-08", "ZH-07"]);
    expect(nach("KN")).toEqual(["KN-01", "KN-03", "KN-05", "KN-06", "KN-07"]);
    // ZV-07: Zusatzgewicht kommt in den Rucksack (Alltagsgegenstand)
    expect(nach("ZV")).toEqual(["ZV-02", "ZV-04", "ZV-05", "ZV-06", "ZV-07"]);
    expect(nach("TR")).toEqual(["TR-01", "TR-03", "TR-07"]);
    expect(
      items.every((e) => e.equipment.flat().every((a) => a === "stange")),
    ).toBe(true);
  });

  it("Equipment 'alles' erfüllt jede Übung", () => {
    expect(listExercises(db, { machbarMit: equipmentVon("studio") }).items).toHaveLength(63);
  });

  it("blendet inaktive Übungen standardmäßig aus", () => {
    setAktiv(db, "KN-03", false);
    expect(ids(listExercises(db, { muster: "KN" }).items)).not.toContain(
      "KN-03",
    );
    expect(listExercises(db).gesamt).toBe(62);
    const mit = listExercises(db, { muster: "KN", inaktive: true });
    expect(ids(mit.items)).toContain("KN-03");
    expect(mit.gesamt).toBe(63);
  });

  it("filtert nach Prüfstatus", () => {
    setPruefstatus(db, "KN-01", "geprueft");
    const offen = listExercises(db, { nurZuPruefen: true }).items;
    expect(offen).toHaveLength(62);
    expect(ids(offen)).not.toContain("KN-01");
  });

  it("kombiniert Filter", () => {
    const r = listExercises(db, {
      muster: "DH",
      machbarMit: equipmentVon("zuhause"),
      stufe: 2,
    });
    expect(ids(r.items)).toEqual(["DH-03", "DH-05"]);
  });
});

describe("listExercises: Filter der Tabelle", () => {
  const LINK = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

  it("Suche in Name und ID, ohne Groß-/Kleinschreibung", () => {
    const nachName = listExercises(db, { q: "KLIMMZUG" }).items;
    expect(nachName.length).toBeGreaterThan(0);
    expect(
      nachName.every((e) => e.name.toLowerCase().includes("klimmzug")),
    ).toBe(true);
    expect(ids(listExercises(db, { q: "kn-03" }).items)).toEqual(["KN-03"]);
    expect(listExercises(db, { q: "gibt es nicht" }).items).toHaveLength(0);
  });

  it("Gerät: nur Übungen, die es in irgendeiner Gruppe verlangen", () => {
    const r = listExercises(db, { geraet: "stange" }).items;
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.equipment.some((g) => g.includes("stange")))).toBe(
      true,
    );
    expect(
      listExercises(db, { geraet: "kurzhanteln" }).items.length,
    ).toBeGreaterThan(0);
  });

  it("Belastungsart", () => {
    const zeit = listExercises(db, { belastungsart: "zeit" }).items;
    expect(zeit.length).toBeGreaterThan(0);
    expect(zeit.every((e) => e.belastungsart === "zeit")).toBe(true);
  });

  it("Status und nurZuPruefen verhalten sich gleich", () => {
    setPruefstatus(db, "KN-02", "geprueft");
    expect(ids(listExercises(db, { pruefstatus: "geprueft" }).items)).toEqual([
      "KN-02",
    ]);
    expect(listExercises(db, { pruefstatus: "zu_pruefen" }).items).toHaveLength(
      62,
    );
    expect(listExercises(db, { nurZuPruefen: true }).items).toHaveLength(62);
  });

  it("nur inaktive und alle", () => {
    setAktiv(db, "KN-02", false);
    expect(ids(listExercises(db, { nurInaktive: true }).items)).toEqual([
      "KN-02",
    ]);
    expect(listExercises(db, { inaktive: true }).items).toHaveLength(63);
    expect(listExercises(db, {}).items).toHaveLength(62);
  });

  it("Video: mit und ohne", () => {
    // Der Seed bringt für jede Übung einen Link mit; hier nur KN-02 einen lassen.
    db.update(exercise).set({ videoUrl: null }).run();
    db.update(exercise)
      .set({ videoUrl: LINK })
      .where(eq(exercise.id, "KN-02"))
      .run();
    expect(ids(listExercises(db, { video: true }).items)).toEqual(["KN-02"]);
    expect(listExercises(db, { video: false }).items).toHaveLength(62);
  });

  it("Muskel: Teilstring in den Hauptmuskeln", () => {
    const r = listExercises(db, { muskel: "gesäß" }).items;
    expect(r.length).toBeGreaterThan(0);
    expect(
      r.every((e) =>
        e.hauptmuskeln.some((m) => m.toLowerCase().includes("gesäß")),
      ),
    ).toBe(true);
  });

  it("Filter lassen sich kombinieren", () => {
    const r = listExercises(db, {
      muster: "KN",
      stufe: 2,
      q: "kniebeuge",
    }).items;
    expect(r.every((e) => e.muster === "KN" && e.stufe === 2)).toBe(true);
  });
});

describe("getLadder / leiterKandidaten", () => {
  it("liefert die ganze Kette in Reihenfolge, egal von welchem Glied aus", () => {
    const soll = ["ZV-02", "ZV-04", "ZV-05", "ZV-06", "ZV-07"];
    for (const start of soll) expect(ids(getLadder(db, start))).toEqual(soll);
    expect(ids(getLadder(db, "KN-02"))).toEqual(["KN-02"]);
    expect(getLadder(db, "XX-00")).toEqual([]);
  });

  it("aktuelle Nachbarn sind auch dann Kandidaten, wenn ihre Stufe nicht passt", () => {
    const e = { ...getExercise(db, "KN-03")!, leichterId: "KN-02" }; // KN-02 hat dieselbe Stufe 2
    expect(ids(leiterKandidaten(db, e).leichter)).toContain("KN-02");
    expect(
      ids(leiterKandidaten(db, { ...e, leichterId: null }).leichter),
    ).not.toContain("KN-02");
  });

  it("Kandidaten stammen aus dem gleichen Muster mit passender Stufe", () => {
    const e = getExercise(db, "ZV-04")!;
    const { leichter, schwerer } = leiterKandidaten(db, e);
    expect(leichter.every((x) => x.muster === "ZV" && x.stufe < 2)).toBe(true);
    expect(schwerer.every((x) => x.muster === "ZV" && x.stufe > 2)).toBe(true);
    expect(ids(leichter)).toEqual(["ZV-01", "ZV-02"]);
  });
});

describe("createExercise", () => {
  const gueltig = () => ({
    ...leereFormWerte(),
    name: "Neue Kniebeuge",
    hauptmuskeln: ["Gesäß"],
    ausfuehrung: ["a", "b", "c"],
    fehler: ["x", "y"],
    hinweise: "Hinweis.",
  });

  it("übernimmt das Ersatz-Kennzeichen beim Anlegen und Bearbeiten", () => {
    const r = createExercise(db, "KN", { ...gueltig(), ersatz: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(getExercise(db, r.id)!.ersatz).toBe(true);
    const werte = exerciseZuFormWerte(getExercise(db, r.id)!);
    expect(updateExercise(db, r.id, { ...werte, ersatz: false }).ok).toBe(true);
    expect(getExercise(db, r.id)!.ersatz).toBe(false);
  });

  it("vergibt die nächste freie ID und speichert alles", () => {
    const r = createExercise(db, "KN", gueltig());
    expect(r).toEqual({ ok: true, id: "KN-09" });
    const e = getExercise(db, "KN-09")!;
    expect(e).toMatchObject({
      name: "Neue Kniebeuge",
      muster: "KN",
      aktiv: true,
      pruefstatus: "zu_pruefen",
      bild: null,
    });
    expect(e.leichterId).toBeNull();
    expect(alleUebungen(db)).toHaveLength(64);
  });

  it("ignoriert Leiter-Angaben beim Anlegen", () => {
    createExercise(db, "KN", {
      ...gueltig(),
      leichterId: "KN-01",
      schwererId: "KN-08",
    });
    expect(getExercise(db, "KN-01")!.schwererId).toBe("KN-03");
  });

  it("meldet Validierungsfehler und legt nichts an", () => {
    const r = createExercise(db, "KN", { ...gueltig(), name: "" });
    expect(r.ok).toBe(false);
    expect(alleUebungen(db)).toHaveLength(63);
  });
});

describe("updateExercise", () => {
  it("ändert Felder, lässt ID, Muster und Bild unberührt", () => {
    const e = getExercise(db, "KN-03")!;
    const r = updateExercise(db, "KN-03", {
      ...exerciseZuFormWerte(e),
      name: "Kniebeuge (geändert)",
      pruefstatus: "geprueft",
      equipment: [["kurzhanteln"], ["bank"]],
    });
    expect(r).toEqual({ ok: true, id: "KN-03" });
    const neu = getExercise(db, "KN-03")!;
    expect(neu).toMatchObject({
      name: "Kniebeuge (geändert)",
      pruefstatus: "geprueft",
      muster: "KN",
      bild: null,
    });
    expect(neu.equipment).toEqual([["kurzhanteln"], ["bank"]]);
  });

  it("meldet unbekannte Übung", () => {
    const r = updateExercise(db, "XX-00", leereFormWerte());
    expect(r.ok).toBe(false);
  });

  it("weist ungültige Eingaben ab und ändert nichts", () => {
    const e = getExercise(db, "KN-03")!;
    const r = updateExercise(db, "KN-03", {
      ...exerciseZuFormWerte(e),
      standardBereich: "12–8",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler.standardBereich).toBeDefined();
    expect(getExercise(db, "KN-03")!.standardBereich).toBe(e.standardBereich);
  });

  describe("Stufenleiter", () => {
    const mitLeiter = (id: string, l: string | null, s: string | null) => ({
      ...exerciseZuFormWerte(getExercise(db, id)!),
      leichterId: l,
      schwererId: s,
    });
    /** Alle Gegenverweise der DB müssen konsistent sein. */
    const konsistent = () => {
      const alle = new Map(alleUebungen(db).map((e) => [e.id, e]));
      for (const e of alle.values()) {
        if (e.schwererId)
          expect(alle.get(e.schwererId)!.leichterId, `${e.id}→`).toBe(e.id);
        if (e.leichterId)
          expect(alle.get(e.leichterId)!.schwererId, `←${e.id}`).toBe(e.id);
      }
    };

    it("Nachbar setzen setzt den Gegenverweis", () => {
      // KN-02 (Stufe 2) steht allein; KN-08 (Stufe 4) auch.
      expect(
        updateExercise(db, "KN-02", mitLeiter("KN-02", null, "KN-08")).ok,
      ).toBe(true);
      expect(getExercise(db, "KN-08")!.leichterId).toBe("KN-02");
      konsistent();
    });

    it("Nachbar entfernen löscht auch den Gegenverweis", () => {
      expect(
        updateExercise(db, "KN-05", mitLeiter("KN-05", "KN-03", null)).ok,
      ).toBe(true);
      expect(getExercise(db, "KN-07")!.leichterId).toBeNull();
      expect(getExercise(db, "KN-05")!.schwererId).toBeNull();
      expect(ids(getLadder(db, "KN-01"))).toEqual(["KN-01", "KN-03", "KN-05"]);
      konsistent();
    });

    it("Einfügen zwischen zwei Gliedern ergibt eine saubere Kette (KN-02 zwischen KN-01 und KN-03)", () => {
      // KN-02 hat Stufe 2 wie KN-03: braucht Stufe 1 < 2 < 3 → KN-03 Stufe 2 geht nicht.
      const r = updateExercise(
        db,
        "KN-02",
        mitLeiter("KN-02", "KN-01", "KN-03"),
      );
      expect(r.ok).toBe(false);
      // Mit KN-05 (Stufe 3) als schwererer Übung geht es: KN-01 → KN-02 → KN-05.
      expect(
        updateExercise(db, "KN-02", mitLeiter("KN-02", "KN-01", "KN-05")).ok,
      ).toBe(true);
      expect(getExercise(db, "KN-01")!.schwererId).toBe("KN-02");
      expect(getExercise(db, "KN-05")!.leichterId).toBe("KN-02");
      expect(getExercise(db, "KN-03")!.schwererId).toBeNull(); // verdrängt
      expect(getExercise(db, "KN-03")!.leichterId).toBeNull();
      konsistent();
    });

    it("Einfügen zwischen unmittelbaren Nachbarn überschreibt sich nicht (L→S wird L→A→S)", () => {
      // ZV-02(1) → ZV-04(2) → ZV-05(3). Neue Übung A (Stufe 2) zwischen ZV-02 und ZV-05.
      const neu = createExercise(db, "ZV", {
        ...leereFormWerte(),
        name: "Neu",
        stufe: 2,
        hauptmuskeln: ["Latissimus"],
        ausfuehrung: ["a", "b", "c"],
        fehler: ["x", "y"],
        hinweise: "h",
      });
      expect(neu.ok).toBe(true);
      const id = (neu as { id: string }).id;
      expect(updateExercise(db, id, mitLeiter(id, "ZV-02", "ZV-05")).ok).toBe(
        true,
      );
      expect(ids(getLadder(db, "ZV-06"))).toEqual([
        "ZV-02",
        id,
        "ZV-05",
        "ZV-06",
        "ZV-07",
      ]);
      konsistent();
    });

    it("ein hängender Nachbarverweis blockiert das Speichern nicht", () => {
      db.update(exercise)
        .set({ schwererId: "KN-99" })
        .where(eq(exercise.id, "KN-02"))
        .run();
      expect(
        updateExercise(db, "KN-02", mitLeiter("KN-02", null, null)).ok,
      ).toBe(true);
      expect(getExercise(db, "KN-02")!.schwererId).toBeNull();
    });

    it("weist Stufenverstöße, falsches Muster und Selbstverweis ab", () => {
      const f1 = updateExercise(db, "KN-03", mitLeiter("KN-03", "KN-05", null)); // leichter mit höherer Stufe
      expect(f1.ok === false && f1.fehler.leichterId).toBeTruthy();
      const f2 = updateExercise(db, "KN-03", mitLeiter("KN-03", null, "HB-06"));
      expect(f2.ok === false && f2.fehler.schwererId).toMatch(/Muster/);
      const f3 = updateExercise(db, "KN-03", mitLeiter("KN-03", "KN-03", null));
      expect(f3.ok === false && f3.fehler.leichterId).toBeTruthy();
      konsistent();
      expect(getExercise(db, "KN-03")!.leichterId).toBe("KN-01"); // unverändert
    });

    it("eine Stufenänderung, die bestehende Nachbarn verletzt, wird abgelehnt", () => {
      const e = mitLeiter("KN-03", "KN-01", "KN-05");
      const r = updateExercise(db, "KN-03", { ...e, stufe: 4 }); // KN-05 hat Stufe 3
      expect(r.ok).toBe(false);
      expect(getExercise(db, "KN-03")!.stufe).toBe(2);
    });
  });
});

describe("YouTube-Link", () => {
  const LINK = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const neueWerte = (videoUrl: string) => ({
    ...leereFormWerte(),
    name: "Mit Video",
    hauptmuskeln: ["Gesäß"],
    ausfuehrung: ["a", "b", "c"],
    fehler: ["x", "y"],
    hinweise: "Hinweis.",
    videoUrl,
  });

  it("alle Seed-Übungen starten mit Link in Standardform", () => {
    expect(
      alleUebungen(db).every(
        (e) => e.videoUrl !== null && istStandardYoutubeUrl(e.videoUrl),
      ),
    ).toBe(true);
  });

  it("Anlegen speichert die Standardform, auch aus einer anderen Schreibweise", () => {
    const r = createExercise(
      db,
      "KN",
      neueWerte("https://youtu.be/dQw4w9WgXcQ?si=abc"),
    );
    expect(r.ok).toBe(true);
    expect(getExercise(db, "KN-09")!.videoUrl).toBe(LINK);
  });

  it("Anlegen ohne Link: null", () => {
    createExercise(db, "KN", neueWerte(""));
    expect(getExercise(db, "KN-09")!.videoUrl).toBeNull();
  });

  it("Ändern setzt, ersetzt und entfernt den Link", () => {
    const e = getExercise(db, "KN-03")!;
    const werte = exerciseZuFormWerte(e);
    expect(
      updateExercise(db, "KN-03", {
        ...werte,
        videoUrl: "youtu.be/dQw4w9WgXcQ?t=30",
      }).ok,
    ).toBe(true);
    expect(getExercise(db, "KN-03")!.videoUrl).toBe(`${LINK}&t=30s`);
    expect(
      updateExercise(db, "KN-03", {
        ...werte,
        videoUrl: "https://youtu.be/abcdefghijk",
      }).ok,
    ).toBe(true);
    expect(getExercise(db, "KN-03")!.videoUrl).toBe(
      "https://www.youtube.com/watch?v=abcdefghijk",
    );
    expect(updateExercise(db, "KN-03", { ...werte, videoUrl: "" }).ok).toBe(
      true,
    );
    expect(getExercise(db, "KN-03")!.videoUrl).toBeNull();
  });

  it("ungültiger Link: Fehler am Feld, nichts wird geändert", () => {
    const werte = exerciseZuFormWerte(getExercise(db, "KN-03")!);
    updateExercise(db, "KN-03", { ...werte, videoUrl: LINK });
    const r = updateExercise(db, "KN-03", {
      ...werte,
      name: "Neu",
      videoUrl: "https://evil.example/x",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler.videoUrl).toContain("YouTube-Link");
    expect(getExercise(db, "KN-03")).toMatchObject({
      videoUrl: LINK,
      name: werte.name,
    });
  });

  it("Bearbeiten anderer Felder lässt einen vorhandenen Link stehen", () => {
    const werte = exerciseZuFormWerte(getExercise(db, "KN-03")!);
    updateExercise(db, "KN-03", { ...werte, videoUrl: LINK });
    // Formular wird mit dem gespeicherten Link vorbelegt und unverändert abgeschickt
    const nochmal = exerciseZuFormWerte(getExercise(db, "KN-03")!);
    expect(nochmal.videoUrl).toBe(LINK);
    expect(
      updateExercise(db, "KN-03", { ...nochmal, hinweise: "Neuer Hinweis." })
        .ok,
    ).toBe(true);
    expect(getExercise(db, "KN-03")!.videoUrl).toBe(LINK);
  });
});

describe("setAktiv / setPruefstatus", () => {
  it("ändern genau eine Übung und melden unbekannte IDs", () => {
    expect(setAktiv(db, "KN-01", false)).toBe(true);
    expect(getExercise(db, "KN-01")!.aktiv).toBe(false);
    expect(getExercise(db, "KN-02")!.aktiv).toBe(true);
    expect(setPruefstatus(db, "XX-00", "geprueft")).toBe(false);
  });
});

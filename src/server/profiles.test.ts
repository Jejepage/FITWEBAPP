import { beforeEach, describe, expect, it } from "vitest";
import { equipmentProfile, plan, workout } from "@/db/schema";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { zaehleMachbar } from "@/domain/equipment";
import type { ProfilDaten } from "@/domain/profile-form";
import { MUSTER } from "@/domain/types";
import { alleUebungen } from "./exercises";
import {
  createProfile,
  deleteProfile,
  getProfile,
  getStandardProfil,
  listProfiles,
  updateProfile,
} from "./profiles";

let db: Db;
beforeEach(() => {
  db = neueSeedDb();
});

const daten = (o: Partial<ProfilDaten> = {}): ProfilDaten => ({
  name: "Garage",
  equipment: ["kurzhanteln", "bank"],
  gewichte: { kurzhanteln: [10, 20] },
  istStandard: false,
  ...o,
});
const standards = () => listProfiles(db).filter((p) => p.istStandard);
const idVon = (key: string) => listProfiles(db).find((p) => p.seedKey === key)!.id;

describe("Standardprofile (Machbarkeit)", () => {
  const uebungen = () => alleUebungen(db);
  const equipment = (key: string) => listProfiles(db).find((p) => p.seedKey === key)!.equipment;

  it("Studio: jedes Muster voll besetzt (63 Übungen)", () => {
    const z = zaehleMachbar(uebungen(), equipment("studio"));
    expect(Object.values(z).reduce((a, b) => a + b, 0)).toBe(63);
  });

  it("Unterwegs: genau die Körpergewichts- und Stangenübungen, jedes Muster hat mindestens eine", () => {
    const z = zaehleMachbar(uebungen(), equipment("unterwegs"));
    expect(z).toEqual({ KN: 5, HB: 4, DH: 3, DV: 3, ZH: 2, ZV: 5, TR: 3, RU: 6 });
    expect(MUSTER.every((m) => z[m] > 0)).toBe(true);
  });

  it("Zuhause: ohne Maschinen, Langhantel und Band", () => {
    // Von Hand aus der Spec nachgerechnet (Kurzhanteln, Kettlebell, Bank, Stange):
    // KN ohne KN-02/08, HB ohne HB-02/08, DH ohne DH-01/06, DV ohne DV-01/02, ZH ohne ZH-01/02,
    // ZV ohne ZV-01/03, TR vollständig, RU ohne RU-05.
    const z = zaehleMachbar(uebungen(), equipment("zuhause"));
    expect(z).toEqual({ KN: 6, HB: 8, DH: 5, DV: 6, ZH: 6, ZV: 5, TR: 7, RU: 7 });
  });
});

describe("createProfile", () => {
  it("legt ein Profil an; es wird nicht Standard, wenn nicht verlangt", () => {
    const r = createProfile(db, daten());
    expect(r.ok).toBe(true);
    expect(listProfiles(db)).toHaveLength(4);
    expect(standards().map((p) => p.seedKey)).toEqual(["studio"]);
    expect(getProfile(db, (r as { id: number }).id)).toMatchObject({
      name: "Garage",
      gewichte: { kurzhanteln: [10, 20] },
    });
  });

  it("als Standard anlegen: genau ein Standard bleibt", () => {
    const r = createProfile(db, daten({ istStandard: true }));
    expect(standards()).toHaveLength(1);
    expect(standards()[0]!.id).toBe((r as { id: number }).id);
  });
});

describe("eindeutige Namen", () => {
  it("lehnt doppelte Namen ab, ohne Rücksicht auf Groß-/Kleinschreibung und Leerzeichen", () => {
    const r = createProfile(db, daten({ name: " studio " }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler.name).toMatch(/schon/);
    expect(listProfiles(db)).toHaveLength(3);
    const u = updateProfile(db, idVon("zuhause"), daten({ name: "UNTERWEGS" }));
    expect(u.ok).toBe(false);
  });

  it("ein Profil darf seinen eigenen Namen behalten", () => {
    expect(updateProfile(db, idVon("studio"), daten({ name: "Studio" })).ok).toBe(true);
  });
});

describe("updateProfile", () => {
  it("ändert Name, Equipment und Gewichte, behält den Seed-Schlüssel", () => {
    const id = idVon("zuhause");
    expect(
      updateProfile(db, id, daten({ name: "Daheim", equipment: ["stange"], gewichte: {} })).ok,
    ).toBe(true);
    expect(getProfile(db, id)).toMatchObject({
      name: "Daheim",
      equipment: ["stange"],
      gewichte: {},
      seedKey: "zuhause",
    });
  });

  it("anderes Profil zum Standard machen verdrängt den alten", () => {
    const id = idVon("unterwegs");
    updateProfile(db, id, daten({ name: "Unterwegs", equipment: ["stange"], istStandard: true }));
    expect(standards().map((p) => p.seedKey)).toEqual(["unterwegs"]);
  });

  it("das Standardprofil bleibt Standard, auch wenn der Haken fehlt", () => {
    const id = idVon("studio");
    updateProfile(db, id, daten({ name: "Studio", istStandard: false }));
    expect(getProfile(db, id)!.istStandard).toBe(true);
    expect(standards()).toHaveLength(1);
  });

  it("meldet ein unbekanntes Profil", () => {
    expect(updateProfile(db, 9999, daten()).ok).toBe(false);
  });
});

describe("deleteProfile", () => {
  it("löscht ein unbenutztes Profil", () => {
    expect(deleteProfile(db, idVon("unterwegs")).ok).toBe(true);
    expect(listProfiles(db)).toHaveLength(2);
  });

  it("löschen des Standardprofils macht ein anderes zum Standard", () => {
    expect(deleteProfile(db, idVon("studio")).ok).toBe(true);
    expect(standards()).toHaveLength(1);
    expect(getStandardProfil(db)!.seedKey).toBe("zuhause");
  });

  it("das letzte Profil bleibt erhalten", () => {
    deleteProfile(db, idVon("unterwegs"));
    deleteProfile(db, idVon("zuhause"));
    const r = deleteProfile(db, idVon("studio"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler._form).toMatch(/letzte/);
    expect(listProfiles(db)).toHaveLength(1);
  });

  it("ein von Plan oder Einheit benutztes Profil lässt sich nicht löschen", () => {
    const id = idVon("zuhause");
    const stufen = Object.fromEntries(MUSTER.map((m) => [m, 2])) as Record<
      (typeof MUSTER)[number],
      number
    >;
    const p = db
      .insert(plan)
      .values({
        profilId: id,
        startDatum: "2026-10-07",
        einheitenProWoche: 2,
        zusatzblock: false,
        stufen,
        status: "aktiv",
      })
      .returning({ id: plan.id })
      .get();
    const r = deleteProfile(db, id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler._form).toMatch(/verwendet/);
    expect(getProfile(db, id)).not.toBeNull();

    // auch ein Profil, das nur in einer (z. B. Ad-hoc-)Einheit vorkommt
    const unterwegs = idVon("unterwegs");
    db.insert(workout)
      .values({
        planId: p.id,
        datum: "2026-10-08",
        einheit: "A",
        woche: 1,
        profilId: unterwegs,
        adHoc: true,
        zusatzblock: false,
        status: "abgeschlossen",
      })
      .run();
    expect(deleteProfile(db, unterwegs).ok).toBe(false);
  });

  it("meldet ein unbekanntes Profil", () => {
    expect(deleteProfile(db, 9999).ok).toBe(false);
  });
});

describe("getStandardProfil", () => {
  it("fällt auf das erste Profil zurück, wenn keins als Standard markiert ist", () => {
    updateProfile(db, idVon("studio"), daten({ name: "Studio" })); // bleibt Standard
    // Manueller Eingriff: Standard-Markierung entfernen
    db.update(equipmentProfile).set({ istStandard: false }).run();
    expect(getStandardProfil(db)!.seedKey).toBe("studio");
  });
});

// Export und Import aller Daten (Spec F8). Der Import prüft die Datei vollständig (domain/backup.ts),
// bevor er schreibt, und läuft in einer Transaktion: eine falsche Datei ändert nichts.
import { eq } from "drizzle-orm";
import { exercise, plan, planSlot, setLog, settings, workout } from "@/db/schema";
import type { Db } from "@/db/types";
import { parseBackup } from "@/domain/backup";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type AllesDaten,
  type BackupArt,
  type BackupDatei,
  type KatalogDaten,
} from "@/domain/backup-types";
import { zuExercise } from "./exercises";

export interface Bilanz {
  uebungen: number;
  /** Nur Katalogimport: davon neu angelegt */
  neu?: number;
  plaene?: number;
  einheiten?: number;
  saetze?: number;
}

export type ImportErgebnis = { ok: true; bilanz: Bilanz } | { ok: false; fehler: string[] };

const nachId = <T extends { id: number | string }>(a: T, b: T): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

function katalogDaten(db: Db): KatalogDaten {
  return { uebungen: db.select().from(exercise).all().map(zuExercise).sort(nachId) };
}

function allesDaten(db: Db): AllesDaten {
  const einstellungen = db.select().from(settings).where(eq(settings.id, 1)).get();
  return {
    ...katalogDaten(db),
    einstellungen: einstellungen
      ? {
          stufen: einstellungen.stufen,
          einheitenProWoche: einstellungen.einheitenProWoche,
          zusatzblock: einstellungen.zusatzblock,
          aufwaermenText: einstellungen.aufwaermenText,
          hinweisAkzeptiertAm: einstellungen.hinweisAkzeptiertAm,
        }
      : {
          stufen: { KN: 2, HB: 2, DH: 2, DV: 2, ZH: 2, ZV: 2, TR: 2, RU: 2 },
          einheitenProWoche: 2,
          zusatzblock: false,
          aufwaermenText: "",
          hinweisAkzeptiertAm: null,
        },
    plaene: db.select().from(plan).all().sort(nachId),
    planSlots: db.select().from(planSlot).all().sort(nachId),
    einheiten: db.select().from(workout).all().sort(nachId),
    saetze: db.select().from(setLog).all().sort(nachId),
  };
}

/** Alle Daten (`alles`) oder nur den Katalog (`katalog`) als Backup-Objekt. */
export function exportiere(db: Db, art: BackupArt, jetzt: Date = new Date()): BackupDatei {
  const kopf = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    erstelltAm: jetzt.toISOString(),
  } as const;
  return art === "alles"
    ? { ...kopf, art, daten: allesDaten(db) }
    : { ...kopf, art, daten: katalogDaten(db) };
}

/**
 * Katalogimport = Zusammenführen: Übungen gleicher ID werden aktualisiert, neue angelegt, nichts
 * wird gelöscht. Das Bewegungsmuster einer vorhandenen Übung darf sich nicht ändern, weil Pläne
 * darauf verweisen.
 */
export function importiereKatalog(db: Db, daten: KatalogDaten): ImportErgebnis {
  try {
    return katalogTransaktion(db, daten);
  } catch (e) {
    return { ok: false, fehler: [`Der Import ist fehlgeschlagen: ${(e as Error).message}`] };
  }
}

function katalogTransaktion(db: Db, daten: KatalogDaten): ImportErgebnis {
  return db.transaction((tx): ImportErgebnis => {
    const vorhanden = new Map(
      tx
        .select()
        .from(exercise)
        .all()
        .map((u) => [u.id, u]),
    );
    const fehler: string[] = [];
    for (const u of daten.uebungen) {
      const alt = vorhanden.get(u.id);
      if (alt && alt.muster !== u.muster) {
        fehler.push(
          `Übung ${u.id}: Das Bewegungsmuster ist ${u.muster}, im Bestand aber ${alt.muster}. Pläne verweisen darauf.`,
        );
      }
    }
    if (fehler.length > 0) return { ok: false, fehler: fehler.slice(0, 10) };

    let neu = 0;
    for (const u of daten.uebungen) {
      if (!vorhanden.has(u.id)) neu++;
      // Fehlt der Video-Link in der Datei (älteres Backup), bleibt ein vorhandener Link erhalten.
      const { videoUrl, ...rest } = u;
      tx.insert(exercise)
        .values({ ...rest, videoUrl: videoUrl ?? null })
        .onConflictDoUpdate({
          target: exercise.id,
          set: videoUrl === undefined ? rest : { ...rest, videoUrl },
        })
        .run();
    }
    return { ok: true, bilanz: { uebungen: daten.uebungen.length, neu } };
  });
}

/**
 * Vollimport = Ersetzen: Alle vorhandenen Daten werden in einer Transaktion durch den Inhalt der
 * Datei ersetzt, IDs bleiben erhalten. Bei jedem Fehler bleibt der alte Stand.
 */
export function importiereAlles(db: Db, daten: AllesDaten): ImportErgebnis {
  try {
    return db.transaction((tx): ImportErgebnis => {
      // Kindtabellen zuerst (Fremdschlüssel)
      tx.delete(setLog).run();
      tx.delete(workout).run();
      tx.delete(planSlot).run();
      tx.delete(plan).run();
      tx.delete(settings).run();
      tx.delete(exercise).run();

      for (const u of daten.uebungen) {
        tx.insert(exercise)
          .values({ ...u, videoUrl: u.videoUrl ?? null })
          .run();
      }
      tx.insert(settings)
        .values({ id: 1, ...daten.einstellungen })
        .run();
      // Pläne ohne Vorgänger einfügen, die Verweise danach setzen (Reihenfolge der IDs egal)
      for (const p of daten.plaene)
        tx.insert(plan)
          .values({ ...p, vorgaengerId: null })
          .run();
      for (const p of daten.plaene) {
        if (p.vorgaengerId !== null) {
          tx.update(plan).set({ vorgaengerId: p.vorgaengerId }).where(eq(plan.id, p.id)).run();
        }
      }
      for (const s of daten.planSlots) tx.insert(planSlot).values(s).run();
      for (const w of daten.einheiten) tx.insert(workout).values(w).run();
      for (const s of daten.saetze) tx.insert(setLog).values(s).run();

      return {
        ok: true,
        bilanz: {
          uebungen: daten.uebungen.length,
          plaene: daten.plaene.length,
          einheiten: daten.einheiten.length,
          saetze: daten.saetze.length,
        },
      };
    });
  } catch (e) {
    // Die Transaktion wurde zurückgerollt; der Bestand ist unverändert.
    return { ok: false, fehler: [`Der Import ist fehlgeschlagen: ${(e as Error).message}`] };
  }
}

/** Prüft die Rohdaten (JSON) und importiert sie je nach Art. */
export function importiereDatei(db: Db, roh: unknown, art: BackupArt): ImportErgebnis {
  const geprueft = parseBackup(roh, art);
  if (!geprueft.ok) return { ok: false, fehler: geprueft.fehler };
  const datei = geprueft.datei;
  return datei.art === "alles"
    ? importiereAlles(db, datei.daten)
    : importiereKatalog(db, datei.daten);
}

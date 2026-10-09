// Vertrag für Export und Import der Daten (Spec F8). Reine Typen und Konstanten; Schemas und
// Prüfung stehen in backup.ts, Datenbankzugriff in src/server/backup.ts.
import type { Block, Einheit, EquipmentArt, Exercise, Gewichte, Muster } from "./types";

export const BACKUP_FORMAT = "fit-backup";
/**
 * Version 2: Das Equipment steht im Plan (keine Profile mehr), Einheiten haben kein Profil und
 * kein Ad-hoc-Kennzeichen, Übungen haben das Ersatz-Kennzeichen. Version 1 wird nicht mehr gelesen.
 */
export const BACKUP_VERSION = 2;
/** Größte akzeptierte Importdatei */
export const BACKUP_MAX_BYTES = 20 * 1024 * 1024;

export type BackupArt = "alles" | "katalog";

/**
 * Übung im Backup. `videoUrl` darf fehlen (Backups aus der Zeit vor dem Video-Link): Beim
 * Katalogimport bedeutet "fehlt" = vorhandenen Link behalten, "null" = Link entfernen.
 */
export type BackupUebung = Omit<Exercise, "videoUrl"> & { videoUrl?: string | null };

export interface KatalogDaten {
  uebungen: BackupUebung[];
}

/** Zeilen der Tabellen, camelCase wie in Drizzle (src/db/schema.ts); Zeitstempel als ISO-Text. */
export interface EinstellungenZeile {
  stufen: Record<Muster, number>;
  einheitenProWoche: number;
  zusatzblock: boolean;
  aufwaermenText: string;
  hinweisAkzeptiertAm: string | null;
}

export interface PlanZeile {
  id: number;
  equipment: EquipmentArt[];
  gewichte: Gewichte;
  startDatum: string;
  einheitenProWoche: number;
  zusatzblock: boolean;
  stufen: Record<Muster, number>;
  status: "aktiv" | "abgeschlossen";
  vorgaengerId: number | null;
  erstelltAm: string;
}

export interface PlanSlotZeile {
  id: number;
  planId: number;
  einheit: Einheit;
  block: Block;
  position: number;
  muster: Muster;
  exerciseId: string;
}

export interface EinheitZeile {
  id: number;
  planId: number;
  datum: string;
  einheit: Einheit;
  woche: number;
  zusatzblock: boolean;
  status: "laufend" | "abgeschlossen" | "abgebrochen";
  /** { "<plan_slot_id>": "<exercise_id>" } */
  ersetzungen: Record<string, string>;
  notiz: string | null;
  gestartetAm: string;
  beendetAm: string | null;
}

export interface SatzZeile {
  id: string;
  workoutId: number;
  planSlotId: number | null;
  exerciseId: string;
  runde: number;
  gewicht: number | null;
  wdh: number | null;
  sekunden: number | null;
  meter: number | null;
  rpe: number | null;
  tempo: boolean;
  erledigt: boolean;
  erstelltAm: string;
}

export interface AllesDaten extends KatalogDaten {
  einstellungen: EinstellungenZeile;
  plaene: PlanZeile[];
  planSlots: PlanSlotZeile[];
  einheiten: EinheitZeile[];
  saetze: SatzZeile[];
}

export type BackupDatei =
  | {
      format: typeof BACKUP_FORMAT;
      version: number;
      art: "katalog";
      erstelltAm: string;
      daten: KatalogDaten;
    }
  | {
      format: typeof BACKUP_FORMAT;
      version: number;
      art: "alles";
      erstelltAm: string;
      daten: AllesDaten;
    };

export type ParseErgebnis = { ok: true; datei: BackupDatei } | { ok: false; fehler: string[] };

/** Signatur von parseBackup in backup.ts: `erwartet` verlangt eine bestimmte Art. */
export type ParseBackupFn = (roh: unknown, erwartet?: BackupArt) => ParseErgebnis;

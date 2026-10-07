import { eq } from "drizzle-orm";
import { exercise } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import { erfuellt } from "@/domain/equipment";
import { type ExerciseFormWerte, type FormFehler, validiereExercise } from "@/domain/exercise-form";
import {
  MUSTER,
  type EquipmentArt,
  type Exercise,
  type Muster,
  type Pruefstatus,
  type Stufe,
} from "@/domain/types";

type ExerciseRow = typeof exercise.$inferSelect;

function zuExercise(row: ExerciseRow): Exercise {
  return { ...row, stufe: row.stufe as Stufe };
}

function sortiert(liste: Exercise[]): Exercise[] {
  return [...liste].sort(
    (a, b) =>
      MUSTER.indexOf(a.muster) - MUSTER.indexOf(b.muster) ||
      a.stufe - b.stufe ||
      a.id.localeCompare(b.id),
  );
}

export interface KatalogFilter {
  muster?: Muster;
  stufe?: number;
  einseitig?: boolean;
  /** Nur Übungen, die mit diesem Equipment machbar sind. */
  profilEquipment?: readonly EquipmentArt[];
  /** Inaktive Übungen mit anzeigen (Standard: nein). */
  inaktive?: boolean;
  nurZuPruefen?: boolean;
}

export interface KatalogListe {
  items: Exercise[];
  /** Zahl der Übungen ohne Filter (inaktive nur, wenn sie angezeigt werden sollen). */
  gesamt: number;
}

export function alleUebungen(db: Db): Exercise[] {
  return sortiert(db.select().from(exercise).all().map(zuExercise));
}

export function listExercises(db: Db, filter: KatalogFilter = {}): KatalogListe {
  const basis = alleUebungen(db).filter((e) => filter.inaktive || e.aktiv);
  const items = basis.filter(
    (e) =>
      (!filter.muster || e.muster === filter.muster) &&
      (filter.stufe === undefined || e.stufe === filter.stufe) &&
      (filter.einseitig === undefined || e.einseitig === filter.einseitig) &&
      (!filter.profilEquipment || erfuellt(e.equipment, filter.profilEquipment)) &&
      (!filter.nurZuPruefen || e.pruefstatus === "zu_pruefen"),
  );
  return { items, gesamt: basis.length };
}

export function getExercise(db: Db, id: string): Exercise | null {
  const row = db.select().from(exercise).where(eq(exercise.id, id)).get();
  return row ? zuExercise(row) : null;
}

/** Komplette Stufenleiter durch `id`, vom leichtesten zum schwersten Glied. */
export function getLadder(db: Db, id: string): Exercise[] {
  const alle = new Map(alleUebungen(db).map((e) => [e.id, e]));
  const start = alle.get(id);
  if (!start) return [];
  const kette: Exercise[] = [start];
  const gesehen = new Set([id]); // Schutz gegen Zyklen in manipulierten Daten
  for (let n = start.leichterId; n && !gesehen.has(n); n = alle.get(n)?.leichterId ?? null) {
    const e = alle.get(n);
    if (!e) break;
    gesehen.add(n);
    kette.unshift(e);
  }
  for (let n = start.schwererId; n && !gesehen.has(n); n = alle.get(n)?.schwererId ?? null) {
    const e = alle.get(n);
    if (!e) break;
    gesehen.add(n);
    kette.push(e);
  }
  return kette;
}

/**
 * Kandidaten für die Auswahllisten "leichter"/"schwerer": gleiches Muster, passende Stufe.
 * Aktuell verknüpfte Nachbarn sind immer enthalten, damit die Auswahl sie anzeigen kann
 * und ein unveränderter Speichervorgang die Verknüpfung nicht stillschweigend löst.
 */
export function leiterKandidaten(
  db: Db,
  e: Pick<Exercise, "id" | "muster" | "stufe" | "leichterId" | "schwererId">,
): { leichter: Exercise[]; schwerer: Exercise[] } {
  const gleiche = alleUebungen(db).filter((x) => x.muster === e.muster && x.id !== e.id);
  return {
    leichter: gleiche.filter((x) => x.stufe < e.stufe || x.id === e.leichterId),
    schwerer: gleiche.filter((x) => x.stufe > e.stufe || x.id === e.schwererId),
  };
}

export type SpeicherErgebnis = { ok: true; id: string } | { ok: false; fehler: FormFehler };

export const MUSTER_FEHLER = "Bitte ein Bewegungsmuster wählen.";

const nichtGefunden: SpeicherErgebnis = { ok: false, fehler: { _form: "Übung nicht gefunden." } };

/** Regeln der Leiter: gleiches Muster, strikt steigende Stufen (macht Zyklen unmöglich). */
function pruefeLeiter(alle: Map<string, Exercise>, kandidat: Exercise): FormFehler {
  const fehler: FormFehler = {};
  const pruefe = (
    feld: "leichterId" | "schwererId",
    nachbarId: string | null,
    richtung: 1 | -1,
  ) => {
    if (!nachbarId) return;
    const n = alle.get(nachbarId);
    if (!n) fehler[feld] = "Übung nicht gefunden.";
    else if (n.id === kandidat.id) fehler[feld] = "Eine Übung kann nicht ihr eigener Nachbar sein.";
    else if (n.muster !== kandidat.muster)
      fehler[feld] = "Nachbar muss zum gleichen Muster gehören.";
    else if ((n.stufe - kandidat.stufe) * richtung <= 0)
      fehler[feld] =
        richtung === 1
          ? "Die schwerere Übung braucht eine höhere Stufe."
          : "Die leichtere Übung braucht eine niedrigere Stufe.";
  };
  pruefe("leichterId", kandidat.leichterId, -1);
  pruefe("schwererId", kandidat.schwererId, 1);
  return fehler;
}

/**
 * Setzt die Nachbarn von `id` und hält die Gegenverweise konsistent. Arbeitet auf einer Kopie
 * der Verweise, damit sich mehrere Umhängungen nicht gegenseitig überschreiben.
 */
function haengeLeiterUm(
  tx: Tx,
  alle: Map<string, Exercise>,
  id: string,
  neuL: string | null,
  neuS: string | null,
): void {
  type Verweise = { l: string | null; s: string | null };
  const links = new Map<string, Verweise>(
    Array.from(alle, ([k, e]) => [k, { l: e.leichterId, s: e.schwererId }]),
  );
  const vorher = new Map<string, Verweise>(Array.from(links, ([k, v]) => [k, { ...v }]));
  // Hängende Verweise (Zielzeile fehlt) dürfen das Speichern nicht blockieren: ins Leere schreiben.
  const l = (k: string): Verweise => links.get(k) ?? { l: null, s: null };

  const alt = l(id);
  if (alt.l && alt.l !== neuL) l(alt.l).s = null;
  if (alt.s && alt.s !== neuS) l(alt.s).l = null;
  if (neuL) {
    const verdraengt = l(neuL).s;
    if (verdraengt && verdraengt !== id) l(verdraengt).l = null;
    l(neuL).s = id;
  }
  if (neuS) {
    const verdraengt = l(neuS).l;
    if (verdraengt && verdraengt !== id) l(verdraengt).s = null;
    l(neuS).l = id;
  }
  l(id).l = neuL;
  l(id).s = neuS;

  for (const [k, v] of links) {
    const v0 = vorher.get(k)!;
    if (v.l !== v0.l || v.s !== v0.s) {
      tx.update(exercise).set({ leichterId: v.l, schwererId: v.s }).where(eq(exercise.id, k)).run();
    }
  }
}

function nextId(alle: Iterable<Exercise>, muster: Muster): string | null {
  let max = 0;
  for (const e of alle) {
    if (e.muster !== muster) continue;
    max = Math.max(max, Number(e.id.slice(3)));
  }
  return max >= 99 ? null : `${muster}-${String(max + 1).padStart(2, "0")}`;
}

export function createExercise(db: Db, muster: Muster, werte: ExerciseFormWerte): SpeicherErgebnis {
  if (!MUSTER.includes(muster)) return { ok: false, fehler: { muster: MUSTER_FEHLER } };
  return db.transaction((tx) => {
    const alle = tx.select().from(exercise).all().map(zuExercise);
    const id = nextId(alle, muster);
    if (!id) return { ok: false, fehler: { _form: "Für dieses Muster sind keine IDs mehr frei." } };
    // Beim Anlegen gibt es noch keine Leiter; sie wird danach über "Bearbeiten" gesetzt.
    const r = validiereExercise(
      { ...werte, leichterId: null, schwererId: null },
      { id, muster, bild: null },
    );
    if (!r.ok) return r;
    tx.insert(exercise).values(r.exercise).run();
    return { ok: true, id };
  });
}

export function updateExercise(db: Db, id: string, werte: ExerciseFormWerte): SpeicherErgebnis {
  return db.transaction((tx) => {
    const alle = new Map(
      tx
        .select()
        .from(exercise)
        .all()
        .map((r) => [r.id, zuExercise(r)]),
    );
    const aktuell = alle.get(id);
    if (!aktuell) return nichtGefunden;
    const r = validiereExercise(werte, { id, muster: aktuell.muster, bild: aktuell.bild });
    if (!r.ok) return r;
    const leiterFehler = pruefeLeiter(alle, r.exercise);
    if (Object.keys(leiterFehler).length > 0) return { ok: false, fehler: leiterFehler };

    const { leichterId, schwererId, ...rest } = r.exercise;
    tx.update(exercise).set(rest).where(eq(exercise.id, id)).run();
    haengeLeiterUm(tx, alle, id, leichterId, schwererId);
    return { ok: true, id };
  });
}

export function setAktiv(db: Db, id: string, aktiv: boolean): boolean {
  return db.update(exercise).set({ aktiv }).where(eq(exercise.id, id)).run().changes > 0;
}

export function setPruefstatus(db: Db, id: string, status: Pruefstatus): boolean {
  return (
    db.update(exercise).set({ pruefstatus: status }).where(eq(exercise.id, id)).run().changes > 0
  );
}

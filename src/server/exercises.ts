import { eq } from "drizzle-orm";
import { exercise } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import { erfuellt } from "@/domain/equipment";
import {
  type ExerciseFormWerte,
  type FormFehler,
  validiereExercise,
} from "@/domain/exercise-form";
import { videoLink } from "@/domain/youtube";
import {
  MUSTER,
  type Belastungsart,
  type EquipmentArt,
  type Exercise,
  type Muster,
  type Pruefstatus,
  type Stufe,
} from "@/domain/types";

type ExerciseRow = typeof exercise.$inferSelect;

export function zuExercise(row: ExerciseRow): Exercise {
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
  /** true = nur Ersatzübungen, false = nur Planübungen. */
  ersatz?: boolean;
  /** Nur Übungen, die mit diesem Equipment machbar sind. */
  machbarMit?: readonly EquipmentArt[];
  /** Inaktive Übungen mit anzeigen (Standard: nein). */
  inaktive?: boolean;
  /** Nur inaktive Übungen. */
  nurInaktive?: boolean;
  nurZuPruefen?: boolean;
  pruefstatus?: Pruefstatus;
  /** Teilstring in Name oder ID (Groß-/Kleinschreibung egal). */
  q?: string;
  /** Benötigt dieses Gerät . */
  geraet?: EquipmentArt;
  belastungsart?: Belastungsart;
  /** true = nur mit Video, false = nur ohne. */
  video?: boolean;
  /** Teilstring in einem der Hauptmuskeln. */
  muskel?: string;
}

export interface KatalogListe {
  items: Exercise[];
  /** Zahl der Übungen ohne Filter (inaktive nur, wenn sie angezeigt werden sollen). */
  gesamt: number;
}

export function alleUebungen(db: Db): Exercise[] {
  return sortiert(db.select().from(exercise).all().map(zuExercise));
}

const klein = (t: string): string => t.toLocaleLowerCase("de");

export function listExercises(
  db: Db,
  filter: KatalogFilter = {},
): KatalogListe {
  const basis = alleUebungen(db).filter(
    (e) =>
      (filter.inaktive || filter.nurInaktive || e.aktiv) &&
      (!filter.nurInaktive || !e.aktiv),
  );
  const q = filter.q ? klein(filter.q) : undefined;
  const muskel = filter.muskel ? klein(filter.muskel) : undefined;
  const items = basis.filter(
    (e) =>
      (!filter.muster || e.muster === filter.muster) &&
      (filter.stufe === undefined || e.stufe === filter.stufe) &&
      (filter.einseitig === undefined || e.einseitig === filter.einseitig) &&
      (filter.ersatz === undefined || e.ersatz === filter.ersatz) &&
      (!filter.machbarMit || erfuellt(e.equipment, filter.machbarMit)) &&
      (!filter.nurZuPruefen || e.pruefstatus === "zu_pruefen") &&
      (!filter.pruefstatus || e.pruefstatus === filter.pruefstatus) &&
      (!q || klein(e.name).includes(q) || klein(e.id).includes(q)) &&
      (!filter.geraet ||
        e.equipment.includes(filter.geraet as never)) &&
      (!filter.belastungsart || e.belastungsart === filter.belastungsart) &&
      (filter.video === undefined ||
        (videoLink(e.videoUrl) !== null) === filter.video) &&
      (!muskel || e.hauptmuskeln.some((m) => klein(m).includes(muskel))),
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
  for (
    let n = start.leichterId;
    n && !gesehen.has(n);
    n = alle.get(n)?.leichterId ?? null
  ) {
    const e = alle.get(n);
    if (!e) break;
    gesehen.add(n);
    kette.unshift(e);
  }
  for (
    let n = start.schwererId;
    n && !gesehen.has(n);
    n = alle.get(n)?.schwererId ?? null
  ) {
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
  const gleiche = alleUebungen(db).filter(
    (x) => x.muster === e.muster && x.id !== e.id,
  );
  return {
    leichter: gleiche.filter((x) => x.stufe < e.stufe || x.id === e.leichterId),
    schwerer: gleiche.filter((x) => x.stufe > e.stufe || x.id === e.schwererId),
  };
}

export type SpeicherErgebnis =
  | { ok: true; id: string }
  | { ok: false; fehler: FormFehler };

export const MUSTER_FEHLER = "Bitte ein Bewegungsmuster wählen.";

const nichtGefunden: SpeicherErgebnis = {
  ok: false,
  fehler: { _form: "Übung nicht gefunden." },
};

/** Regeln der Leiter: gleiches Muster, strikt steigende Stufen (macht Zyklen unmöglich). */
function pruefeLeiter(
  alle: Map<string, Exercise>,
  kandidat: Exercise,
): FormFehler {
  const fehler: FormFehler = {};
  const pruefe = (
    feld: "leichterId" | "schwererId",
    nachbarId: string | null,
    richtung: 1 | -1,
  ) => {
    if (!nachbarId) return;
    const n = alle.get(nachbarId);
    if (!n) fehler[feld] = "Übung nicht gefunden.";
    else if (n.id === kandidat.id)
      fehler[feld] = "Eine Übung kann nicht ihr eigener Nachbar sein.";
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
  const vorher = new Map<string, Verweise>(
    Array.from(links, ([k, v]) => [k, { ...v }]),
  );
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
      tx.update(exercise)
        .set({ leichterId: v.l, schwererId: v.s })
        .where(eq(exercise.id, k))
        .run();
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

export function createExercise(
  db: Db,
  muster: Muster,
  werte: ExerciseFormWerte,
): SpeicherErgebnis {
  if (!MUSTER.includes(muster))
    return { ok: false, fehler: { muster: MUSTER_FEHLER } };
  return db.transaction((tx) => {
    const alle = tx.select().from(exercise).all().map(zuExercise);
    const id = nextId(alle, muster);
    if (!id)
      return {
        ok: false,
        fehler: { _form: "Für dieses Muster sind keine IDs mehr frei." },
      };
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

export function updateExercise(
  db: Db,
  id: string,
  werte: ExerciseFormWerte,
): SpeicherErgebnis {
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
    const r = validiereExercise(werte, {
      id,
      muster: aktuell.muster,
      bild: aktuell.bild,
    });
    if (!r.ok) return r;
    const leiterFehler = pruefeLeiter(alle, r.exercise);
    if (Object.keys(leiterFehler).length > 0)
      return { ok: false, fehler: leiterFehler };

    const { leichterId, schwererId, ...rest } = r.exercise;
    tx.update(exercise).set(rest).where(eq(exercise.id, id)).run();
    haengeLeiterUm(tx, alle, id, leichterId, schwererId);
    return { ok: true, id };
  });
}

export function setAktiv(db: Db, id: string, aktiv: boolean): boolean {
  return (
    db.update(exercise).set({ aktiv }).where(eq(exercise.id, id)).run()
      .changes > 0
  );
}

export function setPruefstatus(
  db: Db,
  id: string,
  status: Pruefstatus,
): boolean {
  return (
    db
      .update(exercise)
      .set({ pruefstatus: status })
      .where(eq(exercise.id, id))
      .run().changes > 0
  );
}

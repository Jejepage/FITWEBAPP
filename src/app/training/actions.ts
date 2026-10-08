"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import type { UebungInfo } from "@/components/training/typen";
import { heuteIso } from "@/server/datum";
import { ladeUebungInfo } from "@/server/training-daten";
import {
  beendeWorkout,
  brecheWorkoutAb,
  ersetzeUebung,
  speichereSatz,
  startWorkout,
  type AbschlussErgebnis,
  type SatzErgebnis,
} from "@/server/workouts";

const aktualisiere = () => revalidatePath("/", "layout");
const istId = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;

/** Startseite: nächste Einheit starten (oder die laufende fortsetzen) und zum Training wechseln. */
export async function startTraining(fd: FormData): Promise<void> {
  const profilRoh = Number(fd.get("profil"));
  const profilId = Number.isInteger(profilRoh) && profilRoh > 0 ? profilRoh : undefined;
  const r = startWorkout(db, {
    heute: heuteIso(),
    // Abgeschicktes Formular ohne Haken heißt: kein Zusatzblock in dieser Einheit.
    zusatzblock: fd.get("zusatzblock") === "on",
    profilId,
  });
  if (!r.ok) {
    if (r.code === "profil_unbekannt" || r.code === "profil_unmoeglich") {
      const muster = r.code === "profil_unmoeglich" ? `&muster=${r.fehlendeMuster.join(",")}` : "";
      const block = fd.get("zusatzblock") === "on" ? "&zusatzblock=on" : "";
      redirect(
        `/training/start?gesendet=1&profil=${profilId ?? ""}${block}&fehler=${r.code}${muster}`,
      );
    }
    redirect(`/?fehler=${r.code}`);
  }
  aktualisiere();
  redirect(`/training/${r.id}`);
}

/** Speichert einen erledigten Satz; idempotent über die Client-UUID. */
export async function speichereSatzAktion(roh: unknown): Promise<SatzErgebnis> {
  return speichereSatz(db, roh);
}

export type ErsetzenAntwort = { ok: true; info: UebungInfo } | { ok: false; code: string };

export async function ersetzeUebungAktion(
  workoutId: number,
  planSlotId: number,
  exerciseId: string,
): Promise<ErsetzenAntwort> {
  if (!istId(workoutId) || !istId(planSlotId) || typeof exerciseId !== "string") {
    return { ok: false, code: "werte_ungueltig" };
  }
  const r = ersetzeUebung(db, workoutId, planSlotId, exerciseId);
  if (!r.ok) return { ok: false, code: r.code };
  const info = ladeUebungInfo(db, workoutId, exerciseId);
  return info ? { ok: true, info } : { ok: false, code: "uebung_ungueltig" };
}

export async function beendeTrainingAktion(
  workoutId: number,
  notiz: string,
): Promise<AbschlussErgebnis> {
  if (!istId(workoutId)) return { ok: false, code: "workout_unbekannt" };
  const r = beendeWorkout(db, workoutId, typeof notiz === "string" ? notiz : null);
  if (r.ok) aktualisiere();
  return r;
}

export async function brecheTrainingAbAktion(workoutId: number): Promise<AbschlussErgebnis> {
  if (!istId(workoutId)) return { ok: false, code: "workout_unbekannt" };
  const r = brecheWorkoutAb(db, workoutId);
  if (r.ok) aktualisiere();
  return r;
}

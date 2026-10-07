"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { parseExerciseForm } from "@/domain/exercise-form";
import { MUSTER, PRUEFSTATI, type Muster, type Pruefstatus } from "@/domain/types";
import { createExercise, setAktiv, setPruefstatus, updateExercise } from "@/server/exercises";
import type { FormState } from "./form-state";

function aktualisiereKatalog() {
  revalidatePath("/katalog", "layout");
}

export async function speichereNeueUebung(_prev: FormState, fd: FormData): Promise<FormState> {
  const werte = parseExerciseForm(fd);
  const muster = String(fd.get("muster") ?? "");
  if (!(MUSTER as readonly string[]).includes(muster)) {
    return { werte, muster, fehler: { muster: "Bitte ein Bewegungsmuster wählen." } };
  }
  const r = createExercise(db, muster as Muster, werte);
  if (!r.ok) return { werte, muster, fehler: r.fehler };
  aktualisiereKatalog();
  redirect(`/katalog/${r.id}`);
}

export async function speichereUebung(
  id: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const werte = parseExerciseForm(fd);
  const r = updateExercise(db, id, werte);
  if (!r.ok) return { werte, fehler: r.fehler };
  aktualisiereKatalog();
  redirect(`/katalog/${id}`);
}

export async function aktivUmschalten(id: string, aktiv: boolean): Promise<void> {
  setAktiv(db, id, aktiv);
  aktualisiereKatalog();
}

export async function pruefstatusSetzen(id: string, status: Pruefstatus): Promise<void> {
  if (!(PRUEFSTATI as readonly string[]).includes(status)) return;
  setPruefstatus(db, id, status);
  aktualisiereKatalog();
}

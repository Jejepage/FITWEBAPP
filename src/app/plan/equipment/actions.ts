"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { parseEquipmentForm, validiereEquipment } from "@/domain/equipment-form";
import { quelleAusFormData } from "@/domain/quelle";
import { de } from "@/i18n/de";
import { setzePlanEquipment } from "@/server/plans";
import type { EquipmentState } from "./form-state";

/** Speichert Equipment und Hantelgewichte des Plans und geht zurück zur Plan-Seite. */
export async function speichereEquipment(
  planId: number,
  _prev: EquipmentState,
  fd: FormData,
): Promise<EquipmentState> {
  const werte = parseEquipmentForm(quelleAusFormData(fd));
  const v = validiereEquipment(werte);
  if (!v.ok) return { werte, fehler: v.fehler };
  const r = setzePlanEquipment(db, planId, v.daten.equipment, v.daten.gewichte);
  if (!r.ok) return { werte, fehler: { _form: de.equipment.fehler[r.code] } };
  // Wirkt auf Plan, Start, Training (Tauschlisten, Gewichtsvorschläge) und Katalogfilter.
  revalidatePath("/", "layout");
  redirect("/plan");
}

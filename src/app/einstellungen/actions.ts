"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { parseSettingsForm, validiereSettings } from "@/domain/settings-form";
import { updateSettings } from "@/server/settings";
import type { SettingsState } from "./form-state";

function aktualisiere() {
  // Die Einstellungen wirken auf neue Pläne.
  revalidatePath("/", "layout");
}

export async function speichereEinstellungen(
  _prev: SettingsState,
  fd: FormData,
): Promise<SettingsState> {
  const werte = parseSettingsForm(fd);
  const r = validiereSettings(werte);
  if (!r.ok) return { werte, fehler: r.fehler };
  updateSettings(db, r.werte);
  aktualisiere();
  return { werte: r.werte, gespeichert: true };
}

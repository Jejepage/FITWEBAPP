"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { parseProfilForm, validiereProfil } from "@/domain/profile-form";
import { parseSettingsForm, validiereSettings } from "@/domain/settings-form";
import { createProfile, deleteProfile, updateProfile } from "@/server/profiles";
import { updateSettings } from "@/server/settings";
import type { LoeschState, ProfilState, SettingsState } from "./form-state";

function aktualisiere() {
  // Profile und Einstellungen wirken auf Katalogfilter und später auf Pläne.
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

export async function speichereNeuesProfil(_prev: ProfilState, fd: FormData): Promise<ProfilState> {
  const werte = parseProfilForm(fd);
  const v = validiereProfil(werte);
  if (!v.ok) return { werte, fehler: v.fehler };
  const r = createProfile(db, v.profil);
  if (!r.ok) return { werte, fehler: r.fehler };
  aktualisiere();
  redirect("/einstellungen");
}

export async function speichereProfil(
  id: number,
  _prev: ProfilState,
  fd: FormData,
): Promise<ProfilState> {
  const werte = parseProfilForm(fd);
  const v = validiereProfil(werte);
  if (!v.ok) return { werte, fehler: v.fehler };
  const r = updateProfile(db, id, v.profil);
  if (!r.ok) return { werte, fehler: r.fehler };
  aktualisiere();
  redirect("/einstellungen");
}

export async function loescheProfil(id: number): Promise<LoeschState> {
  const r = deleteProfile(db, id);
  if (!r.ok) return { fehler: r.fehler._form ?? "Das Profil konnte nicht gelöscht werden." };
  aktualisiere();
  redirect("/einstellungen");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { loesePlanWerteAuf, parsePlanRohwerte, quelleAusFormData } from "@/domain/plan-form";
import { SLOT_VORLAGE, slotKey } from "@/domain/plan-types";
import { createPlan, type PlanFehlerCode } from "@/server/plans";
import { ladePlanStandard } from "@/server/plan-defaults";

/** Nur Felder des Plan-Formulars; keine internen Felder des Frameworks ($ACTION_…). */
const FORMULARFELD =
  /^(profil|start|stufe_[A-Z]{2}|einheiten|zusatzblock|seed|basis|vorgaenger|gesendet|slot_[AB]-[12Z]-[1-3])$/;

type SeitenFehler = PlanFehlerCode | "vorschau_veraltet";

/** Zurück zur Vorschau mit allen Eingaben und einer Fehlermeldung (als Code, nie als Freitext). */
function zurueckMitFehler(fd: FormData, code: SeitenFehler): never {
  const sp = new URLSearchParams();
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && FORMULARFELD.test(k)) sp.append(k, v);
  }
  sp.set("fehler", code);
  redirect(`/plan/neu?${sp.toString()}`);
}

export async function planSpeichern(fd: FormData): Promise<void> {
  const standard = ladePlanStandard(db);
  if (!standard) zurueckMitFehler(fd, "profil_unbekannt");

  const roh = parsePlanRohwerte(quelleAusFormData(fd));
  const { werte, fehler, vorschauVeraltet } = loesePlanWerteAuf(
    { ...roh, aktion: "aktualisieren" },
    standard,
  );
  if (fehler.startDatum) zurueckMitFehler(fd, "datum_ungueltig");
  // Profil, Stufen usw. wurden nach der letzten Vorschau geändert: nicht stillschweigend etwas
  // anderes speichern, als der Nutzer gesehen hat.
  if (vorschauVeraltet) zurueckMitFehler(fd, "vorschau_veraltet");

  const r = createPlan(db, {
    profilId: werte.profilId,
    startDatum: werte.startDatum,
    einheitenProWoche: werte.einheitenProWoche,
    zusatzblock: werte.zusatzblock,
    stufen: werte.stufen,
    vorgaengerId: werte.vorgaengerId,
    // Gespeichert wird, was in der Vorschau ausgewählt war; Prüfung übernimmt createPlan.
    slots: SLOT_VORLAGE.map((v) => ({ ...v, exerciseId: werte.auswahl[slotKey(v)] ?? "" })),
  });
  if (!r.ok) zurueckMitFehler(fd, r.code);

  revalidatePath("/", "layout");
  redirect("/plan");
}

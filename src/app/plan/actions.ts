"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { loesePlanWerteAuf, parsePlanRohwerte, quelleAusFormData } from "@/domain/plan-form";
import { SLOT_VORLAGE, slotKey } from "@/domain/plan-types";
import { createPlan, type PlanFehlerCode } from "@/server/plans";
import { ladePlanStandard } from "@/server/plan-defaults";

/** Zurück zur Vorschau mit allen Eingaben und einer Fehlermeldung (als Code, nie als Freitext). */
function zurueckMitFehler(fd: FormData, code: PlanFehlerCode): never {
  const sp = new URLSearchParams();
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && k !== "aktion" && k !== "fehler") sp.append(k, v);
  }
  sp.set("fehler", code);
  redirect(`/plan/neu?${sp.toString()}`);
}

export async function planSpeichern(fd: FormData): Promise<void> {
  const standard = ladePlanStandard(db);
  if (!standard) zurueckMitFehler(fd, "profil_unbekannt");

  const roh = parsePlanRohwerte(quelleAusFormData(fd));
  const { werte, fehler } = loesePlanWerteAuf({ ...roh, aktion: "aktualisieren" }, standard);
  if (fehler.startDatum) zurueckMitFehler(fd, "datum_ungueltig");

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

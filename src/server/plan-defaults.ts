import type { Db } from "@/db/types";
import type { PlanStandardwerte } from "@/domain/plan-form";
import { heuteIso } from "./datum";
import { getPlan } from "./plans";
import { getProfile, getStandardProfil } from "./profiles";
import { getSettings } from "./settings";

/**
 * Voreinstellungen für einen neuen Plan: Standardprofil und Einstellungen. Null ohne Profil.
 * Bei einem Folgeblock (`vorgaengerId`) gelten Profil, Einheiten pro Woche und Zusatzblock des
 * Vorgängers; die Stufen kommen weiter aus den Einstellungen bzw. dem Stufen-Check.
 */
export function ladePlanStandard(
  db: Db,
  jetzt?: Date,
  vorgaengerId?: number,
): PlanStandardwerte | null {
  const profil = getStandardProfil(db);
  if (!profil) return null;
  const s = getSettings(db);
  const standard: PlanStandardwerte = {
    profilId: profil.id,
    stufen: s.stufen,
    einheitenProWoche: s.einheitenProWoche === 3 ? 3 : 2,
    zusatzblock: s.zusatzblock,
    heute: heuteIso(jetzt),
  };
  const vorgaenger = vorgaengerId ? getPlan(db, vorgaengerId) : null;
  if (!vorgaenger || !getProfile(db, vorgaenger.profilId)) return standard;
  return {
    ...standard,
    profilId: vorgaenger.profilId,
    einheitenProWoche: vorgaenger.einheitenProWoche === 3 ? 3 : 2,
    zusatzblock: vorgaenger.zusatzblock,
  };
}

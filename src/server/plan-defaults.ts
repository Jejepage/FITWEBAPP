import type { Db } from "@/db/types";
import type { PlanStandardwerte } from "@/domain/plan-form";
import { heuteIso } from "./datum";
import { getStandardProfil } from "./profiles";
import { getSettings } from "./settings";

/** Voreinstellungen für einen neuen Plan: Standardprofil und Einstellungen. Null ohne Profil. */
export function ladePlanStandard(db: Db, jetzt?: Date): PlanStandardwerte | null {
  const profil = getStandardProfil(db);
  if (!profil) return null;
  const s = getSettings(db);
  return {
    profilId: profil.id,
    stufen: s.stufen,
    einheitenProWoche: s.einheitenProWoche === 3 ? 3 : 2,
    zusatzblock: s.zusatzblock,
    heute: heuteIso(jetzt),
  };
}

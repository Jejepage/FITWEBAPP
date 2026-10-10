import { desc } from "drizzle-orm";
import { plan } from "@/db/schema";
import { standardEquipment, standardGewichte } from "@/db/seed/defaults";
import type { Db } from "@/db/types";
import type { PlanStandardwerte } from "@/domain/plan-form";
import { heuteIso } from "./datum";
import { getPlan } from "./plans";
import { getSettings } from "./settings";

/**
 * Voreinstellungen für einen neuen Plan: Einstellungen und das Equipment des Vorgängers, sonst des
 * zuletzt angelegten Plans, sonst die Voreinstellung für den ersten Plan. Bei einem Folgeblock
 * (`vorgaengerId`) gelten außerdem Einheiten pro Woche und Zusatzblock des Vorgängers; die Stufen
 * kommen weiter aus den Einstellungen bzw. dem Stufen-Check.
 */
export function ladePlanStandard(db: Db, jetzt?: Date, vorgaengerId?: number): PlanStandardwerte {
  const s = getSettings(db);
  const vorgaenger = vorgaengerId ? getPlan(db, vorgaengerId) : null;
  const zuletzt = vorgaenger ?? db.select().from(plan).orderBy(desc(plan.id)).limit(1).get();
  const standard: PlanStandardwerte = {
    equipment: zuletzt ? [...zuletzt.equipment] : [...standardEquipment],
    gewichte: zuletzt ? zuletzt.gewichte : standardGewichte,
    stufen: s.stufen,
    einheitenProWoche: s.einheitenProWoche === 3 ? 3 : 2,
    zusatzblock: s.zusatzblock,
    heute: heuteIso(jetzt),
  };
  if (!vorgaenger) return standard;
  return {
    ...standard,
    einheitenProWoche: vorgaenger.einheitenProWoche === 3 ? 3 : 2,
    zusatzblock: vorgaenger.zusatzblock,
  };
}

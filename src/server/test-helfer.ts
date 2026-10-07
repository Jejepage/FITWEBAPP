// Nur für Tests: legt einen aktiven Plan an (erste passende Übung je Slot, kein Generator).
import type { Db } from "@/db/types";
import { erfuellt } from "@/domain/equipment";
import { SLOT_VORLAGE } from "@/domain/plan-types";
import { MUSTER, type Muster } from "@/domain/types";
import { alleUebungen } from "./exercises";
import { createPlan, getPlanSlotsMitId } from "./plans";
import { listProfiles } from "./profiles";

export function legePlanAn(
  db: Db,
  opts: { profil?: string; einheitenProWoche?: 2 | 3; zusatzblock?: boolean } = {},
): { planId: number; slotIds: Record<string, number> } {
  const profil = listProfiles(db).find((p) => p.seedKey === (opts.profil ?? "studio"))!;
  const katalog = alleUebungen(db);
  const stufen = Object.fromEntries(MUSTER.map((m) => [m, 2])) as Record<Muster, number>;
  const r = createPlan(db, {
    profilId: profil.id,
    startDatum: "2026-10-07",
    einheitenProWoche: opts.einheitenProWoche ?? 2,
    zusatzblock: opts.zusatzblock ?? false,
    stufen,
    vorgaengerId: null,
    slots: SLOT_VORLAGE.map((v) => {
      const kandidaten = katalog.filter(
        (u) => u.muster === v.muster && erfuellt(u.equipment, profil.equipment),
      );
      // A und B bekommen verschiedene Übungen, soweit vorhanden
      return { ...v, exerciseId: kandidaten[(v.einheit === "A" ? 0 : 1) % kandidaten.length]!.id };
    }),
  });
  if (!r.ok) throw new Error(`Plan konnte nicht angelegt werden: ${r.code}`);
  const slotIds = Object.fromEntries(
    getPlanSlotsMitId(db, r.id).map((s) => [`${s.einheit}-${s.block}-${s.position}`, s.id]),
  );
  return { planId: r.id, slotIds };
}

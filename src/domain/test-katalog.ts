// Testhilfe: echter Seed-Katalog und Standardprofile. Nur in Tests importieren.
import { uebungenSeed } from "@/db/seed/data";
import { standardProfile } from "@/db/seed/defaults";
import type { EquipmentArt, Exercise } from "./types";

export function testKatalog(): Exercise[] {
  return uebungenSeed.map((u) => ({
    ...u,
    bild: null,
    aktiv: true,
    pruefstatus: "zu_pruefen" as const,
  }));
}

export const testProfile: readonly { seedKey: string; name: string; equipment: EquipmentArt[] }[] =
  standardProfile.map((p) => ({ seedKey: p.seedKey, name: p.name, equipment: [...p.equipment] }));

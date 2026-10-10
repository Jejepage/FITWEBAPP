// Testhilfe: echter Seed-Katalog und typische Equipment-Auswahlen. Nur in Tests importieren.
import { uebungenSeed } from "@/db/seed/data";
import { EQUIPMENT_AUSWAHL, type EquipmentArt, type Exercise } from "./types";

export function testKatalog(): Exercise[] {
  return uebungenSeed.map((u) => ({
    ...u,
    bild: null,
    aktiv: true,
    pruefstatus: "zu_pruefen" as const,
  }));
}

/** Drei typische Equipment-Auswahlen (früher die Standardprofile): Studio, Zuhause, Unterwegs. */
export const testProfile: readonly { seedKey: string; name: string; equipment: EquipmentArt[] }[] =
  [
    { seedKey: "studio", name: "Studio", equipment: [...EQUIPMENT_AUSWAHL] },
    {
      seedKey: "zuhause",
      name: "Zuhause",
      equipment: ["kurzhanteln", "kettlebell", "bank", "stange"],
    },
    // Annahme: Etwas zum Hochziehen ist immer vorhanden.
    { seedKey: "unterwegs", name: "Unterwegs", equipment: ["stange"] },
  ];

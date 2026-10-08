import { EQUIPMENT_AUSWAHL, MUSTER, type EquipmentArt, type Gewichte, type Muster } from "@/domain/types";

export interface StandardProfil {
  seedKey: string;
  name: string;
  equipment: EquipmentArt[];
  gewichte: Gewichte;
  istStandard: boolean;
}

const kurzhantelGewichte = Array.from({ length: 10 }, (_, i) => 2 + i * 2); // 2–20 kg in 2-kg-Schritten

export const standardProfile: StandardProfil[] = [
  {
    seedKey: "studio",
    name: "Studio",
    equipment: [...EQUIPMENT_AUSWAHL],
    gewichte: {},
    istStandard: true,
  },
  {
    seedKey: "zuhause",
    name: "Zuhause",
    equipment: ["kurzhanteln", "kettlebell", "bank", "stange"],
    gewichte: { kurzhanteln: kurzhantelGewichte, kettlebell: [12, 16] },
    istStandard: false,
  },
  {
    seedKey: "unterwegs",
    name: "Unterwegs",
    // Annahme: Etwas zum Hochziehen ist immer vorhanden.
    equipment: ["stange"],
    gewichte: {},
    istStandard: false,
  },
];

export const AUFWAERMEN_TEXT_STANDARD = [
  "Mobilisation: Schultern, Brustwirbelsäule und Hüfte je 30–45 Sekunden kreisen.",
  "Gleichgewicht: Einbeinstand je Seite 20–30 Sekunden.",
  "Leichte Schnellkraft: kleine Sprünge auf der Stelle, 20–30 Sekunden.",
  "Insgesamt 5–8 Minuten, dann mit der ersten Übung in leichter Form beginnen.",
].join("\n");

export const standardStufen: Record<Muster, number> = Object.fromEntries(
  MUSTER.map((m) => [m, 2]),
) as Record<Muster, number>;

export const standardSettings = {
  id: 1,
  stufen: standardStufen,
  einheitenProWoche: 2,
  zusatzblock: false,
  aufwaermenText: AUFWAERMEN_TEXT_STANDARD,
};

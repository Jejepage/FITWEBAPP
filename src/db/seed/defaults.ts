import { MUSTER, type EquipmentArt, type Gewichte, type Muster } from "@/domain/types";

const kurzhantelGewichte = Array.from({ length: 10 }, (_, i) => 2 + i * 2); // 2–20 kg in 2-kg-Schritten

/**
 * Voreinstellung für das Equipment des allerersten Plans. Danach gilt im Formular für einen neuen
 * Plan das Equipment des zuletzt angelegten Plans.
 */
export const standardEquipment: EquipmentArt[] = ["kurzhanteln", "kettlebell", "bank", "stange"];
export const standardGewichte: Gewichte = {
  kurzhanteln: kurzhantelGewichte,
  kettlebell: [12, 16],
};

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

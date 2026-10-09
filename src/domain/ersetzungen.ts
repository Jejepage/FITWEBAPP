// Ersetzungen einer Einheit: Welche Übungen ersetzen Planübungen, die das Equipment des Plans
// nicht (mehr) erfüllt, z. B. nach einer Änderung des Equipments? Rein, ohne DB und UI.
import { erfuellt } from "./equipment";
import type { Block, EquipmentArt, Exercise, Muster } from "./types";

export interface ErsetzSlot {
  /** ID des Plan-Slots (plan_slot.id) */
  slotId: number;
  block: Block;
  muster: Muster;
  /** Im Plan vorgesehene Übung */
  exerciseId: string;
}

export interface ErsetzEingabe {
  slots: readonly ErsetzSlot[];
  /** Gesamter Katalog */
  uebungen: readonly Exercise[];
  /** Equipment des Plans */
  equipment: readonly EquipmentArt[];
}

export interface ErsetzErgebnis {
  /** Nur Slots mit Ersatz: { "<slotId>": "<exerciseId>" } (Format von workout.ersetzungen) */
  ersetzungen: Record<string, string>;
  /** Muster, für die es mit diesem Equipment keine passende Übung gibt */
  fehlendeMuster: Muster[];
}

const nachId = (a: Exercise, b: Exercise): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Passt die Planübung zum Equipment, bleibt sie. Sonst die ähnlichste Übung desselben Musters:
 * Planübungen vor Ersatzübungen, dann kleinster Stufenabstand, bei Gleichstand die niedrigere
 * Stufe, dann gleiche Einseitigkeit, dann nach ID.
 */
export function ersetzungenFuerEquipment(e: ErsetzEingabe): ErsetzErgebnis {
  const katalog = new Map(e.uebungen.map((u) => [u.id, u]));
  const ersetzungen: Record<string, string> = {};
  const fehlend = new Set<Muster>();

  for (const slot of e.slots) {
    const original = katalog.get(slot.exerciseId);
    if (original?.aktiv && erfuellt(original.equipment, e.equipment)) continue;

    const kandidaten = e.uebungen
      .filter((u) => u.muster === slot.muster && u.aktiv && erfuellt(u.equipment, e.equipment))
      .sort(nachId);
    const stufe = original?.stufe ?? 2;
    const einseitig = original?.einseitig ?? false;
    const beste = kandidaten
      .map((u) => ({
        u,
        ersatz: u.ersatz ? 1 : 0,
        abstand: Math.abs(u.stufe - stufe),
        anderer: u.einseitig === einseitig ? 0 : 1,
      }))
      .sort(
        (a, b) =>
          a.ersatz - b.ersatz || a.abstand - b.abstand || a.u.stufe - b.u.stufe || a.anderer - b.anderer,
      )[0];
    if (beste) ersetzungen[String(slot.slotId)] = beste.u.id;
    else fehlend.add(slot.muster);
  }
  return { ersetzungen, fehlendeMuster: [...fehlend] };
}

/**
 * Ersetzungen für eine Einheit: wie `ersetzungenFuerEquipment`, aber nur für die Slots, die in
 * dieser Einheit gebraucht werden (der Zusatzblock Z nur, wenn er aktiv ist).
 */
export function ersetzungenFuerEinheit(e: ErsetzEingabe & { zusatzblock: boolean }): ErsetzErgebnis {
  return ersetzungenFuerEquipment({
    ...e,
    slots: e.slots.filter((s) => s.block !== "Z" || e.zusatzblock),
  });
}

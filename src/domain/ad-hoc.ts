// Ad-hoc-Profilwechsel (Spec F6): Welche Übungen ersetzen die Planübungen einer Einheit, wenn mit
// einem anderen Equipment-Profil trainiert wird? Rein, ohne DB und UI.
import { erfuellt } from "./equipment";
import type { EquipmentArt, Exercise, Muster } from "./types";

export interface AdHocSlot {
  /** ID des Plan-Slots (plan_slot.id) */
  slotId: number;
  muster: Muster;
  /** Im Plan vorgesehene Übung */
  exerciseId: string;
}

export interface AdHocEingabe {
  slots: readonly AdHocSlot[];
  /** Gesamter Katalog */
  uebungen: readonly Exercise[];
  /** Equipment des gewählten Profils */
  equipment: readonly EquipmentArt[];
}

export interface AdHocErgebnis {
  /** Nur Slots mit Ersatz: { "<slotId>": "<exerciseId>" } (Format von workout.ersetzungen) */
  ersetzungen: Record<string, string>;
  /** Muster, für die es mit diesem Profil keine passende Übung gibt */
  fehlendeMuster: Muster[];
}

const nachId = (a: Exercise, b: Exercise): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Passt die Planübung zum Profil, bleibt sie. Sonst die ähnlichste Übung desselben Musters:
 * kleinster Stufenabstand, bei Gleichstand die niedrigere Stufe, dann gleiche Einseitigkeit,
 * dann nach ID.
 */
export function ersetzungenFuerProfil(e: AdHocEingabe): AdHocErgebnis {
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
        abstand: Math.abs(u.stufe - stufe),
        anderer: u.einseitig === einseitig ? 0 : 1,
      }))
      .sort((a, b) => a.abstand - b.abstand || a.u.stufe - b.u.stufe || a.anderer - b.anderer)[0];
    if (beste) ersetzungen[String(slot.slotId)] = beste.u.id;
    else fehlend.add(slot.muster);
  }
  return { ersetzungen, fehlendeMuster: [...fehlend] };
}

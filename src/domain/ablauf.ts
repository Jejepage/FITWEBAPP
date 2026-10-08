// Ablauf einer Einheit (Spec 2.3): Blöcke, Runden und Übungsreihenfolge als lineare
// Schrittliste. Rein und ohne DB; der Fortschritt ergibt sich allein aus den gespeicherten Sätzen.
import { rundenFuerBlock } from "./weeks";
import type { Block, Muster } from "./types";

export interface AblaufSlot {
  /** ID des Plan-Slots (plan_slot.id) */
  slotId: number;
  block: Block;
  /** Position im Block, ab 1 */
  position: number;
  muster: Muster;
  /** Im Plan vorgesehene Übung */
  exerciseId: string;
}

/** Was nach einem Satz folgt. */
export type Danach =
  /** nächster Satz derselben Einheit im selben Block */
  | "weiter"
  /** Blockende: Übergang zum nächsten Block */
  | "block"
  /** letzter Satz der Einheit */
  | "ende";

export interface Schritt {
  /** Eindeutig je Einheit: "<slotId>:<runde>" */
  key: string;
  slotId: number;
  block: Block;
  position: number;
  /** Anzahl der Übungen im Block */
  anzahlImBlock: number;
  runde: number;
  runden: number;
  muster: Muster;
  /** Wirksame Übung (Ersatz, falls gewählt) */
  exerciseId: string;
  geplanteUebungId: string;
  danach: Danach;
}

export interface AblaufEingabe {
  /** Alle Slots der Einheit (alle Blöcke) */
  slots: readonly AblaufSlot[];
  /** Ersatzübungen dieser Einheit je Slot-ID (als Text, wie in workout.ersetzungen) */
  ersetzungen: Readonly<Record<string, string>>;
  /** Zusatzblock in dieser Einheit */
  zusatzblock: boolean;
  woche: number;
}

export const BLOCK_REIHENFOLGE: readonly Block[] = ["1", "2", "Z"];

export const schrittKey = (slotId: number, runde: number): string => `${slotId}:${runde}`;

export function bauSchritte(e: AblaufEingabe): Schritt[] {
  const bloecke = BLOCK_REIHENFOLGE.filter((b) => b !== "Z" || e.zusatzblock)
    .map((block) => ({
      block,
      slots: e.slots.filter((s) => s.block === block).sort((a, b) => a.position - b.position),
    }))
    .filter((b) => b.slots.length > 0);

  const schritte: Schritt[] = [];
  bloecke.forEach(({ block, slots }, blockIndex) => {
    const runden = rundenFuerBlock(e.woche, block);
    for (let runde = 1; runde <= runden; runde++) {
      slots.forEach((slot, i) => {
        const letzterSchrittImBlock = i === slots.length - 1 && runde === runden;
        const letzterBlock = blockIndex === bloecke.length - 1;
        const danach: Danach = !letzterSchrittImBlock ? "weiter" : letzterBlock ? "ende" : "block";
        schritte.push({
          key: schrittKey(slot.slotId, runde),
          slotId: slot.slotId,
          block,
          position: slot.position,
          anzahlImBlock: slots.length,
          runde,
          runden,
          muster: slot.muster,
          exerciseId: e.ersetzungen[String(slot.slotId)] ?? slot.exerciseId,
          geplanteUebungId: slot.exerciseId,
          danach,
        });
      });
    }
  });
  return schritte;
}

/** Index des ersten Schritts ohne gespeicherten Satz; -1, wenn alles erledigt ist. */
export function naechsterOffenerIndex(
  schritte: readonly Schritt[],
  erledigteKeys: ReadonlySet<string>,
): number {
  return schritte.findIndex((s) => !erledigteKeys.has(s.key));
}

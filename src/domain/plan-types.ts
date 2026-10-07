// Vertrag für Plan-Generator, Plan-Speicherung und Plan-Oberfläche (Spec 2.4 und F3).
// Reine Typen und Konstanten; die Logik steht in generator.ts.
import type { Block, Einheit, EquipmentArt, Exercise, Muster } from "./types";

export type SlotKey = `${Einheit}-${Block}-${number}`;

export interface SlotVorlage {
  einheit: Einheit;
  block: Block;
  /** Position innerhalb des Blocks, ab 1 */
  position: number;
  muster: Muster;
}

/** Muster je Block (Spec 2.4). Zusatzblock "Z" ist für A und B gleich. */
const BLOECKE: Record<Einheit, Record<Block, readonly Muster[]>> = {
  A: { "1": ["KN", "DH", "ZH"], "2": ["HB", "DV", "ZV"], Z: ["TR", "RU"] },
  B: { "1": ["HB", "DH", "ZV"], "2": ["KN", "DV", "ZH"], Z: ["TR", "RU"] },
};

/** Runden je Block (Spec 2.3). */
export const BLOCK_RUNDEN: Record<Block, number> = { "1": 3, "2": 3, Z: 2 };

const EINHEITEN: readonly Einheit[] = ["A", "B"];
const BLOCK_REIHENFOLGE: readonly Block[] = ["1", "2", "Z"];

/** Die 16 Slots eines Plans in fester Reihenfolge: A-1, A-2, A-Z, B-1, B-2, B-Z. */
export const SLOT_VORLAGE: readonly SlotVorlage[] = EINHEITEN.flatMap((einheit) =>
  BLOCK_REIHENFOLGE.flatMap((block) =>
    BLOECKE[einheit][block].map((muster, i) => ({ einheit, block, position: i + 1, muster })),
  ),
);

export const slotKey = (s: Pick<SlotVorlage, "einheit" | "block" | "position">): SlotKey =>
  `${s.einheit}-${s.block}-${s.position}`;

export const SLOT_KEYS: readonly SlotKey[] = SLOT_VORLAGE.map(slotKey);

/** Liest "A-1-2" zurück in eine Vorlage; null bei ungültigem Schlüssel. */
export function slotVorlageVonKey(key: string): SlotVorlage | null {
  return SLOT_VORLAGE.find((s) => slotKey(s) === key) ?? null;
}

export interface SlotZuordnung extends SlotVorlage {
  exerciseId: string;
}

export type HinweisCode =
  /** Für ein Muster gibt es nur eine Kandidatenübung: A und B haben dieselbe. */
  | "wenig_auswahl"
  /** A und B haben für ein Muster dieselbe Übung, obwohl es Alternativen gäbe (manuelle Wahl). */
  | "gleiche_uebung_ab"
  /** Keine einseitige Übung in KN/HB (A und B zusammen). */
  | "einseitig_fehlt"
  /** Gewählte Übung hat nicht die Wunschstufe des Musters. */
  | "stufe_weicht_ab";

export interface PlanHinweis {
  code: HinweisCode;
  muster?: Muster;
  /** Wunschstufe (bei stufe_weicht_ab) */
  gewuenscht?: number;
  /** Stufe der gewählten Übung (bei stufe_weicht_ab) */
  tatsaechlich?: number;
}

export interface GeneratorEingabe {
  /** Gesamter Katalog; der Generator berücksichtigt nur aktive Übungen. */
  uebungen: readonly Exercise[];
  /** Equipment des gewählten Profils */
  equipment: readonly EquipmentArt[];
  /** Wunschstufe je Muster (1 bis 5) */
  stufen: Record<Muster, number>;
  /** Übungs-IDs des Vorgängerblocks (nur bei Folgeblöcken) */
  vorherVerwendet?: ReadonlySet<string>;
  /** 0 oder fehlend = deterministisch; > 0 = gemischt innerhalb gleichwertiger Gruppen */
  seed?: number;
}

export type GeneratorErgebnis =
  | { ok: true; slots: SlotZuordnung[]; hinweise: PlanHinweis[] }
  | { ok: false; fehlendeMuster: Muster[] };

export type KandidatenEingabe = Omit<GeneratorEingabe, "seed">;
export type PruefEingabe = Omit<GeneratorEingabe, "seed" | "vorherVerwendet">;

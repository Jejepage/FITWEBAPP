// Kleine Bausteine des Trainingsbildschirms (Chips, Info-Karten, Aufklapp-Bereiche, angehefteter
// Hauptknopf). Nur Token-Klassen; keine festen Farben.
import type { ReactNode } from "react";
import { MUSTER_FARBE } from "@/lib/muster-farbe";
import { MUSTER_NAMEN, type Muster } from "@/domain/types";
import { IconChevronUnten } from "./icons-training";

/** Bewegungsmuster als Chip: Punkt und Name in Musterfarbe */
export function MusterChip({ muster }: { muster: Muster }) {
  const f = MUSTER_FARBE[muster];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full ${f.soft} px-3 py-1 text-sm font-semibold ${f.ink}`}
    >
      <span aria-hidden="true" className={`size-2.5 rounded-full ${f.fl}`} />
      {MUSTER_NAMEN[muster]}
    </span>
  );
}

/** Getönte Info-Karte mit Symbol */
export function InfoKarte({
  symbol,
  klasse,
  children,
}: {
  symbol: ReactNode;
  klasse: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl p-4 text-[15px] leading-snug ${klasse}`}>
      <span className="mt-px shrink-0">{symbol}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Aufklapp-Bereich im iOS-Stil (natives details: Tastatur und Lesegeräte funktionieren von selbst) */
export function Aufklapp({
  titel,
  symbol,
  offen,
  klasse = "",
  children,
}: {
  titel: string;
  symbol: ReactNode;
  offen?: boolean;
  klasse?: string;
  children: ReactNode;
}) {
  return (
    <details
      open={offen}
      className={`group overflow-hidden rounded-card bg-surface shadow-card ${klasse}`}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-medium transition-colors hover:bg-fill [&::-webkit-details-marker]:hidden">
        <span className="text-ink-3">{symbol}</span>
        <span className="flex-1">{titel}</span>
        <IconChevronUnten className="size-5 text-ink-3 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="border-t border-line">{children}</div>
    </details>
  );
}

/** Zeile in einer Liste aus Aktionsknöpfen (getrennt durch Linien) */
export const aktionsZeile =
  "press flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-base font-medium hover:bg-fill";

/** Haupt-Knopf unten angeheftet: über der Tab-Leiste (unter 1024 px), ab 1024 px am Fensterrand. */
export function Angeheftet({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 bg-gradient-to-t from-bg from-65% to-transparent px-4 pb-3 pt-8 sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:px-0 lg:pb-4">
      {children}
    </div>
  );
}

/** Sehr großer Haupt-Knopf */
export const hauptKnopf =
  "press flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-xl font-semibold text-on-accent shadow-lg hover:brightness-110 disabled:opacity-50";

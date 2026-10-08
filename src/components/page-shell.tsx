import type { ReactNode } from "react";
import { titel as titelKlasse } from "@/components/ui";

/** Maximale Inhaltsbreite: Formulare/Text schmal, Raster und Tabellen breit, voll = Seitenbreite. */
export type Breite = "schmal" | "normal" | "weit" | "voll";

export const BREITE: Record<Breite, string> = {
  schmal: "max-w-2xl",
  normal: "max-w-5xl",
  weit: "max-w-7xl",
  voll: "max-w-none",
};

/**
 * Seitenrahmen: breitenbegrenzter Inhalt, großer Titel (iOS-Stil), optional Untertitel und Aktionen
 * rechts neben dem Titel. Der Titel ist immer die h1 der Seite.
 */
export function PageShell({
  title,
  untertitel,
  aktionen,
  breite = "normal",
  children,
}: {
  title: string;
  untertitel?: ReactNode;
  aktionen?: ReactNode;
  breite?: Breite;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full ${BREITE[breite]}`}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 lg:mb-8">
        <div className="min-w-0">
          <h1 className={titelKlasse}>{title}</h1>
          {untertitel && <p className="mt-1 text-base text-ink-3">{untertitel}</p>}
        </div>
        {aktionen && <div className="flex flex-wrap items-center gap-2">{aktionen}</div>}
      </header>
      {children}
    </div>
  );
}

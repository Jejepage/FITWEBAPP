import Link from "next/link";
import { de } from "@/i18n/de";
import { beschreibeBedingung } from "@/domain/equipment";
import { videoLink } from "@/domain/youtube";
import type { Exercise } from "@/domain/types";
import { MUSTER_FARBE } from "@/lib/muster-farbe";
import { Badge } from "./badge";
import { StufenPunkte } from "./muster-ui";

/** Übung als Karte: Farbstreifen in der Musterfarbe, Stufe als Punktreihe, getönte Kennzeichen. */
export function ExerciseCard({ e }: { e: Exercise }) {
  const farbe = MUSTER_FARBE[e.muster];
  return (
    <Link
      href={`/katalog/${e.id}`}
      className={`press group relative block h-full overflow-hidden rounded-card border border-line/50 bg-surface p-4 pl-5 shadow-card transition-shadow hover:shadow-lg`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${farbe.fl}`} />
      <div className="flex items-start justify-between gap-3">
        <span
          className={`text-[17px] font-semibold leading-snug ${e.aktiv ? "text-ink" : "text-ink-2"}`}
        >
          {e.name}
        </span>
        <span className="shrink-0 pt-0.5 text-sm tabular-nums text-ink-3">{e.id}</span>
      </div>
      <p className="mt-1 text-sm text-ink-2">{beschreibeBedingung(e.equipment)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-3">
          <StufenPunkte stufe={e.stufe} muster={e.muster} />
          {de.katalog.stufeBadge(e.stufe)}
        </span>
        {e.einseitig && <Badge>{de.katalog.einseitigBadge}</Badge>}
        {e.ersatz && <Badge farbe="hinweis">{de.katalog.ersatzBadge}</Badge>}
        {e.pruefstatus === "zu_pruefen" && <Badge farbe="hinweis">{de.katalog.zuPruefen}</Badge>}
        {videoLink(e.videoUrl) && <Badge farbe="gut">{de.katalog.videoBadge}</Badge>}
        {!e.aktiv && <Badge farbe="grau">{de.katalog.inaktiv}</Badge>}
      </div>
    </Link>
  );
}

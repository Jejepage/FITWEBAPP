import Link from "next/link";
import { de } from "@/i18n/de";
import { beschreibeBedingung } from "@/domain/equipment";
import { videoLink } from "@/domain/youtube";
import type { Exercise } from "@/domain/types";
import { Badge } from "./badge";

export function ExerciseCard({ e }: { e: Exercise }) {
  return (
    <Link
      href={`/katalog/${e.id}`}
      className={`block rounded-xl border border-line bg-surface p-4 hover:border-accent ${
        e.aktiv ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{e.name}</span>
        <span className="shrink-0 text-sm text-ink-3">{e.id}</span>
      </div>
      <p className="mt-1 text-sm text-ink-2">{beschreibeBedingung(e.equipment)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge>{de.katalog.stufeBadge(e.stufe)}</Badge>
        {e.einseitig && <Badge>{de.katalog.einseitigBadge}</Badge>}
        {e.pruefstatus === "zu_pruefen" && <Badge farbe="hinweis">{de.katalog.zuPruefen}</Badge>}
        {videoLink(e.videoUrl) && <Badge farbe="gut">{de.katalog.videoBadge}</Badge>}
        {!e.aktiv && <Badge farbe="grau">{de.katalog.inaktiv}</Badge>}
      </div>
    </Link>
  );
}

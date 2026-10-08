import Link from "next/link";
import type { Exercise } from "@/domain/types";
import { de } from "@/i18n/de";
import { MUSTER_FARBE } from "@/lib/muster-farbe";

/**
 * Stufenleiter als senkrechte Schritt-Kette in der Musterfarbe: oben leicht, unten schwer. Jedes
 * Glied ist anklickbar, das aktuelle ist hervorgehoben.
 */
export function Ladder({ kette, aktuellId }: { kette: Exercise[]; aktuellId: string }) {
  if (kette.length <= 1) return <p className="text-sm text-ink-3">Keine Stufenleiter verknüpft.</p>;
  return (
    <ol aria-label={de.katalog.stufenleiter}>
      {kette.map((e, i) => {
        const aktuell = e.id === aktuellId;
        const farbe = MUSTER_FARBE[e.muster];
        return (
          <li key={e.id} className="relative pb-2.5 pl-8 last:pb-0">
            {i < kette.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-[0.6875rem] top-6 h-full w-0.5 rounded-full ${farbe.fl}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`absolute left-0 top-3 grid size-6 place-items-center rounded-full ${
                aktuell ? farbe.fl : `${farbe.soft} border-2 ${farbe.rand}`
              }`}
            >
              {aktuell && <span className="size-2 rounded-full bg-surface" />}
            </span>
            <Link
              href={`/katalog/${e.id}`}
              aria-current={aktuell ? "page" : undefined}
              className={`press flex min-h-12 items-center justify-between gap-3 rounded-xl px-3.5 py-2 ${
                aktuell
                  ? `${farbe.soft} border-2 ${farbe.rand} font-semibold`
                  : "bg-fill hover:bg-fill-2"
              }`}
            >
              <span className="min-w-0">{e.name}</span>
              <span className="shrink-0 text-right text-sm text-ink-2">
                {e.id} · {de.katalog.stufeBadge(e.stufe)}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

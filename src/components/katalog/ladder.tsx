import Link from "next/link";
import type { Exercise } from "@/domain/types";
import { de } from "@/i18n/de";

/** Stufenleiter als senkrechte Kette: oben leicht, unten schwer. Jedes Glied ist anklickbar. */
export function Ladder({
  kette,
  aktuellId,
}: {
  kette: Exercise[];
  aktuellId: string;
}) {
  if (kette.length <= 1)
    return (
      <p className="text-sm text-neutral-500">Keine Stufenleiter verknüpft.</p>
    );
  return (
    <ol className="space-y-1" aria-label={de.katalog.stufenleiter}>
      {kette.map((e, i) => {
        const aktuell = e.id === aktuellId;
        return (
          <li key={e.id}>
            {i > 0 && (
              <span aria-hidden className="ml-4 block text-neutral-400">
                ↓
              </span>
            )}
            <Link
              href={`/katalog/${e.id}`}
              aria-current={aktuell ? "page" : undefined}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                aktuell
                  ? "border-brand bg-teal-50 font-semibold dark:bg-teal-950"
                  : "border-neutral-200 hover:border-brand dark:border-neutral-800"
              }`}
            >
              <span>{e.name}</span>
              <span className="shrink-0 text-sm text-neutral-500">
                {e.id} · {de.katalog.stufeBadge(e.stufe)}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

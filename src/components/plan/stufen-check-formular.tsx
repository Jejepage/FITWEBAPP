import { eingabe, karte, knopfPrimaer } from "@/components/ui";
import type { StufenCheckErgebnis } from "@/domain/stufen-check-types";
import { MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";

const t = de.stufencheck;
const STUFEN = [1, 2, 3, 4, 5] as const;

/**
 * Stufen-Check am Blockende: Empfehlung je Muster, neue Stufe frei wählbar. Das GET-Formular
 * öffnet die Planerstellung mit dem Vorgängerblock und den gewählten Stufen (ohne JavaScript).
 */
export function StufenCheckFormular({
  planId,
  ergebnisse,
}: {
  planId: number;
  ergebnisse: StufenCheckErgebnis[];
}) {
  return (
    <section className={`${karte} mb-4`} aria-labelledby="stufencheck-titel">
      <h2 id="stufencheck-titel" className="text-lg font-semibold">
        {t.titel}
      </h2>
      <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">{t.hilfe}</p>
      <form method="get" action="/plan/neu">
        <input type="hidden" name="vorgaenger" value={planId} />
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {ergebnisse.map((e) => (
            <li key={e.muster} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{MUSTER_NAMEN[e.muster]}</p>
                  <p className="text-sm text-neutral-500">
                    {t.aktuell}: {t.stufe(e.aktuell)} · {t.einheitenGewertet(e.einheiten)}
                  </p>
                </div>
                <label className="shrink-0">
                  <span className="sr-only">
                    {t.neu} {MUSTER_NAMEN[e.muster]}
                  </span>
                  <select
                    name={`stufe_${e.muster}`}
                    defaultValue={e.neu}
                    className={`${eingabe} w-32`}
                  >
                    {STUFEN.map((s) => (
                      <option key={s} value={s}>
                        {t.stufe(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-1 text-sm">
                <span className="font-medium text-brand">{t.empfehlung[e.empfehlung]}.</span>{" "}
                <span className="text-neutral-600 dark:text-neutral-400">{t.grund[e.grund]}</span>
              </p>
            </li>
          ))}
        </ul>
        <button type="submit" className={`${knopfPrimaer} mt-3 w-full min-h-14 text-lg`}>
          {t.knopf}
        </button>
        <p className="mt-2 text-center text-sm text-neutral-500">{t.knopfHilfe}</p>
      </form>
    </section>
  );
}

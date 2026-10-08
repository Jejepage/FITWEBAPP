import { MusterPunkt, StufenPunkte } from "@/components/katalog/muster-ui";
import { eingabe, karte, knopfPrimaer } from "@/components/ui";
import type { StufenCheckErgebnis } from "@/domain/stufen-check-types";
import { MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";

const t = de.stufencheck;
const STUFEN = [1, 2, 3, 4, 5] as const;
// Auswahl auf grauer Kachel: weißer Grund statt grauer Eingabefläche
const auswahlKlasse = eingabe.replace(" bg-fill ", " bg-surface ");

/** Farbe der Empfehlung als getönte Pille (ausgeschriebene Token-Klassen). */
const EMPFEHLUNG_KLASSE = {
  erhoehen: "bg-ok-soft text-ok-ink",
  halten: "bg-fill-2 text-ink-2",
  senken: "bg-warn-soft text-warn-ink",
} as const;

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
    <section className={`${karte} mb-6`} aria-labelledby="stufencheck-titel">
      <h2 id="stufencheck-titel" className="text-xl font-semibold tracking-tight lg:text-2xl">
        {t.titel}
      </h2>
      <p className="mb-4 mt-1 max-w-3xl text-[15px] text-ink-2">{t.hilfe}</p>
      <form method="get" action="/plan/neu">
        <input type="hidden" name="vorgaenger" value={planId} />
        <ul className="grid gap-3 lg:grid-cols-2">
          {ergebnisse.map((e) => (
            <li key={e.muster} className="rounded-2xl bg-fill p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-2">
                    <MusterPunkt muster={e.muster} klasse="size-3" />
                  </span>
                  <div>
                    <p className="text-[17px] font-semibold">{MUSTER_NAMEN[e.muster]}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
                      <StufenPunkte stufe={e.aktuell} muster={e.muster} klasse="size-1.5" />
                      <span>
                        {t.aktuell}: {t.stufe(e.aktuell)} · {t.einheitenGewertet(e.einheiten)}
                      </span>
                    </p>
                  </div>
                </div>
                <label className="shrink-0">
                  <span className="sr-only">
                    {t.neu} {MUSTER_NAMEN[e.muster]}
                  </span>
                  <select
                    name={`stufe_${e.muster}`}
                    defaultValue={e.neu}
                    className={`${auswahlKlasse} w-32`}
                  >
                    {STUFEN.map((s) => (
                      <option key={s} value={s}>
                        {t.stufe(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-2.5 text-sm">
                <span
                  className={`mr-1.5 inline-block rounded-full px-2.5 py-0.5 font-semibold ${EMPFEHLUNG_KLASSE[e.empfehlung]}`}
                >
                  {t.empfehlung[e.empfehlung]}.
                </span>{" "}
                <span className="text-ink-2">{t.grund[e.grund]}</span>
              </p>
            </li>
          ))}
        </ul>
        <button
          type="submit"
          className={`${knopfPrimaer} mt-5 min-h-14 w-full text-lg lg:w-auto lg:px-10`}
        >
          {t.knopf}
        </button>
        <p className="mt-2 text-sm text-ink-3">{t.knopfHilfe}</p>
      </form>
    </section>
  );
}

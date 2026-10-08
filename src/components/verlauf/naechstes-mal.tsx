import Link from "next/link";
import { musterAusId } from "@/components/katalog/muster-ui";
import { abschnittTitel } from "@/components/ui";
import { formatSatz } from "@/domain/satz-format";
import { de } from "@/i18n/de";
import { vorschlagGrundText } from "@/i18n/vorschlag-text";
import { MUSTER_FARBE } from "@/lib/muster-farbe";
import type { NaechstesMal } from "@/server/vorschlaege";

const t = de.verlauf;

/** "Nächstes Mal" als getönte Karte; jeder Vorschlag mit Farbstreifen seines Bewegungsmusters. */
export function NaechstesMalAnsicht({ daten }: { daten: NaechstesMal }) {
  if (daten.art === "keine") {
    return (
      <section className="rounded-card bg-fill p-5">
        <h2 className={`${abschnittTitel} mb-1`}>{t.naechstesMal}</h2>
        <p className="text-[15px] text-ink-2">{t.keineVorschlaege[daten.grund]}</p>
      </section>
    );
  }
  const woche = daten.eintraege[0]?.woche;
  return (
    <section className="rounded-card bg-accent-soft p-4 sm:p-5" aria-labelledby="naechstes-mal">
      <h2 id="naechstes-mal" className={abschnittTitel}>
        {t.naechstesMal}
      </h2>
      {woche !== undefined && (
        <p className="mb-3 mt-1 text-[15px] text-ink-2">{t.naechstesMalHilfe(woche)}</p>
      )}
      <ul className="space-y-2.5">
        {daten.eintraege.map((e) => {
          const grund = vorschlagGrundText(e.vorschlag.grund, e.schwererName);
          const muster = musterAusId(e.exerciseId);
          return (
            <li
              key={e.exerciseId}
              className="relative overflow-hidden rounded-2xl bg-surface py-3 pl-5 pr-4 shadow-card"
            >
              {muster && (
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 w-1.5 ${MUSTER_FARBE[muster].fl}`}
                />
              )}
              <Link
                href={`/verlauf/uebung/${e.exerciseId}`}
                className="inline-flex min-h-11 items-center font-semibold text-accent-ink hover:underline"
              >
                {e.name}
              </Link>
              <p className="text-sm text-ink-3">
                {t.zielLabel}: {e.zielText}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight">
                {formatSatz({
                  gewicht: e.vorschlag.gewicht,
                  wdh: e.vorschlag.wdh,
                  sekunden: e.vorschlag.sekunden,
                  meter: e.vorschlag.meter,
                  rpe: null,
                  tempo: e.vorschlag.tempo,
                })}
              </p>
              {grund && <p className="mt-0.5 text-sm font-medium text-accent-ink">{grund}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

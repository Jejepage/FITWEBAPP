import Link from "next/link";
import { karte } from "@/components/ui";
import { formatSatz } from "@/domain/satz-format";
import { de } from "@/i18n/de";
import { vorschlagGrundText } from "@/i18n/vorschlag-text";
import type { NaechstesMal } from "@/server/vorschlaege";

const t = de.verlauf;

export function NaechstesMalAnsicht({ daten }: { daten: NaechstesMal }) {
  if (daten.art === "keine") {
    return (
      <section className={`${karte} mb-4`}>
        <h2 className="mb-1 text-lg font-semibold">{t.naechstesMal}</h2>
        <p className="text-sm text-ink-2">{t.keineVorschlaege[daten.grund]}</p>
      </section>
    );
  }
  const woche = daten.eintraege[0]?.woche;
  return (
    <section className="mb-4" aria-labelledby="naechstes-mal">
      <h2 id="naechstes-mal" className="text-lg font-semibold">
        {t.naechstesMal}
      </h2>
      {woche !== undefined && (
        <p className="mb-2 text-sm text-ink-2">{t.naechstesMalHilfe(woche)}</p>
      )}
      <ul className="space-y-2">
        {daten.eintraege.map((e) => {
          const grund = vorschlagGrundText(e.vorschlag.grund, e.schwererName);
          return (
            <li key={e.exerciseId} className={karte}>
              <Link
                href={`/verlauf/uebung/${e.exerciseId}`}
                className="font-medium text-accent-ink"
              >
                {e.name}
              </Link>
              <p className="text-sm text-ink-3">
                {t.zielLabel}: {e.zielText}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatSatz({
                  gewicht: e.vorschlag.gewicht,
                  wdh: e.vorschlag.wdh,
                  sekunden: e.vorschlag.sekunden,
                  meter: e.vorschlag.meter,
                  rpe: null,
                  tempo: e.vorschlag.tempo,
                })}
              </p>
              {grund && <p className="text-sm text-accent-ink">{grund}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

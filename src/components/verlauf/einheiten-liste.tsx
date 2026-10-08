import Link from "next/link";
import { Badge } from "@/components/katalog/badge";
import { karte } from "@/components/ui";
import { de } from "@/i18n/de";
import { datumLang, monatJahr } from "@/lib/anzeige-datum";
import type { EinheitKurz } from "@/server/verlauf";

const t = de.verlauf;

/** Abgeschlossene Einheiten, nach Monat gruppiert (Reihenfolge wie übergeben: neueste zuerst). */
export function EinheitenListe({ einheiten }: { einheiten: EinheitKurz[] }) {
  const gruppen: { monat: string; liste: EinheitKurz[] }[] = [];
  for (const e of einheiten) {
    const monat = monatJahr(e.datum);
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte.monat === monat) letzte.liste.push(e);
    else gruppen.push({ monat, liste: [e] });
  }
  return (
    <div className="space-y-4">
      {gruppen.map((g) => (
        <section key={g.monat} aria-label={g.monat}>
          <h3 className="mb-1 text-sm font-medium text-neutral-500">{g.monat}</h3>
          <ul className="space-y-2">
            {g.liste.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/verlauf/einheit/${e.id}`}
                  className={`${karte} block min-h-14 hover:border-brand`}
                >
                  <span className="block font-medium">{datumLang(e.datum)}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {t.einheitZeile(e.einheit, e.woche)} · {t.saetze(e.saetze)}
                    {e.adHoc && <Badge farbe="hinweis">{t.adHoc}</Badge>}
                    {e.zusatzblock && <Badge>{t.mitZusatzblock}</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

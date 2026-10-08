import Link from "next/link";
import { Badge } from "@/components/katalog/badge";
import { IconChevron } from "@/components/katalog/icons-katalog";
import { gruppe } from "@/components/ui";
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
    <div className="space-y-5">
      {gruppen.map((g) => (
        <section key={g.monat} aria-label={g.monat}>
          <h3 className="mb-2 px-1 text-sm font-medium uppercase tracking-wide text-ink-3">
            {g.monat}
          </h3>
          <ul className={gruppe}>
            {g.liste.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/verlauf/einheit/${e.id}`}
                  className="press flex min-h-16 items-center gap-3.5 px-4 py-3 hover:bg-fill"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-lg font-bold text-accent-ink"
                  >
                    {e.einheit}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{datumLang(e.datum)}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                      {t.einheitZeile(e.einheit, e.woche)} · {t.saetze(e.saetze)}
                      {e.adHoc && <Badge farbe="hinweis">{t.adHoc}</Badge>}
                      {e.zusatzblock && <Badge>{t.mitZusatzblock}</Badge>}
                    </span>
                  </span>
                  <IconChevron className="size-5 shrink-0 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

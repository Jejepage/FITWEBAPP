import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/katalog/badge";
import { IconHakenKreis, IconZurueck } from "@/components/katalog/icons-katalog";
import { MusterPunkt } from "@/components/katalog/muster-ui";
import { BREITE, PageShell } from "@/components/page-shell";
import { NaechstesMalAnsicht } from "@/components/verlauf/naechstes-mal";
import { abschnittTitel, bannerOk, karte, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { db } from "@/db/client";
import { formatSatz } from "@/domain/satz-format";
import { MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { datumLang } from "@/lib/anzeige-datum";
import { MUSTER_FARBE } from "@/lib/muster-farbe";
import type { SearchParams } from "@/server/katalog-filter";
import { ladeNaechstesMal } from "@/server/vorschlaege";
import { ladeEinheit } from "@/server/verlauf";

export const dynamic = "force-dynamic";

const t = de.verlauf;

export default async function EinheitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const nummer = Number(id);
  const e = Number.isInteger(nummer) && nummer > 0 ? ladeEinheit(db, nummer) : null;
  if (!e || e.status === "laufend") notFound();
  const neu = sp.neu === "1" && e.status === "abgeschlossen";

  return (
    <>
      <div className={`mx-auto w-full ${BREITE.weit}`}>
        {neu ? (
          <p role="status" className={`${bannerOk} mb-4 flex items-center gap-3 font-semibold`}>
            <IconHakenKreis className="size-6 shrink-0 text-ok-ink" />
            {t.gespeichert}
          </p>
        ) : (
          <Link
            href="/verlauf"
            className="press -ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[17px] font-medium text-accent-ink hover:underline"
          >
            <IconZurueck className="size-5" />
            {t.zurueck}
          </Link>
        )}
      </div>
      <PageShell
        title={datumLang(e.datum)}
        breite="weit"
        untertitel={
          <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span>
              {t.einheitZeile(e.einheit, e.woche)} · {e.profilName}
            </span>
            {e.adHoc && <Badge farbe="hinweis">{t.adHoc}</Badge>}
            {e.zusatzblock && <Badge>{t.mitZusatzblock}</Badge>}
            {e.status === "abgebrochen" && <Badge farbe="grau">{t.abgebrochen}</Badge>}
          </span>
        }
      >
        {e.notiz && (
          <p className={`${karte} mb-5 text-[15px]`}>
            <span className="font-semibold">{t.notiz}:</span> {e.notiz}
          </p>
        )}

        {/* PC: Protokoll links, "Nächstes Mal" rechts (am Handy zuerst) */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
          {e.status === "abgeschlossen" && (
            <div className="lg:order-2 lg:sticky lg:top-8">
              <NaechstesMalAnsicht daten={ladeNaechstesMal(db, e.id)} />
            </div>
          )}

          <section aria-labelledby="protokoll-titel" className="min-w-0 lg:order-1">
            <h2 id="protokoll-titel" className={`${abschnittTitel} mb-3`}>
              {t.protokoll}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {e.gruppen.map((g) => (
                <li key={g.exerciseId} className={`${karte} relative overflow-hidden pl-6`}>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-1.5 ${MUSTER_FARBE[g.muster].fl}`}
                  />
                  <Link
                    href={`/verlauf/uebung/${g.exerciseId}`}
                    className="inline-flex min-h-11 items-center font-semibold text-accent-ink hover:underline"
                  >
                    {g.name}
                  </Link>
                  <p className="flex items-center gap-2 text-sm text-ink-3">
                    <MusterPunkt muster={g.muster} klasse="size-2" />
                    <span>
                      {MUSTER_NAMEN[g.muster]}
                      {g.ersetzt ? ` · ${t.ersetzt}` : ""}
                    </span>
                  </p>
                  <ol className="mt-3 divide-y divide-line text-[15px]">
                    {g.saetze.map((s) => (
                      <li key={s.runde} className="flex items-baseline gap-2 py-2">
                        <span className="text-ink-3">{t.runde(s.runde)}:</span>
                        <span className="font-medium">{formatSatz(s.werte)}</span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className={`${neu ? knopfPrimaer : knopfSekundaer} flex-1 lg:flex-none lg:px-8`}
              >
                {t.zurStart}
              </Link>
              {neu && (
                <Link href="/verlauf" className={`${knopfSekundaer} flex-1 lg:flex-none lg:px-8`}>
                  {t.zurueck}
                </Link>
              )}
            </div>
          </section>
        </div>
      </PageShell>
    </>
  );
}

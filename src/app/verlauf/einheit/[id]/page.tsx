import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/katalog/badge";
import { NaechstesMalAnsicht } from "@/components/verlauf/naechstes-mal";
import { karte, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { db } from "@/db/client";
import { formatSatz } from "@/domain/satz-format";
import { MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { datumLang } from "@/lib/anzeige-datum";
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
      {neu ? (
        <p
          role="status"
          className="mb-4 rounded-lg bg-emerald-50 p-3 font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          {t.gespeichert}
        </p>
      ) : (
        <Link href="/verlauf" className="mb-3 inline-block min-h-11 py-2 text-brand">
          ← {t.zurueck}
        </Link>
      )}
      <h1 className="text-2xl font-bold">{datumLang(e.datum)}</h1>
      <p className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-neutral-600 dark:text-neutral-400">
        {t.einheitZeile(e.einheit, e.woche)} · {e.profilName}
        {e.adHoc && <Badge farbe="hinweis">{t.adHoc}</Badge>}
        {e.zusatzblock && <Badge>{t.mitZusatzblock}</Badge>}
        {e.status === "abgebrochen" && <Badge farbe="grau">{t.abgebrochen}</Badge>}
      </p>
      {e.notiz && (
        <p className={`${karte} my-3 text-sm`}>
          <span className="font-medium">{t.notiz}:</span> {e.notiz}
        </p>
      )}

      <div className="mt-4">
        {e.status === "abgeschlossen" && <NaechstesMalAnsicht daten={ladeNaechstesMal(db, e.id)} />}
      </div>

      <h2 className="mb-2 text-lg font-semibold">{t.protokoll}</h2>
      <ul className="mb-6 space-y-2">
        {e.gruppen.map((g) => (
          <li key={g.exerciseId} className={karte}>
            <Link href={`/verlauf/uebung/${g.exerciseId}`} className="font-medium text-brand">
              {g.name}
            </Link>
            <span className="ml-2 text-sm text-neutral-500">
              {MUSTER_NAMEN[g.muster]}
              {g.ersetzt ? ` · ${t.ersetzt}` : ""}
            </span>
            <ol className="mt-1 space-y-0.5 text-sm">
              {g.saetze.map((s) => (
                <li key={s.runde}>
                  <span className="text-neutral-500">{t.runde(s.runde)}:</span>{" "}
                  {formatSatz(s.werte)}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        <Link href="/" className={`${neu ? knopfPrimaer : knopfSekundaer} flex-1`}>
          {t.zurStart}
        </Link>
        {neu && (
          <Link href="/verlauf" className={`${knopfSekundaer} flex-1`}>
            {t.zurueck}
          </Link>
        )}
      </div>
    </>
  );
}

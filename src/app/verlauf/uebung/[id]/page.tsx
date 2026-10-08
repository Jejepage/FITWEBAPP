import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/katalog/badge";
import { karte } from "@/components/ui";
import { VerlaufDiagramm, type DiagrammPunkt } from "@/components/verlauf/verlauf-diagramm";
import { db } from "@/db/client";
import { besterSatzText, type Metrik } from "@/domain/verlauf";
import { formatZahl } from "@/domain/satz-format";
import { MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { datumKurz } from "@/lib/anzeige-datum";
import type { SearchParams } from "@/server/katalog-filter";
import { ladeUebungsVerlauf } from "@/server/verlauf";

export const dynamic = "force-dynamic";

const t = de.verlauf;

export default async function UebungsVerlaufPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const daten = ladeUebungsVerlauf(db, id);
  if (!daten) notFound();
  const metrik: Metrik = sp.metrik === "volumen" ? "volumen" : "bester";
  const { verlauf } = daten;
  const einheit = metrik === "bester" ? verlauf.besterEinheit : verlauf.volumenEinheit;
  const metrikName = metrik === "bester" ? t.bester : t.volumen;
  const hilfe = metrik === "bester" ? t.besterHilfe[einheit] : t.volumenHilfe[einheit];

  const punkte: DiagrammPunkt[] = verlauf.zeilen.flatMap((z) => {
    const wert = metrik === "bester" ? z.besterWert : z.volumen;
    if (wert === null) return [];
    return [
      {
        datum: z.datum,
        wert,
        label: metrik === "bester" ? besterSatzText(z) : `${formatZahl(wert)} ${einheit}`,
        adHoc: z.adHoc,
      },
    ];
  });
  const hatAdHoc = verlauf.zeilen.some((z) => z.adHoc);
  const umschalter = (m: Metrik, text: string) => (
    <Link
      href={`/verlauf/uebung/${daten.id}${m === "volumen" ? "?metrik=volumen" : ""}`}
      aria-current={metrik === m ? "true" : undefined}
      className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-center text-base font-medium ${
        metrik === m ? "bg-brand text-white" : "border border-neutral-300 dark:border-neutral-700"
      }`}
    >
      {text}
    </Link>
  );

  return (
    <>
      <Link href="/verlauf" className="mb-3 inline-block min-h-11 py-2 text-brand">
        ← {t.zurueck}
      </Link>
      <h1 className="text-2xl font-bold">{daten.name}</h1>
      <p className="text-neutral-500">
        {daten.id} · {MUSTER_NAMEN[daten.muster]}
      </p>
      <Link
        href={`/katalog/${daten.id}`}
        className="mb-3 inline-flex min-h-11 items-center text-brand"
      >
        {t.zurUebung}
      </Link>

      {verlauf.zeilen.length === 0 ? (
        <p className={`${karte} text-neutral-600 dark:text-neutral-400`}>{t.keinVerlauf}</p>
      ) : (
        <>
          <nav aria-label={t.metrik} className="mb-3 flex gap-2">
            {umschalter("bester", t.bester)}
            {umschalter("volumen", t.volumen)}
          </nav>
          <section className={`${karte} mb-4`}>
            <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">{hilfe}</p>
            <VerlaufDiagramm
              punkte={punkte}
              einheit={einheit}
              titel={t.diagrammTitel(daten.name, metrikName)}
            />
            {hatAdHoc && <p className="mt-2 text-xs text-neutral-500">{t.adHocHinweis}</p>}
          </section>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{t.diagrammTitel(daten.name, metrikName)}</caption>
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">
                  <th scope="col" className="py-2 pr-2 font-medium">
                    {t.datum}
                  </th>
                  <th scope="col" className="py-2 pr-2 font-medium">
                    {t.besterSatz}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    {t.volumen} ({verlauf.volumenEinheit})
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...verlauf.zeilen].reverse().map((z) => (
                  <tr
                    key={z.workoutId}
                    className="border-b border-neutral-100 dark:border-neutral-900"
                  >
                    <td className="py-2 pr-2">
                      <Link
                        href={`/verlauf/einheit/${z.workoutId}`}
                        className="inline-flex min-h-11 items-center text-brand"
                      >
                        {datumKurz(z.datum)}
                      </Link>
                      <span className="block text-xs text-neutral-500">
                        {t.woche(z.woche)}
                        {z.adHoc ? ` · ${t.adHoc}` : ""}
                      </span>
                    </td>
                    <td className="py-2 pr-2">{besterSatzText(z)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {z.volumen.toLocaleString("de-DE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hatAdHoc && <Badge farbe="hinweis">{t.adHoc}</Badge>}
        </>
      )}
    </>
  );
}

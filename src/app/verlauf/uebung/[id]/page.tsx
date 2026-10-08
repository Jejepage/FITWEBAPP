import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/katalog/badge";
import { IconZurueck } from "@/components/katalog/icons-katalog";
import { MusterPunkt } from "@/components/katalog/muster-ui";
import { VideoKnopf } from "@/components/katalog/video-knopf";
import { BREITE, PageShell } from "@/components/page-shell";
import { karte, knopfSekundaer } from "@/components/ui";
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
      className={`press flex min-h-11 flex-1 items-center justify-center rounded-[0.65rem] px-4 text-center text-[15px] font-medium ${
        metrik === m ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"
      }`}
    >
      {text}
    </Link>
  );

  return (
    <>
      <div className={`mx-auto w-full ${BREITE.weit}`}>
        <Link
          href="/verlauf"
          className="press -ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[17px] font-medium text-accent-ink hover:underline"
        >
          <IconZurueck className="size-5" />
          {t.zurueck}
        </Link>
      </div>
      <PageShell
        title={daten.name}
        breite="weit"
        untertitel={
          <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <MusterPunkt muster={daten.muster} />
            <span>
              {daten.id} · {MUSTER_NAMEN[daten.muster]}
            </span>
          </span>
        }
        aktionen={
          <>
            <Link href={`/katalog/${daten.id}`} className={knopfSekundaer}>
              {t.zurUebung}
            </Link>
            <VideoKnopf url={daten.videoUrl} />
          </>
        }
      >
        {verlauf.zeilen.length === 0 ? (
          <p className={`${karte} text-ink-2`}>{t.keinVerlauf}</p>
        ) : (
          <>
            <nav
              aria-label={t.metrik}
              className="mb-4 flex rounded-xl bg-fill-2 p-0.5 sm:inline-flex sm:min-w-80"
            >
              {umschalter("bester", t.bester)}
              {umschalter("volumen", t.volumen)}
            </nav>
            {/* PC: großes Diagramm links (bleibt beim Scrollen stehen), Tabelle daneben */}
            <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start xl:gap-6">
              <section className={`${karte} min-w-0 xl:sticky xl:top-8`}>
                <p className="mb-3 text-[15px] text-ink-2">{hilfe}</p>
                <VerlaufDiagramm
                  punkte={punkte}
                  einheit={einheit}
                  titel={t.diagrammTitel(daten.name, metrikName)}
                  muster={daten.muster}
                />
                {hatAdHoc && (
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-3">
                    <Badge farbe="hinweis">{t.adHoc}</Badge>
                    {t.adHocHinweis}
                  </p>
                )}
              </section>

              <div className="min-w-0 overflow-x-auto rounded-card border border-line/50 bg-surface px-4 py-2 shadow-card">
                <table className="w-full text-left text-[15px]">
                  <caption className="sr-only">{t.diagrammTitel(daten.name, metrikName)}</caption>
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                      <th scope="col" className="py-3 pr-2 font-semibold">
                        {t.datum}
                      </th>
                      <th scope="col" className="py-3 pr-2 font-semibold">
                        {t.besterSatz}
                      </th>
                      <th scope="col" className="py-3 text-right font-semibold">
                        {t.volumen} ({verlauf.volumenEinheit})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...verlauf.zeilen].reverse().map((z) => (
                      <tr key={z.workoutId} className="border-b border-line/60 last:border-0">
                        <td className="py-1.5 pr-2">
                          <Link
                            href={`/verlauf/einheit/${z.workoutId}`}
                            className="inline-flex min-h-11 items-center font-medium text-accent-ink hover:underline"
                          >
                            {datumKurz(z.datum)}
                          </Link>
                          <span className="block text-xs text-ink-3">
                            {t.woche(z.woche)}
                            {z.adHoc ? ` · ${t.adHoc}` : ""}
                          </span>
                        </td>
                        <td className="py-1.5 pr-2">{besterSatzText(z)}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {z.volumen === null ? "–" : z.volumen.toLocaleString("de-DE")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </PageShell>
    </>
  );
}

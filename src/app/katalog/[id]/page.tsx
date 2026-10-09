import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/katalog/badge";
import { IconZurueck } from "@/components/katalog/icons-katalog";
import { Ladder } from "@/components/katalog/ladder";
import { MusterPunkt, StufenPunkte } from "@/components/katalog/muster-ui";
import { VideoKnopf } from "@/components/katalog/video-knopf";
import { BREITE, PageShell } from "@/components/page-shell";
import { videoLink } from "@/domain/youtube";
import { abschnittTitel, gruppe, karte, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { db } from "@/db/client";
import { beschreibeBedingung } from "@/domain/equipment";
import { MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { MUSTER_FARBE } from "@/lib/muster-farbe";
import { getExercise, getLadder } from "@/server/exercises";
import { ladeUebungsVerlauf } from "@/server/verlauf";
import { aktivUmschalten, pruefstatusSetzen } from "../actions";

export const dynamic = "force-dynamic";

const t = de.katalog;

function Abschnitt({
  titel,
  klasse = "",
  children,
}: {
  titel: string;
  klasse?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${karte} ${klasse}`}>
      <h2 className={`${abschnittTitel} mb-3`}>{titel}</h2>
      {children}
    </section>
  );
}

function Eckdatum({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-[15px] text-ink-3">{name}</dt>
      <dd className="min-w-0 text-right text-[15px] font-medium">{children}</dd>
    </div>
  );
}

export default async function UebungPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getExercise(db, id);
  if (!e) notFound();
  const kette = getLadder(db, id);
  const geprueft = e.pruefstatus === "geprueft";
  const hatVerlauf = (ladeUebungsVerlauf(db, id)?.verlauf.zeilen.length ?? 0) > 0;
  const farbe = MUSTER_FARBE[e.muster];

  return (
    <>
      <div className={`mx-auto w-full ${BREITE.weit}`}>
        <Link
          href="/katalog"
          className="press -ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[17px] font-medium text-accent-ink hover:underline"
        >
          <IconZurueck className="size-5" />
          {t.zurueckZurListe}
        </Link>
      </div>
      <PageShell
        title={e.name}
        breite="weit"
        untertitel={
          <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <MusterPunkt muster={e.muster} />
            <span>
              {e.id} · {MUSTER_NAMEN[e.muster]}
            </span>
          </span>
        }
      >
        <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
          <Badge klasse={`${farbe.soft} ${farbe.ink}`}>
            <StufenPunkte stufe={e.stufe} muster={e.muster} klasse="size-1.5" />
            {t.stufeBadge(e.stufe)}
          </Badge>
          {e.einseitig && <Badge>{t.einseitigBadge}</Badge>}
          <Badge farbe={geprueft ? "gut" : "hinweis"}>{geprueft ? t.geprueft : t.zuPruefen}</Badge>
          {!e.aktiv && <Badge farbe="grau">{t.inaktiv}</Badge>}
        </div>

        {/* Handy: eine Spalte (Aktionen und Video zuerst). PC: links Ausführung, Fehler, Hinweise,
            rechts Video, Eckdaten, Stufenleiter und Aktionen. */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-6">
          <div className="order-3 flex flex-col gap-4 lg:order-none">
            <Abschnitt titel={t.ausfuehrung}>
              <ol className="space-y-3">
                {e.ausfuehrung.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${farbe.soft} ${farbe.ink}`}
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </Abschnitt>

            <Abschnitt titel={t.fehler}>
              <ul className="space-y-2.5">
                {e.fehler.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-2 shrink-0 rounded-full bg-warn"
                    />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Abschnitt>

            <section className="rounded-card bg-accent-soft p-5">
              <h2 className={`${abschnittTitel} mb-2`}>{t.hinweise}</h2>
              <p>{e.hinweise}</p>
            </section>
          </div>

          <aside className="contents lg:sticky lg:top-8 lg:flex lg:flex-col lg:gap-4">
            {videoLink(e.videoUrl) && (
              <VideoKnopf url={e.videoUrl} className="order-2 w-full lg:order-none" />
            )}

            <div className="order-4 lg:order-none">
              <dl className={gruppe}>
                <Eckdatum name={t.equipment}>
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {beschreibeBedingung(e.equipment)
                      .split(" + ")
                      .map((teil) => (
                        <span
                          key={teil}
                          className="rounded-full bg-fill-2 px-2.5 py-0.5 text-sm font-medium text-ink-2"
                        >
                          {teil}
                        </span>
                      ))}
                  </span>
                </Eckdatum>
                <Eckdatum name={t.hauptmuskeln}>{e.hauptmuskeln.join(", ")}</Eckdatum>
                <Eckdatum name={t.belastung}>{t.belastungsarten[e.belastungsart]}</Eckdatum>
                <Eckdatum name={t.standardBereich}>
                  {e.standardBereich}
                  {e.einseitig ? " (pro Seite)" : ""}
                </Eckdatum>
                <Eckdatum name={t.steigerung}>
                  {e.steigerungsart.map((s) => t.steigerungsarten[s]).join(" → ")}
                </Eckdatum>
              </dl>
            </div>

            <Abschnitt titel={t.stufenleiter} klasse="order-5 lg:order-none">
              <Ladder kette={kette} aktuellId={e.id} />
            </Abschnitt>

            <div className="order-1 grid gap-2.5 sm:grid-cols-2 lg:order-none lg:grid-cols-1">
              <Link href={`/katalog/${e.id}/bearbeiten`} className={`${knopfPrimaer} w-full`}>
                {t.bearbeiten}
              </Link>
              <form
                action={pruefstatusSetzen.bind(null, e.id, geprueft ? "zu_pruefen" : "geprueft")}
              >
                <button type="submit" className={`${knopfSekundaer} w-full`}>
                  {geprueft ? t.markierenZuPruefen : t.markierenGeprueft}
                </button>
              </form>
              {hatVerlauf && (
                <Link href={`/verlauf/uebung/${e.id}`} className={`${knopfSekundaer} w-full`}>
                  {de.verlauf.verlaufAnsehen}
                </Link>
              )}
              <form action={aktivUmschalten.bind(null, e.id, !e.aktiv)}>
                <button type="submit" className={`${knopfSekundaer} w-full`}>
                  {e.aktiv ? t.deaktivieren : t.aktivieren}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </PageShell>
    </>
  );
}

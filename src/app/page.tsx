import Link from "next/link";
import { IconHantel, IconHaken, IconPfeilRechts, IconPlay } from "@/components/icons";
import { PageShell } from "@/components/page-shell";
import { Schalter } from "@/components/training/schalter";
import { bannerFehler, gruppe, knopfPrimaer, knopfText } from "@/components/ui";
import { BlockUebersicht } from "@/components/verlauf/block-uebersicht";
import { db } from "@/db/client";
import { MUSTER, MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { datumLang } from "@/lib/anzeige-datum";
import type { SearchParams } from "@/server/katalog-filter";
import { ladeStartInfo } from "@/server/start-info";
import { blockUebersicht, listeEinheiten } from "@/server/verlauf";
import { startTraining } from "./training/actions";

export const dynamic = "force-dynamic";

const t = de.start;
const FEHLER_CODES = ["kein_plan", "block_fertig", "equipment_unmoeglich"] as const;

/** Hero-Fläche: Farbverlauf mit weicher Dekoration; Text darauf immer in on-accent (Weiß) */
const heroRahmen =
  "fade-up relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-hero-from to-hero-to p-6 text-on-accent shadow-card sm:p-8 lg:p-10";
/** Weißer Knopf auf dem Hero, Schrift in der Verlaufsfarbe (in Hell und Dunkel über 4,5:1) */
const heroKnopf =
  "press flex min-h-[4.5rem] w-full select-none items-center justify-center gap-3 rounded-2xl bg-on-accent px-6 text-2xl font-bold text-hero-from shadow-lg hover:brightness-95";
/** Ruhige Karte für Zustände ohne Hero */
const zustandKarte =
  "fade-up rounded-[1.75rem] bg-surface p-8 text-center shadow-card sm:p-10 lg:p-12";

function HeroDeko() {
  return (
    <>
      <IconHantel
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 -z-10 size-60 rotate-12 text-on-accent opacity-15"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-20 -z-10 size-80 rounded-full bg-on-accent opacity-10"
      />
    </>
  );
}

/** Sechs Wochen-Segmente: erledigte gefüllt, aktuelle hervorgehoben, kommende blass */
function WochenSegmente({ woche, von }: { woche: number; von: number }) {
  return (
    <ol
      className="mt-7 grid items-end gap-2 sm:gap-3"
      style={{ gridTemplateColumns: `repeat(${von}, minmax(0, 1fr))` }}
      aria-label={`${de.verlauf.woche(woche)} von ${von}`}
    >
      {Array.from({ length: von }, (_, i) => i + 1).map((w) => {
        const aktuell = w === woche;
        const erledigt = w < woche;
        return (
          <li key={w} aria-current={aktuell ? "step" : undefined} className="text-center">
            <span
              className={`block rounded-full transition-all ${
                aktuell
                  ? "h-4 bg-on-accent shadow-lg ring-4 ring-on-accent/30"
                  : erledigt
                    ? "h-3 bg-on-accent"
                    : "h-3 bg-on-accent/30"
              }`}
            />
            <span
              className={`mt-2 block text-xs ${aktuell ? "font-bold" : "font-medium"}`}
              aria-hidden="true"
            >
              W{w}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function StartPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const fehlerParam = typeof sp.fehler === "string" ? sp.fehler : undefined;
  const fehler = FEHLER_CODES.find((c) => c === fehlerParam);
  const fehlendeMuster = (typeof sp.muster === "string" ? sp.muster : "")
    .split(",")
    .filter((m): m is (typeof MUSTER)[number] => (MUSTER as readonly string[]).includes(m))
    .map((m) => MUSTER_NAMEN[m])
    .join(", ");
  const info = ladeStartInfo(db);
  const bloecke = blockUebersicht(db);
  const letzte = listeEinheiten(db, 5);
  const [einheitTeil, wocheTeil] =
    info.art === "faellig"
      ? t.einheitWoche(info.einheit, info.woche, info.wochenPlan).split(" · ")
      : [];

  return (
    <PageShell title={t.titel} breite="weit">
      {fehler && (
        <p role="alert" className={`${bannerFehler} mb-5 font-medium`}>
          {fehler === "equipment_unmoeglich"
            ? t.fehler.equipment_unmoeglich(fehlendeMuster)
            : t.fehler[fehler]}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3">
          {info.art === "kein_plan" && (
            <section className={zustandKarte}>
              <span
                aria-hidden="true"
                className="mx-auto mb-5 grid size-20 place-items-center rounded-full bg-accent-soft text-accent-ink"
              >
                <IconHantel className="size-10" />
              </span>
              <p className="mb-2 text-2xl font-bold tracking-tight">{t.keinPlan}</p>
              <p className="mx-auto mb-7 max-w-md text-base text-ink-2">{t.keinPlanHilfe}</p>
              <Link href="/plan/neu" className={`${knopfPrimaer} min-h-14 px-8 text-lg`}>
                {t.planErstellen}
              </Link>
            </section>
          )}

          {info.art === "laufend" && (
            <section className={heroRahmen} aria-labelledby="laufend-titel">
              <HeroDeko />
              <h2
                id="laufend-titel"
                className="flex items-center gap-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl"
              >
                <span aria-hidden="true" className="relative flex size-4 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-on-accent opacity-60" />
                  <span className="relative inline-flex size-4 rounded-full bg-on-accent" />
                </span>
                {t.laufendTitel}
              </h2>
              <p className="mt-3 max-w-lg text-lg">{t.laufendHilfe(info.einheit, info.woche)}</p>
              <Link href={`/training/${info.workoutId}`} className={`${heroKnopf} mt-8`}>
                {t.fortsetzen}
                <IconPfeilRechts className="size-6" />
              </Link>
            </section>
          )}

          {info.art === "faellig" && (
            <>
              <section className={heroRahmen} aria-labelledby="naechste-titel">
                <HeroDeko />
                <p className="text-sm font-semibold uppercase tracking-wider">
                  {t.naechsteEinheit}
                </p>
                <h2 id="naechste-titel" className="mt-2 text-balance">
                  <span className="block text-4xl font-bold tracking-tight sm:text-5xl xl:text-6xl">
                    {einheitTeil}
                    <span className="sr-only"> ·</span>
                  </span>{" "}
                  <span className="mt-1 block text-3xl font-semibold tracking-tight sm:text-4xl xl:text-5xl">
                    {wocheTeil}
                  </span>
                </h2>
                <WochenSegmente woche={info.woche} von={info.wochenPlan} />

                <form action={startTraining} className="mt-8">
                  <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface text-ink">
                    <div className="px-4 py-4">
                      <p className="text-sm font-medium text-ink-3">{t.wochenvorgabe}</p>
                      <p className="mt-0.5 text-2xl font-bold tracking-tight">{info.vorgabeText}</p>
                      <p className="mt-2 inline-block rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-ink">
                        {t.fokus[info.fokus]}
                      </p>
                    </div>
                    <Schalter name="zusatzblock" defaultChecked={info.zusatzblockStandard}>
                      {t.zusatzblock}
                    </Schalter>
                  </div>
                  <button type="submit" className={`${heroKnopf} mt-5`}>
                    <IconPlay className="size-6" />
                    {t.starten}
                  </button>
                </form>
              </section>
            </>
          )}

          {info.art === "block_fertig" && (
            <section className={zustandKarte}>
              <span
                aria-hidden="true"
                className="mx-auto mb-5 grid size-20 place-items-center rounded-full bg-ok-soft text-ok-ink"
              >
                <IconHaken className="size-10" />
              </span>
              <p className="mb-2 text-2xl font-bold tracking-tight">{t.blockFertig}</p>
              <p className="mx-auto mb-7 max-w-md text-base text-ink-2">{t.blockFertigHilfe}</p>
              <Link href="/plan" className={`${knopfPrimaer} min-h-14 px-8 text-lg`}>
                {t.zumPlan}
              </Link>
            </section>
          )}
        </div>

        {(bloecke.length > 0 || letzte.liste.length > 0) && (
          <div className="lg:col-span-2">
            <BlockUebersicht bloecke={bloecke} />
            {letzte.liste.length > 0 && (
              <section aria-labelledby="letzte-titel">
                <h2 id="letzte-titel" className="mb-2 text-xl font-semibold tracking-tight">
                  {de.verlauf.einheiten}
                </h2>
                <ul className={gruppe}>
                  {letzte.liste.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/verlauf/einheit/${e.id}`}
                        className="press flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-fill"
                      >
                        <span
                          aria-hidden="true"
                          className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-lg font-bold text-accent-ink"
                        >
                          {e.einheit}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold leading-snug">
                            {de.verlauf.einheitZeile(e.einheit, e.woche)}
                          </span>
                          <span className="block text-sm text-ink-3">
                            {datumLang(e.datum)} · {de.verlauf.saetze(e.saetze)}
                            {e.zusatzblock ? ` · ${de.verlauf.mitZusatzblock}` : ""}
                          </span>
                        </span>
                        <IconPfeilRechts className="size-4 shrink-0 text-ink-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
                {letzte.gesamt > letzte.liste.length && (
                  <Link href="/verlauf" className={`${knopfText} mt-1`}>
                    {de.verlauf.alleAnzeigen(letzte.gesamt)}
                  </Link>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

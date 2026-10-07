import Link from "next/link";
import { karte, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { db } from "@/db/client";
import { de } from "@/i18n/de";
import type { SearchParams } from "@/server/katalog-filter";
import { ladeStartInfo } from "@/server/start-info";
import { startTraining } from "./training/actions";

export const dynamic = "force-dynamic";

const t = de.start;
const FEHLER_CODES = ["kein_plan", "block_fertig"] as const;

export default async function StartPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const fehlerParam = typeof sp.fehler === "string" ? sp.fehler : undefined;
  const fehler = FEHLER_CODES.find((c) => c === fehlerParam);
  const info = ladeStartInfo(db);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t.titel}</h1>
      {fehler && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {t.fehler[fehler]}
        </p>
      )}

      {info.art === "kein_plan" && (
        <section className={`${karte} text-center`}>
          <p className="mb-2 font-medium">{t.keinPlan}</p>
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">{t.keinPlanHilfe}</p>
          <Link href="/plan/neu" className={knopfPrimaer}>
            {t.planErstellen}
          </Link>
        </section>
      )}

      {info.art === "laufend" && (
        <section className={karte} aria-labelledby="laufend-titel">
          <h2 id="laufend-titel" className="mb-1 text-lg font-semibold">
            {t.laufendTitel}
          </h2>
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
            {t.laufendHilfe(info.einheit, info.woche)}
          </p>
          <Link
            href={`/training/${info.workoutId}`}
            className={`${knopfPrimaer} w-full min-h-14 text-lg`}
          >
            {t.fortsetzen}
          </Link>
        </section>
      )}

      {info.art === "faellig" && (
        <section className={karte} aria-labelledby="naechste-titel">
          <p className="text-sm text-neutral-500">{t.naechsteEinheit}</p>
          <h2 id="naechste-titel" className="text-2xl font-bold">
            {t.einheitWoche(info.einheit, info.woche, info.wochenPlan)}
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium">{t.wochenvorgabe}:</span> {info.vorgabeText}
          </p>
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
            {t.fokus[info.fokus]}
          </p>
          <form action={startTraining}>
            <label className="mb-4 flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                name="zusatzblock"
                defaultChecked={info.zusatzblockStandard}
                className="size-6"
              />
              <span>{t.zusatzblock}</span>
            </label>
            <button type="submit" className={`${knopfPrimaer} w-full min-h-14 text-lg`}>
              {t.starten}
            </button>
          </form>
        </section>
      )}

      {info.art === "block_fertig" && (
        <section className={`${karte} text-center`}>
          <p className="mb-2 text-lg font-semibold">{t.blockFertig}</p>
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
            {t.blockFertigHilfe}
          </p>
          <Link href="/plan" className={knopfSekundaer}>
            {t.zumPlan}
          </Link>
        </section>
      )}
    </>
  );
}

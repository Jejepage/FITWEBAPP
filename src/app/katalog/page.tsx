import Link from "next/link";
import { ExerciseCard } from "@/components/katalog/exercise-card";
import { FilterForm } from "@/components/katalog/filter-form";
import { knopfPrimaer } from "@/components/ui";
import { db } from "@/db/client";
import { MUSTER, MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { listExercises } from "@/server/exercises";
import { hatFilter, parseKatalogFilter, type SearchParams } from "@/server/katalog-filter";
import { getProfile, listProfiles } from "@/server/profiles";

export const dynamic = "force-dynamic";

const t = de.katalog;

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const auswahl = parseKatalogFilter(await searchParams);
  const profile = listProfiles(db);
  const profil = auswahl.profilId ? getProfile(db, auswahl.profilId) : null;
  const { items, gesamt } = listExercises(db, {
    muster: auswahl.muster,
    stufe: auswahl.stufe,
    einseitig: auswahl.einseitig,
    profilEquipment: profil?.equipment,
    inaktive: auswahl.inaktive,
    nurZuPruefen: auswahl.nurZuPruefen,
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.titel}</h1>
        <Link href="/katalog/neu" className={knopfPrimaer}>
          {t.neu}
        </Link>
      </div>
      <FilterForm filter={auswahl} profile={profile} aktiv={hatFilter(auswahl)} />
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400" aria-live="polite">
        {t.anzahl(items.length, gesamt)}
      </p>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          {t.leer}
        </p>
      ) : (
        MUSTER.map((m) => {
          const gruppe = items.filter((e) => e.muster === m);
          if (gruppe.length === 0) return null;
          return (
            <section key={m} className="mb-6" aria-labelledby={`muster-${m}`}>
              <h2 id={`muster-${m}`} className="mb-2 text-lg font-semibold">
                {MUSTER_NAMEN[m]}{" "}
                <span className="text-sm font-normal text-neutral-500">({m})</span>
              </h2>
              <ul className="space-y-2">
                {gruppe.map((e) => (
                  <li key={e.id}>
                    <ExerciseCard e={e} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}

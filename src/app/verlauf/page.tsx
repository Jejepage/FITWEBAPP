import Link from "next/link";
import { BlockUebersicht } from "@/components/verlauf/block-uebersicht";
import { EinheitenListe } from "@/components/verlauf/einheiten-liste";
import { karte, knopfSekundaer } from "@/components/ui";
import { db } from "@/db/client";
import { MUSTER, MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import type { SearchParams } from "@/server/katalog-filter";
import { blockUebersicht, listeEinheiten, uebungenMitVerlauf } from "@/server/verlauf";

export const dynamic = "force-dynamic";

const t = de.verlauf;
const LIMIT = 50;

export default async function VerlaufPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const alle = sp.alle === "1";
  const { liste, gesamt } = listeEinheiten(db, alle ? undefined : LIMIT);
  const uebungen = uebungenMitVerlauf(db);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t.titel}</h1>
      <BlockUebersicht bloecke={blockUebersicht(db)} />

      <section aria-labelledby="einheiten-titel" className="mb-6">
        <h2 id="einheiten-titel" className="mb-2 text-lg font-semibold">
          {t.einheiten}
        </h2>
        {liste.length === 0 ? (
          <div className={`${karte} text-center`}>
            <p className="font-medium">{t.keineEinheiten}</p>
            <p className="text-sm text-ink-2">{t.keineEinheitenHilfe}</p>
          </div>
        ) : (
          <EinheitenListe einheiten={liste} />
        )}
        {!alle && gesamt > LIMIT && (
          <Link href="/verlauf?alle=1" className={`${knopfSekundaer} mt-3 w-full`}>
            {t.alleAnzeigen(gesamt)}
          </Link>
        )}
      </section>

      <section aria-labelledby="uebungen-titel">
        <h2 id="uebungen-titel" className="text-lg font-semibold">
          {t.uebungen}
        </h2>
        <p className="mb-2 text-sm text-ink-2">{t.uebungenHilfe}</p>
        {uebungen.length === 0 ? (
          <p className="text-sm text-ink-3">{t.keineUebungen}</p>
        ) : (
          MUSTER.map((m) => {
            const liste = uebungen.filter((u) => u.muster === m);
            if (liste.length === 0) return null;
            return (
              <div key={m} className="mb-3">
                <h3 className="mb-1 text-sm font-medium text-ink-3">{MUSTER_NAMEN[m]}</h3>
                <ul className="space-y-2">
                  {liste.map((u) => (
                    <li key={u.id}>
                      <Link
                        href={`/verlauf/uebung/${u.id}`}
                        className={`${karte} flex min-h-14 items-center justify-between gap-3 hover:border-accent`}
                      >
                        <span className="font-medium">{u.name}</span>
                        <span className="shrink-0 text-sm text-ink-3">
                          {t.einheitenAnzahl(u.einheiten)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}

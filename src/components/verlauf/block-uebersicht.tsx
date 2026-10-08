import { karte } from "@/components/ui";
import { de } from "@/i18n/de";
import { datumKurz } from "@/lib/anzeige-datum";
import type { BlockZeile } from "@/server/verlauf";

const t = de.verlauf;

/** Ein Block: je Woche ein Kästchen pro geplanter Einheit, gefüllt wenn absolviert. */
function Wochen({ block }: { block: BlockZeile }) {
  return (
    <ol
      className="mt-3 grid grid-cols-6 gap-2"
      aria-label={t.blockStand(block.absolviert, block.geplant)}
    >
      {block.wochen.map((erledigt, i) => (
        <li
          key={i}
          aria-label={`${t.woche(i + 1)}: ${t.blockStand(erledigt, block.einheitenProWoche)}`}
          className="text-center"
        >
          <div className="mb-1 flex justify-center gap-1" aria-hidden="true">
            {Array.from({ length: block.einheitenProWoche }, (_, k) => (
              <span
                key={k}
                className={`h-3 w-3 rounded-sm ${k < erledigt ? "bg-brand" : "border border-neutral-400 dark:border-neutral-600"}`}
              />
            ))}
          </div>
          <span className="text-xs text-neutral-500">W{i + 1}</span>
        </li>
      ))}
    </ol>
  );
}

export function BlockUebersicht({ bloecke }: { bloecke: BlockZeile[] }) {
  if (bloecke.length === 0) return null;
  const [aktuell, ...frueher] = bloecke;
  if (!aktuell) return null;
  return (
    <section aria-labelledby="bloecke-titel" className="mb-6">
      <h2 id="bloecke-titel" className="mb-2 text-lg font-semibold">
        {t.bloecke}
      </h2>
      <div className={karte}>
        <p className="font-medium">
          {t.blockTitel(datumKurz(aktuell.startDatum))}
          <span className="ml-2 text-sm font-normal text-neutral-500">
            {aktuell.status === "aktiv" ? t.aktiv : t.abgeschlossen}
          </span>
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t.blockStand(aktuell.absolviert, aktuell.geplant)} · {aktuell.profilName}
        </p>
        <Wochen block={aktuell} />
      </div>
      {frueher.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          {frueher.map((b) => (
            <li key={b.planId} className="flex justify-between gap-3 px-1">
              <span>{t.blockTitel(datumKurz(b.startDatum))}</span>
              <span>{t.blockStand(b.absolviert, b.geplant)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

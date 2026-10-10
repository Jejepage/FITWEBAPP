import { IconHakenKreis } from "@/components/katalog/icons-katalog";
import { Badge } from "@/components/katalog/badge";
import { abschnittTitel, gruppe, karte } from "@/components/ui";
import { de } from "@/i18n/de";
import { datumKurz } from "@/lib/anzeige-datum";
import type { BlockZeile } from "@/server/verlauf";

const t = de.verlauf;

/** Ein Block als sechs Wochen-Segmente: je geplanter Einheit ein Balken, gefüllt wenn absolviert. */
function Wochen({ block }: { block: BlockZeile }) {
  return (
    <ol
      className="mt-5 grid grid-cols-6 gap-2 sm:gap-3"
      aria-label={t.blockStand(block.absolviert, block.geplant)}
    >
      {block.wochen.map((erledigt, i) => (
        <li
          key={i}
          aria-label={`${t.woche(i + 1)}: ${t.blockStand(erledigt, block.einheitenProWoche)}`}
          className="text-center"
        >
          <div className="mb-1.5 flex flex-col gap-1" aria-hidden="true">
            {Array.from({ length: block.einheitenProWoche }, (_, k) => (
              <span
                key={k}
                className={`h-3 rounded-full ${k < erledigt ? "bg-accent" : "bg-fill-2"}`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-ink-3">W{i + 1}</span>
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
    <section aria-labelledby="bloecke-titel" className="mb-8">
      <h2 id="bloecke-titel" className={`${abschnittTitel} mb-3`}>
        {t.bloecke}
      </h2>
      <div className={karte}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold">{t.blockTitel(datumKurz(aktuell.startDatum))}</p>
            <p className="text-[15px] text-ink-2">
              {t.blockStand(aktuell.absolviert, aktuell.geplant)}
            </p>
          </div>
          <Badge farbe={aktuell.status === "aktiv" ? "akzent" : "gut"}>
            {aktuell.status === "aktiv" ? t.aktiv : t.abgeschlossen}
          </Badge>
        </div>
        <Wochen block={aktuell} />
      </div>
      {frueher.length > 0 && (
        <ul className={`${gruppe} mt-3`}>
          {frueher.map((b) => (
            <li key={b.planId} className="flex min-h-12 items-center gap-3 px-4 py-3 text-[15px]">
              <IconHakenKreis
                className={`size-5 shrink-0 ${b.absolviert >= b.geplant ? "text-ok-ink" : "text-ink-3"}`}
              />
              <span className="min-w-0 flex-1">{t.blockTitel(datumKurz(b.startDatum))}</span>
              <span className="shrink-0 text-ink-2">{t.blockStand(b.absolviert, b.geplant)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

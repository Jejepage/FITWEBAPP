import Link from "next/link";
import { eingabe } from "@/components/ui";
import { BLOCK_RUNDEN, slotKey, type SlotZuordnung } from "@/domain/plan-types";
import { MUSTER_NAMEN, type Block, type Einheit, type Exercise, type Muster } from "@/domain/types";
import { de } from "@/i18n/de";

const t = de.plan;
const EINHEITEN: Einheit[] = ["A", "B"];
const BLOECKE: Block[] = ["1", "2", "Z"];

/**
 * Beide Einheiten mit ihren Blöcken. Ohne `kandidaten` als reine Ansicht (Links in den Katalog),
 * mit `kandidaten` als Auswahllisten je Slot (Feldname `slot_A-1-1`), ohne JavaScript nutzbar.
 */
export function PlanAnsicht({
  slots,
  uebungen,
  zusatzblockAktiv,
  kandidaten,
}: {
  slots: readonly SlotZuordnung[];
  uebungen: ReadonlyMap<string, Exercise>;
  zusatzblockAktiv: boolean;
  kandidaten?: Record<Muster, Exercise[]>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {EINHEITEN.map((einheit) => (
        <section
          key={einheit}
          aria-labelledby={`einheit-${einheit}`}
          className="rounded-xl border border-line bg-surface p-4"
        >
          <h2 id={`einheit-${einheit}`} className="mb-3 text-xl font-semibold">
            {t.einheit(einheit)}
          </h2>
          {BLOECKE.map((block) => {
            const imBlock = slots.filter((s) => s.einheit === einheit && s.block === block);
            const aus = block === "Z" && !zusatzblockAktiv;
            return (
              <div key={block} className={`mb-4 last:mb-0 ${aus ? "opacity-60" : ""}`}>
                <h3 className="mb-1 text-sm font-semibold text-ink-2">
                  {t.block[block]} · {t.runden(BLOCK_RUNDEN[block])}
                </h3>
                <ol className="space-y-2">
                  {imBlock.map((s) => {
                    const u = uebungen.get(s.exerciseId);
                    const key = slotKey(s);
                    return (
                      <li key={key}>
                        <div className="text-xs text-ink-3">{MUSTER_NAMEN[s.muster]}</div>
                        {kandidaten ? (
                          <select
                            name={`slot_${key}`}
                            defaultValue={s.exerciseId}
                            className={eingabe}
                            aria-label={`${t.einheit(einheit)}, ${t.block[block]}, ${MUSTER_NAMEN[s.muster]}`}
                          >
                            {kandidaten[s.muster].map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.name} ({t.form.stufeKurz(k.stufe)}
                                {k.einseitig ? `, ${t.form.einseitigKurz}` : ""})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Link
                            href={`/katalog/${s.exerciseId}`}
                            className="inline-flex min-h-11 items-center font-medium text-accent-ink"
                          >
                            {u?.name ?? s.exerciseId}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {aus && !kandidaten && (
                  <p className="mt-1 text-xs text-ink-3">{t.zusatzAusHinweis}</p>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

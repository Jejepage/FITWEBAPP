import Link from "next/link";
import { IconChevron } from "@/components/katalog/icons-katalog";
import { MusterPunkt } from "@/components/katalog/muster-ui";
import { eingabe } from "@/components/ui";
import { BLOCK_RUNDEN, slotKey, type SlotZuordnung } from "@/domain/plan-types";
import { MUSTER_NAMEN, type Block, type Einheit, type Exercise, type Muster } from "@/domain/types";
import { de } from "@/i18n/de";
import { MUSTER_FARBE } from "@/lib/muster-farbe";

const t = de.plan;
const EINHEITEN: Einheit[] = ["A", "B"];
const BLOECKE: Block[] = ["1", "2", "Z"];
// Auswahlliste auf getönter Slot-Fläche: weißer Grund statt grauer Eingabefläche
const auswahlKlasse = eingabe.replace(" bg-fill ", " bg-surface ");

/**
 * Beide Einheiten mit ihren Blöcken. Ohne `kandidaten` als reine Ansicht (Links in den Katalog),
 * mit `kandidaten` als Auswahllisten je Slot (Feldname `slot_A-1-1`), ohne JavaScript nutzbar.
 * Ein ausgeschalteter Zusatzblock erscheint gestrichelt, aber voll lesbar (keine Abdunklung).
 */
export function PlanAnsicht({
  slots,
  uebungen,
  zusatzblockAktiv,
  kandidaten,
  rasterKlasse = "md:grid-cols-2",
}: {
  slots: readonly SlotZuordnung[];
  uebungen: ReadonlyMap<string, Exercise>;
  zusatzblockAktiv: boolean;
  kandidaten?: Record<Muster, Exercise[]>;
  /** Spaltenraster der beiden Einheiten (ausgeschriebene Tailwind-Klassen) */
  rasterKlasse?: string;
}) {
  return (
    <div className={`grid gap-4 lg:gap-6 ${rasterKlasse}`}>
      {EINHEITEN.map((einheit) => (
        <section
          key={einheit}
          aria-labelledby={`einheit-${einheit}`}
          className="rounded-card border border-line/50 bg-surface p-4 shadow-card sm:p-5"
        >
          <h2
            id={`einheit-${einheit}`}
            className="mb-4 flex items-center gap-3 text-2xl font-bold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-hero-from to-hero-to text-lg font-bold text-on-accent"
            >
              {einheit}
            </span>
            {t.einheit(einheit)}
          </h2>
          {BLOECKE.map((block) => {
            const imBlock = slots.filter((s) => s.einheit === einheit && s.block === block);
            const aus = block === "Z" && !zusatzblockAktiv;
            return (
              <div
                key={block}
                className={`mb-5 last:mb-0 ${aus ? "rounded-2xl border border-dashed border-line p-3" : ""}`}
              >
                <h3 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-3">
                  {t.block[block]} · {t.runden(BLOCK_RUNDEN[block])}
                </h3>
                {aus && !kandidaten && (
                  <p className="mb-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-ink">
                    {t.zusatzAusHinweis}
                  </p>
                )}
                <ol className="space-y-2">
                  {imBlock.map((s) => {
                    const u = uebungen.get(s.exerciseId);
                    const key = slotKey(s);
                    const farbe = MUSTER_FARBE[s.muster];
                    return (
                      <li
                        key={key}
                        className={`relative overflow-hidden rounded-2xl py-2.5 pl-5 pr-3 ${aus ? "bg-fill" : farbe.soft}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute inset-y-0 left-0 w-1.5 ${farbe.fl}`}
                        />
                        <div
                          className={`mb-0.5 flex items-center gap-2 text-xs font-semibold ${aus ? "text-ink-2" : farbe.ink}`}
                        >
                          <MusterPunkt muster={s.muster} klasse="size-2" />
                          {MUSTER_NAMEN[s.muster]}
                        </div>
                        {kandidaten ? (
                          <select
                            name={`slot_${key}`}
                            defaultValue={s.exerciseId}
                            className={auswahlKlasse}
                            aria-label={`${t.einheit(einheit)}, ${t.block[block]}, ${MUSTER_NAMEN[s.muster]}`}
                          >
                            {kandidaten[s.muster].map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.name} ({t.form.stufeKurz(k.stufe)}
                                {k.einseitig ? `, ${t.form.einseitigKurz}` : ""}
                                {k.ersatz ? `, ${t.form.ersatzKurz}` : ""})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Link
                            href={`/katalog/${s.exerciseId}`}
                            className="press flex min-h-11 items-center justify-between gap-2 font-semibold text-ink hover:underline"
                          >
                            {u?.name ?? s.exerciseId}
                            <IconChevron className="size-4 shrink-0 text-ink-3" />
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

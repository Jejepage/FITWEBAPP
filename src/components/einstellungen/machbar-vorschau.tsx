import { FehlerBanner } from "@/components/form-felder";
import { hilfstext, karte, kopfzeileKlein } from "@/components/ui";
import { zaehleMachbar } from "@/domain/equipment";
import { MUSTER, MUSTER_NAMEN, type EquipmentArt, type Exercise } from "@/domain/types";
import { de } from "@/i18n/de";
import { MUSTER_FARBE } from "@/lib/muster-farbe";

const t = de.equipment;

/**
 * Zeigt, wie viele aktive Übungen je Bewegungsmuster mit dem Equipment machbar sind: Punkt, Zahl
 * und Balken in der Musterfarbe (Anteil an allen aktiven Übungen des Musters); 0 wird rot markiert.
 */
export function MachbarVorschau({
  uebungen,
  equipment,
}: {
  uebungen: Pick<Exercise, "muster" | "equipment" | "aktiv">[];
  equipment: EquipmentArt[];
}) {
  const anzahl = zaehleMachbar(uebungen, equipment);
  const leer = MUSTER.filter((m) => anzahl[m] === 0);
  return (
    <section className="min-w-0" aria-labelledby="machbar-titel">
      <h2 id="machbar-titel" className={kopfzeileKlein}>
        {t.machbarTitel}
      </h2>
      <div className={`${karte} @container`}>
        <p className={`${hilfstext} mb-4`}>{t.machbarHilfe}</p>
        {leer.map((m) => (
          <FehlerBanner key={m}>{t.machbarWarnung(MUSTER_NAMEN[m])}</FehlerBanner>
        ))}
        <dl className="grid gap-2 @md:grid-cols-2">
          {MUSTER.map((m) => {
            const gesamt = uebungen.filter((u) => u.aktiv && u.muster === m).length;
            const anteil = gesamt > 0 ? Math.round((anzahl[m] / gesamt) * 100) : 0;
            const keine = anzahl[m] === 0;
            const farbe = MUSTER_FARBE[m];
            return (
              <div
                key={m}
                className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-xl px-3.5 py-3 ${
                  keine ? "bg-bad-soft" : "bg-fill"
                }`}
              >
                <dt className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-ink">
                  <span
                    aria-hidden="true"
                    className={`size-2.5 shrink-0 rounded-full ${keine ? "bg-bad" : farbe.fl}`}
                  />
                  {MUSTER_NAMEN[m]}
                </dt>
                <dd
                  className={`text-xl font-bold leading-none tabular-nums ${
                    keine ? "text-bad-ink" : farbe.ink
                  }`}
                >
                  {anzahl[m]}
                </dd>
                <dd
                  aria-hidden="true"
                  className="col-span-2 h-1.5 overflow-hidden rounded-full bg-fill-2"
                >
                  <span
                    className={`block h-full rounded-full transition-[width] duration-500 ${farbe.fl}`}
                    style={{ width: `${anteil}%` }}
                  />
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

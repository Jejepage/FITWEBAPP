import { zaehleMachbar } from "@/domain/equipment";
import { MUSTER, MUSTER_NAMEN, type EquipmentArt, type Exercise } from "@/domain/types";
import { de } from "@/i18n/de";

const t = de.profil;

/** Zeigt, wie viele aktive Übungen je Bewegungsmuster mit dem Equipment machbar sind. */
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
    <section className="mb-6 rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-1 text-lg font-semibold">{t.machbarTitel}</h2>
      <p className="mb-3 text-sm text-ink-3">{t.machbarHilfe}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm sm:grid-cols-[1fr_auto_1fr_auto]">
        {MUSTER.map((m) => (
          <div key={m} className="contents">
            <dt>{MUSTER_NAMEN[m]}</dt>
            <dd className={anzahl[m] === 0 ? "font-semibold text-bad-ink" : "font-medium"}>
              {anzahl[m]}
            </dd>
          </div>
        ))}
      </dl>
      {leer.map((m) => (
        <p key={m} role="alert" className="mt-3 text-sm font-medium text-bad-ink">
          {t.machbarWarnung(MUSTER_NAMEN[m])}
        </p>
      ))}
    </section>
  );
}

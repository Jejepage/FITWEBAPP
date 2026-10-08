import Link from "next/link";
import { Checkbox, FehlerBanner, Feld, Gruppe } from "@/components/form-felder";
import { PlanAnsicht } from "@/components/plan/plan-ansicht";
import { PlanHinweise } from "@/components/plan/plan-hinweise";
import { eingabe, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { db } from "@/db/client";
import { generierePlan, kandidatenFuerSlot, pruefePlan } from "@/domain/generator";
import {
  loesePlanWerteAuf,
  parsePlanRohwerte,
  planBasis,
  quelleAusSearchParams,
} from "@/domain/plan-form";
import { slotKey, type GeneratorEingabe, type SlotZuordnung } from "@/domain/plan-types";
import { MUSTER, MUSTER_NAMEN, type Muster } from "@/domain/types";
import { de } from "@/i18n/de";
import { alleUebungen } from "@/server/exercises";
import { ladePlanStandard } from "@/server/plan-defaults";
import { getPlan, uebungsIdsVonPlan, type PlanFehlerCode } from "@/server/plans";
import { listProfiles } from "@/server/profiles";
import type { SearchParams } from "@/server/katalog-filter";
import { planSpeichern } from "../actions";

export const dynamic = "force-dynamic";

const t = de.plan;
const f = t.form;

const FEHLER_CODES = Object.keys(t.fehler) as PlanFehlerCode[];

export default async function PlanNeuPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const profile = listProfiles(db);
  const roh = parsePlanRohwerte(quelleAusSearchParams(sp));
  const standard = ladePlanStandard(db, undefined, roh.vorgaengerId);
  if (!standard) return <FehlerBanner>{t.fehler.profil_unbekannt}</FehlerBanner>;

  const { werte: aufgeloest, fehler: feldFehler } = loesePlanWerteAuf(roh, standard);
  // Unbekanntes Profil in der URL: Standardprofil nehmen.
  const profil =
    profile.find((p) => p.id === aufgeloest.profilId) ??
    profile.find((p) => p.id === standard.profilId)!;
  const vorgaenger = aufgeloest.vorgaengerId ? getPlan(db, aufgeloest.vorgaengerId) : null;
  const werte = {
    ...aufgeloest,
    profilId: profil.id,
    vorgaengerId: vorgaenger?.id ?? null,
  };
  const basis = planBasis(werte);

  const fehlerParam = typeof sp.fehler === "string" ? sp.fehler : undefined;
  const speicherFehler = FEHLER_CODES.find((c) => c === fehlerParam);

  const uebungen = alleUebungen(db);
  const generatorEingabe: GeneratorEingabe = {
    uebungen,
    equipment: profil.equipment,
    stufen: werte.stufen,
    vorherVerwendet: vorgaenger ? uebungsIdsVonPlan(db, vorgaenger.id) : undefined,
    seed: werte.seed,
  };
  const ergebnis = generierePlan(generatorEingabe);

  let slots: SlotZuordnung[] = [];
  let kandidaten: Record<Muster, typeof uebungen> | undefined;
  let hinweise: ReturnType<typeof pruefePlan> = [];
  if (ergebnis.ok) {
    kandidaten = Object.fromEntries(
      MUSTER.map((m) => [m, kandidatenFuerSlot(generatorEingabe, m)]),
    ) as Record<Muster, typeof uebungen>;
    // Manuelle Wahl aus der URL nur übernehmen, wenn sie noch ein passender Kandidat ist.
    slots = ergebnis.slots.map((s) => {
      const gewaehlt = werte.auswahl[slotKey(s)];
      return gewaehlt && kandidaten![s.muster].some((k) => k.id === gewaehlt)
        ? { ...s, exerciseId: gewaehlt }
        : s;
    });
    hinweise = pruefePlan(slots, generatorEingabe);
  }
  const uebungenNachId = new Map(uebungen.map((u) => [u.id, u]));

  return (
    <>
      <Link href="/plan" className="mb-3 inline-block min-h-11 py-2 text-accent-ink">
        ← {t.zurueck}
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{t.neuTitel}</h1>

      {speicherFehler && <FehlerBanner>{t.fehler[speicherFehler]}</FehlerBanner>}
      {feldFehler.startDatum && <FehlerBanner>{t.fehler.datum_ungueltig}</FehlerBanner>}

      <form method="get" action="/plan/neu">
        <input type="hidden" name="gesendet" value="1" />
        <input type="hidden" name="seed" value={werte.seed} />
        <input type="hidden" name="basis" value={basis} />
        {vorgaenger && <input type="hidden" name="vorgaenger" value={vorgaenger.id} />}
        {vorgaenger && <p className="mb-3 text-sm text-ink-3">{f.folgeblock}</p>}

        <details open className="mb-4 rounded-xl border border-line bg-surface">
          <summary className="min-h-11 cursor-pointer list-none px-4 py-3 font-medium">
            {f.eingaben}
          </summary>
          <div className="border-t border-line p-4">
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Feld label={f.profil}>
                <select name="profil" defaultValue={String(profil.id)} className={eingabe}>
                  {profile.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Feld>
              <Feld label={f.startDatum}>
                <input
                  type="date"
                  name="start"
                  defaultValue={werte.startDatum}
                  className={eingabe}
                />
              </Feld>
            </div>

            <Gruppe legende={f.stufen}>
              <div className="grid grid-cols-2 gap-x-3">
                {MUSTER.map((m) => (
                  <Feld key={m} label={`${MUSTER_NAMEN[m]} (${m})`}>
                    <select
                      name={`stufe_${m}`}
                      defaultValue={String(werte.stufen[m])}
                      className={eingabe}
                    >
                      {[1, 2, 3, 4, 5].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Feld>
                ))}
              </div>
            </Gruppe>

            <Gruppe legende={f.einheiten}>
              {[2, 3].map((n) => (
                <label key={n} className="flex min-h-11 items-center gap-3">
                  <input
                    type="radio"
                    name="einheiten"
                    value={n}
                    defaultChecked={werte.einheitenProWoche === n}
                    className="size-5"
                  />
                  <span>{t.einheitenProWoche(n)}</span>
                </label>
              ))}
            </Gruppe>

            <Checkbox
              name="zusatzblock"
              value="1"
              label={f.zusatzblock}
              checked={werte.zusatzblock}
            />
          </div>
        </details>

        {!ergebnis.ok ? (
          <section role="alert" className="mb-4 rounded-xl bg-bad-soft p-4 text-bad-ink">
            <p className="font-medium">
              {t.fehlendeMuster(ergebnis.fehlendeMuster.map((m) => MUSTER_NAMEN[m]).join(", "))}
            </p>
            <p className="mt-1 text-sm">{t.fehlendeMusterHilfe}</p>
            <button
              type="submit"
              name="aktion"
              value="aktualisieren"
              className={`${knopfSekundaer} mt-3`}
            >
              {f.aktualisieren}
            </button>
          </section>
        ) : (
          <>
            <PlanHinweise hinweise={hinweise} />
            <div className="mb-4 flex flex-wrap gap-3">
              <button type="submit" name="aktion" value="aktualisieren" className={knopfSekundaer}>
                {f.aktualisieren}
              </button>
              <button type="submit" name="aktion" value="mischen" className={knopfSekundaer}>
                {f.mischen}
              </button>
              <button type="submit" name="aktion" value="neu" className={knopfSekundaer}>
                {f.neu}
              </button>
            </div>
            <p className="mb-3 text-sm text-ink-3">{f.auswahlHilfe}</p>
            <PlanAnsicht
              slots={slots}
              uebungen={uebungenNachId}
              zusatzblockAktiv={werte.zusatzblock}
              kandidaten={kandidaten}
            />
            <div className="sticky bottom-16 -mx-4 mt-6 border-t border-line bg-bg px-4 py-3 md:static md:mx-0 md:border-0 md:px-0">
              <p className="mb-2 text-sm text-ink-3">{f.speichernHilfe}</p>
              <button
                type="submit"
                formAction={planSpeichern}
                formMethod="post"
                className={knopfPrimaer}
              >
                {f.speichern}
              </button>
            </div>
          </>
        )}
      </form>
    </>
  );
}

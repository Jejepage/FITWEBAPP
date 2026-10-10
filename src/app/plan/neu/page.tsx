import Link from "next/link";
import { Checkbox, FehlerBanner, Feld, Gruppe } from "@/components/form-felder";
import { EquipmentFelder } from "@/components/plan/equipment-felder";
import { IconChevron, IconZurueck } from "@/components/katalog/icons-katalog";
import { MusterPunkt } from "@/components/katalog/muster-ui";
import { BREITE, PageShell } from "@/components/page-shell";
import { PlanAnsicht } from "@/components/plan/plan-ansicht";
import { PlanHinweise } from "@/components/plan/plan-hinweise";
import {
  bannerFehler,
  bannerInfo,
  eingabe,
  knopfNeutral,
  knopfPrimaer,
  knopfSekundaer,
} from "@/components/ui";
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
import { getPlan, uebungsIdsVonPlan } from "@/server/plans";
import type { SearchParams } from "@/server/katalog-filter";
import { planSpeichern } from "../actions";

export const dynamic = "force-dynamic";

const t = de.plan;
const f = t.form;

type SeitenFehlerCode = keyof typeof t.fehler;
const FEHLER_CODES = Object.keys(t.fehler) as SeitenFehlerCode[];

export default async function PlanNeuPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const roh = parsePlanRohwerte(quelleAusSearchParams(sp));
  const standard = ladePlanStandard(db, undefined, roh.vorgaengerId);

  const { werte: aufgeloest, fehler: feldFehler } = loesePlanWerteAuf(roh, standard);
  const vorgaenger = aufgeloest.vorgaengerId ? getPlan(db, aufgeloest.vorgaengerId) : null;
  const werte = { ...aufgeloest, vorgaengerId: vorgaenger?.id ?? null };
  const basis = planBasis(werte);

  const fehlerParam = typeof sp.fehler === "string" ? sp.fehler : undefined;
  const speicherFehler = FEHLER_CODES.find((c) => c === fehlerParam);

  const uebungen = alleUebungen(db);
  const generatorEingabe: GeneratorEingabe = {
    uebungen,
    equipment: werte.equipment,
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
      <div className={`mx-auto w-full ${BREITE.weit}`}>
        <Link
          href="/plan"
          className="press -ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[17px] font-medium text-accent-ink hover:underline"
        >
          <IconZurueck className="size-5" />
          {t.zurueck}
        </Link>
      </div>
      <PageShell title={t.neuTitel} breite="weit">
        {speicherFehler && <FehlerBanner>{t.fehler[speicherFehler]}</FehlerBanner>}
        {feldFehler.startDatum && <FehlerBanner>{t.fehler.datum_ungueltig}</FehlerBanner>}

        <form method="get" action="/plan/neu">
          <input type="hidden" name="gesendet" value="1" />
          <input type="hidden" name="seed" value={werte.seed} />
          <input type="hidden" name="basis" value={basis} />
          {vorgaenger && <input type="hidden" name="vorgaenger" value={vorgaenger.id} />}

          <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[24rem_minmax(0,1fr)]">
            {/* Eingaben: am PC links und beim Scrollen stehen bleibend */}
            <div className="lg:sticky lg:top-8 lg:-m-2 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:p-2">
              {vorgaenger && <p className={`${bannerInfo} mb-4 text-[15px]`}>{f.folgeblock}</p>}
              <details
                open
                className="group rounded-card border border-line/50 bg-surface shadow-card"
              >
                <summary className="press flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-card px-5 py-3 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.eingaben}
                  <IconChevron className="ml-auto size-5 text-ink-3 transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-line p-5">
                  <EquipmentFelder
                    equipment={werte.equipment}
                    gewichteText={werte.gewichteText}
                    fehler={feldFehler}
                    texte={f}
                  />
                  <Feld label={f.startDatum}>
                    <input
                      type="date"
                      name="start"
                      defaultValue={werte.startDatum}
                      className={eingabe}
                    />
                  </Feld>

                  <Gruppe legende={f.stufen}>
                    <div className="grid grid-cols-2 gap-x-3">
                      {MUSTER.map((m) => (
                        <label key={m} className="mb-3 block">
                          <span className="mb-1 flex items-center gap-2 text-sm font-medium">
                            <MusterPunkt muster={m} />
                            <span>
                              {MUSTER_NAMEN[m]} ({m})
                            </span>
                          </span>
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
                        </label>
                      ))}
                    </div>
                  </Gruppe>

                  <Gruppe legende={f.einheiten}>
                    <div className="grid gap-2">
                      {[2, 3].map((n) => (
                        <label
                          key={n}
                          className="press flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-fill px-3.5 has-checked:bg-accent-soft has-checked:font-semibold"
                        >
                          <input
                            type="radio"
                            name="einheiten"
                            value={n}
                            defaultChecked={werte.einheitenProWoche === n}
                            className="size-5 accent-accent"
                          />
                          <span>{t.einheitenProWoche(n)}</span>
                        </label>
                      ))}
                    </div>
                  </Gruppe>

                  <Checkbox
                    name="zusatzblock"
                    value="1"
                    label={f.zusatzblock}
                    checked={werte.zusatzblock}
                  />
                </div>
              </details>
            </div>

            {/* Vorschau */}
            <div className="min-w-0">
              {!ergebnis.ok ? (
                <section role="alert" className={bannerFehler}>
                  <p className="font-semibold">
                    {t.fehlendeMuster(
                      ergebnis.fehlendeMuster.map((m) => MUSTER_NAMEN[m]).join(", "),
                    )}
                  </p>
                  <p className="mt-1 text-[15px]">{t.fehlendeMusterHilfe}</p>
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
                  <div className="mb-3 flex flex-wrap gap-2.5">
                    <button
                      type="submit"
                      name="aktion"
                      value="aktualisieren"
                      className={knopfSekundaer}
                    >
                      {f.aktualisieren}
                    </button>
                    <button type="submit" name="aktion" value="mischen" className={knopfNeutral}>
                      {f.mischen}
                    </button>
                    <button type="submit" name="aktion" value="neu" className={knopfNeutral}>
                      {f.neu}
                    </button>
                  </div>
                  <p className="mb-4 text-[15px] text-ink-3">{f.auswahlHilfe}</p>
                  <PlanAnsicht
                    slots={slots}
                    uebungen={uebungenNachId}
                    zusatzblockAktiv={werte.zusatzblock}
                    kandidaten={kandidaten}
                    rasterKlasse="2xl:grid-cols-2"
                  />
                  <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-6 bg-overlay px-4 py-3 backdrop-blur-xl backdrop-saturate-150 sm:-mx-6 sm:px-6 lg:bottom-4 lg:mx-0 lg:rounded-card lg:border lg:border-line/50 lg:px-5 lg:shadow-card">
                    <p className="mb-2 text-sm text-ink-3">{f.speichernHilfe}</p>
                    <button
                      type="submit"
                      formAction={planSpeichern}
                      formMethod="post"
                      className={`${knopfPrimaer} w-full lg:w-auto lg:px-10`}
                    >
                      {f.speichern}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </form>
      </PageShell>
    </>
  );
}

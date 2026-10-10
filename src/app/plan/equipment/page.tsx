import Link from "next/link";
import { EquipmentForm } from "@/components/plan/equipment-form";
import { MachbarVorschau } from "@/components/einstellungen/machbar-vorschau";
import { IconZurueck } from "@/components/katalog/icons-katalog";
import { BREITE, PageShell } from "@/components/page-shell";
import { karte, knopfPrimaer } from "@/components/ui";
import { db } from "@/db/client";
import { equipmentZuFormWerte } from "@/domain/equipment-form";
import { de } from "@/i18n/de";
import { alleUebungen } from "@/server/exercises";
import { getActivePlan } from "@/server/plans";
import { speichereEquipment } from "./actions";

export const dynamic = "force-dynamic";

const t = de.equipment;

export default function PlanEquipmentPage() {
  const plan = getActivePlan(db);
  const zurueck = (
    <div className={`mx-auto w-full ${BREITE.normal}`}>
      <Link
        href="/plan"
        className="press -ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[17px] font-medium text-accent-ink hover:underline"
      >
        <IconZurueck className="size-5" />
        {t.zurueck}
      </Link>
    </div>
  );

  if (!plan) {
    return (
      <>
        {zurueck}
        <PageShell title={t.titel} breite="normal">
          <section className={`${karte} py-8 text-center`}>
            <p className="mb-4 text-[17px]">{de.plan.keinPlan}</p>
            <Link href="/plan/neu" className={knopfPrimaer}>
              {de.plan.erstellen}
            </Link>
          </section>
        </PageShell>
      </>
    );
  }

  return (
    <>
      {zurueck}
      <PageShell title={t.titel} breite="normal">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <EquipmentForm
            aktion={speichereEquipment.bind(null, plan.id)}
            werte={equipmentZuFormWerte({ equipment: plan.equipment, gewichte: plan.gewichte })}
          />
          <MachbarVorschau uebungen={alleUebungen(db)} equipment={plan.equipment} />
        </div>
      </PageShell>
    </>
  );
}

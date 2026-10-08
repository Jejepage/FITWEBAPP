import Link from "next/link";
import { PlanAnsicht } from "@/components/plan/plan-ansicht";
import { karte, knopfPrimaer } from "@/components/ui";
import { db } from "@/db/client";
import { de } from "@/i18n/de";
import { alleUebungen } from "@/server/exercises";
import { getActivePlan, getPlanSlots } from "@/server/plans";
import { getProfile } from "@/server/profiles";
import { StufenCheckFormular } from "@/components/plan/stufen-check-formular";
import { istBlockFertig, ladeStufenCheck } from "@/server/stufen-check";

export const dynamic = "force-dynamic";

const t = de.plan;

function datumAnzeige(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", {
    timeZone: "UTC",
  });
}

export default function PlanPage() {
  const plan = getActivePlan(db);

  if (!plan) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-bold">{t.titel}</h1>
        <section className={`${karte} text-center`}>
          <p className="mb-2 font-medium">{t.keinPlan}</p>
          <p className="mb-4 text-sm text-ink-2">{t.keinPlanHilfe}</p>
          <Link href="/plan/neu" className={knopfPrimaer}>
            {t.erstellen}
          </Link>
        </section>
      </>
    );
  }

  const slots = getPlanSlots(db, plan.id);
  const uebungen = new Map(alleUebungen(db).map((u) => [u.id, u]));
  const profil = getProfile(db, plan.profilId);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.titel}</h1>
        <Link href="/plan/neu" className={knopfPrimaer}>
          {t.neuErstellen}
        </Link>
      </div>

      <section className={`${karte} mb-4`} aria-label={t.aktiverPlan}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-3">{t.profil}</dt>
          <dd>{profil?.name ?? "–"}</dd>
          <dt className="text-ink-3">{t.start}</dt>
          <dd>{datumAnzeige(plan.startDatum)}</dd>
          <dt className="text-ink-3">{t.einheitenProWoche(plan.einheitenProWoche)}</dt>
          <dd>{t.wochenfolge(plan.einheitenProWoche)}</dd>
          <dt className="text-ink-3">{t.zusatzblock}</dt>
          <dd>{plan.zusatzblock ? t.zusatzblockAn : t.zusatzblockAus}</dd>
        </dl>
        <p className="mt-3 text-sm">
          <Link href="/" className="font-medium text-accent-ink">
            {t.zumTraining}
          </Link>
        </p>
      </section>

      {istBlockFertig(db, plan) && (
        <StufenCheckFormular planId={plan.id} ergebnisse={ladeStufenCheck(db, plan)} />
      )}

      <PlanAnsicht slots={slots} uebungen={uebungen} zusatzblockAktiv={plan.zusatzblock} />
    </>
  );
}

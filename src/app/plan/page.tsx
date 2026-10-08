import Link from "next/link";
import { IconPlan, IconPlus } from "@/components/icons";
import { PageShell } from "@/components/page-shell";
import { PlanAnsicht } from "@/components/plan/plan-ansicht";
import { karte, knopfPrimaer, knopfSekundaer } from "@/components/ui";
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

function Kachel({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-fill p-4">
      <dt className="text-sm text-ink-3">{name}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold leading-snug">{children}</dd>
    </div>
  );
}

export default function PlanPage() {
  const plan = getActivePlan(db);

  if (!plan) {
    return (
      <PageShell title={t.titel} breite="normal">
        <section className={`${karte} mx-auto max-w-xl py-10 text-center`}>
          <span
            aria-hidden="true"
            className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent-ink"
          >
            <IconPlan className="size-9" />
          </span>
          <p className="mb-2 text-xl font-semibold">{t.keinPlan}</p>
          <p className="mx-auto mb-6 max-w-md text-[15px] text-ink-2">{t.keinPlanHilfe}</p>
          <Link href="/plan/neu" className={knopfPrimaer}>
            {t.erstellen}
          </Link>
        </section>
      </PageShell>
    );
  }

  const slots = getPlanSlots(db, plan.id);
  const uebungen = new Map(alleUebungen(db).map((u) => [u.id, u]));
  const profil = getProfile(db, plan.profilId);

  return (
    <PageShell
      title={t.titel}
      breite="weit"
      aktionen={
        <Link href="/plan/neu" className={knopfPrimaer}>
          <IconPlus className="size-5" />
          {t.neuErstellen}
        </Link>
      }
    >
      <section className={`${karte} mb-6`} aria-label={t.aktiverPlan}>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kachel name={t.profil}>{profil?.name ?? "–"}</Kachel>
          <Kachel name={t.start}>{datumAnzeige(plan.startDatum)}</Kachel>
          <Kachel name={t.einheitenProWoche(plan.einheitenProWoche)}>
            {t.wochenfolge(plan.einheitenProWoche)}
          </Kachel>
          <Kachel name={t.zusatzblock}>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`size-2.5 rounded-full ${plan.zusatzblock ? "bg-ok" : "bg-fill-2"}`}
              />
              {plan.zusatzblock ? t.zusatzblockAn : t.zusatzblockAus}
            </span>
          </Kachel>
        </dl>
        <p className="mt-4">
          <Link href="/" className={knopfSekundaer}>
            {t.zumTraining}
          </Link>
        </p>
      </section>

      {istBlockFertig(db, plan) && (
        <StufenCheckFormular planId={plan.id} ergebnisse={ladeStufenCheck(db, plan)} />
      )}

      <PlanAnsicht slots={slots} uebungen={uebungen} zusatzblockAktiv={plan.zusatzblock} />
    </PageShell>
  );
}

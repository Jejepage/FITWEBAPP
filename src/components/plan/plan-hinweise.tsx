import { IconInfo, IconWarnung } from "@/components/katalog/icons-katalog";
import { bannerInfo, bannerWarn } from "@/components/ui";
import type { HinweisCode, PlanHinweis } from "@/domain/plan-types";
import { MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";

const h = de.plan.hinweise;

/** Warnungen (Regel verletzt) hervorheben, reine Informationen dezent. */
const WARNUNG: ReadonlySet<HinweisCode> = new Set(["gleiche_uebung_ab", "einseitig_fehlt"]);

export function hinweisText(x: PlanHinweis): string {
  const muster = x.muster ? MUSTER_NAMEN[x.muster] : "";
  switch (x.code) {
    case "wenig_auswahl":
      return h.wenig_auswahl(muster);
    case "gleiche_uebung_ab":
      return h.gleiche_uebung_ab(muster);
    case "einseitig_fehlt":
      return h.einseitig_fehlt;
    case "stufe_weicht_ab":
      return h.stufe_weicht_ab(muster, x.gewuenscht ?? 0, x.tatsaechlich ?? 0);
  }
}

export function PlanHinweise({ hinweise }: { hinweise: readonly PlanHinweis[] }) {
  if (hinweise.length === 0) return null;
  return (
    <section aria-labelledby="plan-hinweise" className="mb-4">
      <h2
        id="plan-hinweise"
        className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-3"
      >
        {h.titel}
      </h2>
      <ul className="space-y-2 text-[15px]">
        {hinweise.map((x, i) => {
          const warnung = WARNUNG.has(x.code);
          return (
            <li
              key={`${x.code}-${x.muster ?? ""}-${x.tatsaechlich ?? ""}-${i}`}
              className={`flex items-start gap-3 ${warnung ? bannerWarn : bannerInfo}`}
            >
              {warnung ? (
                <IconWarnung className="mt-0.5 size-5 shrink-0 text-warn-ink" />
              ) : (
                <IconInfo className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              )}
              <span>{hinweisText(x)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

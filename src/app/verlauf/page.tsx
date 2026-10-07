import { PageShell } from "@/components/page-shell";
import { de } from "@/i18n/de";

export default function Page() {
  return (
    <PageShell title={de.nav.verlauf}>
      <p className="text-neutral-600 dark:text-neutral-400">{de.platzhalter.verlauf}</p>
    </PageShell>
  );
}

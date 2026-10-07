import { PageShell } from "@/components/page-shell";
import { de } from "@/i18n/de";

export default function StartPage() {
  return (
    <PageShell title={de.nav.start}>
      <p className="text-neutral-600 dark:text-neutral-400">{de.platzhalter.start}</p>
    </PageShell>
  );
}

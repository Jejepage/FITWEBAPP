import { karte } from "@/components/ui";
import { de } from "@/i18n/de";

export default function OfflinePage() {
  return (
    <section className={`${karte} mt-8 text-center`}>
      <h1 className="mb-2 text-2xl font-bold">{de.offline.titel}</h1>
      <p className="text-neutral-600 dark:text-neutral-400">{de.offline.text}</p>
    </section>
  );
}

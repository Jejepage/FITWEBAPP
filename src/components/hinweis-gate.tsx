import { hinweisBestaetigen } from "@/app/hinweis-actions";
import { karte, knopfPrimaer } from "@/components/ui";
import { de } from "@/i18n/de";

const t = de.hinweis;

/** Erster Start: Hinweis aus Spec §11, bis er bestätigt wurde. */
export function HinweisGate() {
  return (
    <section className={`${karte} mx-auto mt-6 max-w-md`} aria-labelledby="hinweis-titel">
      <h1 id="hinweis-titel" className="mb-3 text-2xl font-bold">
        {t.titel}
      </h1>
      <p className="mb-3">{t.text}</p>
      <ul className="mb-5 list-disc space-y-1 pl-5">
        {t.zusatz.map((z) => (
          <li key={z}>{z}</li>
        ))}
      </ul>
      <form action={hinweisBestaetigen}>
        <button type="submit" className={`${knopfPrimaer} w-full`}>
          {t.bestaetigen}
        </button>
      </form>
    </section>
  );
}

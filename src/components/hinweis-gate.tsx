import { hinweisBestaetigen } from "@/app/hinweis-actions";
import { IconInfo } from "@/components/einstellungen/icons-einstellungen";
import { IconHantel } from "@/components/icons";
import { karte, knopfPrimaer } from "@/components/ui";
import { de } from "@/i18n/de";

const t = de.hinweis;

/** Erster Start: Hinweis aus Spec §11, bis er bestätigt wurde. */
export function HinweisGate() {
  return (
    <section
      className="fade-up flex min-h-[calc(100dvh-5rem)] flex-col justify-center sm:min-h-[calc(100dvh-8rem)]"
      aria-labelledby="hinweis-titel"
    >
      <div className="text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-16 place-items-center rounded-[1.25rem] bg-gradient-to-br from-hero-from to-hero-to text-on-accent shadow-card"
        >
          <IconHantel className="size-9" />
        </span>
        <h1
          id="hinweis-titel"
          className="mt-5 text-[2rem] font-bold leading-tight tracking-tight text-ink sm:text-[2.25rem]"
        >
          {t.titel}
        </h1>
      </div>
      <div className={`${karte} mt-8 sm:p-7`}>
        <p className="text-[17px] leading-relaxed text-ink">{t.text}</p>
        <ul className="my-5 space-y-3">
          {t.zusatz.map((z) => (
            <li key={z} className="flex items-start gap-3 rounded-2xl bg-fill p-4">
              <IconInfo className="mt-0.5 size-6 shrink-0 text-accent-ink" />
              <span className="text-base leading-snug text-ink">{z}</span>
            </li>
          ))}
        </ul>
        <form action={hinweisBestaetigen}>
          <button type="submit" className={`${knopfPrimaer} min-h-14 w-full text-lg`}>
            {t.bestaetigen}
          </button>
        </form>
      </div>
    </section>
  );
}

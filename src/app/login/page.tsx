import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IconSchloss, IconWarnung } from "@/components/einstellungen/icons-einstellungen";
import { IconHantel } from "@/components/icons";
import { bannerFehler, bannerWarn, eingabe, karte, knopfPrimaer } from "@/components/ui";
import { SESSION_COOKIE, sichererPfad } from "@/domain/auth";
import { de } from "@/i18n/de";
import { istAngemeldet } from "@/server/auth";
import type { SearchParams } from "@/server/katalog-filter";
import { anmelden } from "./actions";

export const dynamic = "force-dynamic";

const t = de.login;

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const weiter = sichererPfad(typeof sp.weiter === "string" ? sp.weiter : undefined);
  // Ohne Passwortschutz oder mit gültiger Sitzung gibt es hier nichts zu tun.
  if (istAngemeldet((await cookies()).get(SESSION_COOKIE)?.value)) redirect(weiter);
  const fehler = sp.fehler === "gesperrt" ? t.gesperrt : sp.fehler === "falsch" ? t.falsch : null;
  const sperre = sp.fehler === "gesperrt";

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col justify-center sm:min-h-[calc(100dvh-8rem)]">
      <div className="fade-up text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-16 place-items-center rounded-[1.25rem] bg-gradient-to-br from-hero-from to-hero-to text-on-accent shadow-card"
        >
          <IconHantel className="size-9" />
        </span>
        <h1 className="mt-5 text-[2rem] font-bold leading-tight tracking-tight text-ink">
          {t.titel}
        </h1>
        <p className="mt-1.5 text-base text-ink-2">{t.hilfe}</p>
      </div>
      <form action={anmelden} className={`${karte} fade-up mt-8 sm:p-6`}>
        <input type="hidden" name="weiter" value={weiter} />
        {fehler && (
          <div
            role="alert"
            className={`${sperre ? bannerWarn : bannerFehler} mb-5 flex items-start gap-3 text-[15px] font-medium`}
          >
            {sperre ? (
              <IconSchloss className="mt-0.5 size-5 shrink-0 text-warn-ink" />
            ) : (
              <IconWarnung className="mt-0.5 size-5 shrink-0 text-bad-ink" />
            )}
            <span>{fehler}</span>
          </div>
        )}
        <label className="mb-5 block">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">{t.passwort}</span>
          <input
            type="password"
            name="passwort"
            required
            autoFocus
            autoComplete="current-password"
            className={`${eingabe} ${fehler && !sperre ? "border-bad!" : ""}`}
          />
        </label>
        <button type="submit" className={`${knopfPrimaer} min-h-14 w-full text-lg`}>
          {t.anmelden}
        </button>
      </form>
    </div>
  );
}

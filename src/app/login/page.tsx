import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FehlerBanner } from "@/components/form-felder";
import { eingabe, karte, knopfPrimaer } from "@/components/ui";
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

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="mb-2 text-2xl font-bold">{t.titel}</h1>
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">{t.hilfe}</p>
      {fehler && <FehlerBanner>{fehler}</FehlerBanner>}
      <form action={anmelden} className={karte}>
        <input type="hidden" name="weiter" value={weiter} />
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">{t.passwort}</span>
          <input
            type="password"
            name="passwort"
            required
            autoFocus
            autoComplete="current-password"
            className={eingabe}
          />
        </label>
        <button type="submit" className={`${knopfPrimaer} w-full min-h-14 text-lg`}>
          {t.anmelden}
        </button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { Badge } from "@/components/katalog/badge";
import { SettingsForm } from "@/components/einstellungen/settings-form";
import { karte, knopfPrimaer } from "@/components/ui";
import { db } from "@/db/client";
import { zaehleMachbar } from "@/domain/equipment";
import { formatGewichte } from "@/domain/gewichte";
import { MUSTER, EQUIPMENT_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { alleUebungen } from "@/server/exercises";
import { listProfiles } from "@/server/profiles";
import { getSettings } from "@/server/settings";
import { speichereEinstellungen } from "./actions";

export const dynamic = "force-dynamic";

const t = de.einstellungen;

export default function EinstellungenPage() {
  const s = getSettings(db);
  const profile = listProfiles(db);
  const uebungen = alleUebungen(db);

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">{t.titel}</h1>

      <section className="mb-10" aria-labelledby="training">
        <h2 id="training" className="mb-3 text-xl font-semibold">
          {t.training}
        </h2>
        <SettingsForm
          aktion={speichereEinstellungen}
          werte={{
            stufen: s.stufen,
            einheitenProWoche: s.einheitenProWoche,
            zusatzblock: s.zusatzblock,
            aufwaermenText: s.aufwaermenText,
          }}
        />
      </section>

      <section className="mb-10" aria-labelledby="profile">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 id="profile" className="text-xl font-semibold">
            {t.profile}
          </h2>
          <Link href="/einstellungen/profile/neu" className={knopfPrimaer}>
            {t.neuesProfil}
          </Link>
        </div>
        <p className="mb-3 text-sm text-neutral-500">{t.profileHilfe}</p>
        <ul className="space-y-2">
          {profile.map((p) => {
            const anzahl = zaehleMachbar(uebungen, p.equipment);
            const gesamt = MUSTER.reduce((summe, m) => summe + anzahl[m], 0);
            const gewichte = (["kurzhanteln", "kettlebell"] as const)
              .filter((art) => (p.gewichte[art]?.length ?? 0) > 0)
              .map((art) => t.gewichteKurz(EQUIPMENT_NAMEN[art], formatGewichte(p.gewichte[art]!)));
            return (
              <li key={p.id}>
                <Link
                  href={`/einstellungen/profile/${p.id}`}
                  className={`${karte} block hover:border-brand`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{p.name}</span>
                    {p.istStandard && <Badge farbe="gut">{t.standard}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {p.equipment.length > 0
                      ? p.equipment.map((a) => EQUIPMENT_NAMEN[a]).join(", ")
                      : t.keinEquipment}
                  </p>
                  {gewichte.length > 0 && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {gewichte.join(" · ")}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-neutral-500">
                    {gesamt} von {uebungen.filter((u) => u.aktiv).length} Übungen {t.machbarKurz}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="hinweis" className={karte}>
        <h2 id="hinweis" className="mb-2 text-lg font-semibold">
          {t.hinweisTitel}
        </h2>
        <p className="mb-2">{de.hinweis.text}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {de.hinweis.zusatz.map((z) => (
            <li key={z}>{z}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-500">
          {s.hinweisAkzeptiertAm &&
            `Bestätigt am ${new Date(s.hinweisAkzeptiertAm).toLocaleDateString("de-DE")}.`}
        </p>
      </section>
    </>
  );
}

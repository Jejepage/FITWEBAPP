import Link from "next/link";
import { notFound } from "next/navigation";
import { LoeschenKnopf } from "@/components/einstellungen/loeschen-knopf";
import { MachbarVorschau } from "@/components/einstellungen/machbar-vorschau";
import { ProfilForm } from "@/components/einstellungen/profil-form";
import { db } from "@/db/client";
import { profilZuFormWerte } from "@/domain/profile-form";
import { de } from "@/i18n/de";
import { alleUebungen } from "@/server/exercises";
import { getProfile } from "@/server/profiles";
import { loescheProfil, speichereProfil } from "../../actions";

export const dynamic = "force-dynamic";

export default async function ProfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profil = /^\d{1,9}$/.test(id) ? getProfile(db, Number(id)) : null;
  if (!profil) notFound();

  return (
    <>
      <Link href="/einstellungen" className="mb-3 inline-block min-h-11 py-2 text-brand">
        ← {de.profil.zurueck}
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{de.profil.bearbeitenTitel(profil.name)}</h1>
      <MachbarVorschau uebungen={alleUebungen(db)} equipment={profil.equipment} />
      <ProfilForm
        aktion={speichereProfil.bind(null, profil.id)}
        werte={profilZuFormWerte(profil)}
        istAktuellStandard={profil.istStandard}
      />
      <section className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <h2 className="mb-3 text-lg font-semibold">{de.profil.loeschenTitel}</h2>
        <LoeschenKnopf aktion={loescheProfil.bind(null, profil.id)} />
      </section>
    </>
  );
}

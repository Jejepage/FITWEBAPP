import Link from "next/link";
import { notFound } from "next/navigation";
import { LoeschenKnopf } from "@/components/einstellungen/loeschen-knopf";
import { MachbarVorschau } from "@/components/einstellungen/machbar-vorschau";
import { ProfilForm } from "@/components/einstellungen/profil-form";
import { IconPfeilLinks } from "@/components/icons";
import { BREITE, PageShell } from "@/components/page-shell";
import { knopfText, kopfzeileKlein } from "@/components/ui";
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
      <div className={`mx-auto w-full ${BREITE.normal}`}>
        <Link href="/einstellungen" className={`${knopfText} -ml-2 mb-1`}>
          <IconPfeilLinks className="size-5" />
          {de.profil.zurueck}
        </Link>
      </div>
      <PageShell title={de.profil.bearbeitenTitel(profil.name)} breite="normal">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <div className="fade-up lg:col-start-1 lg:row-start-1">
            <ProfilForm
              aktion={speichereProfil.bind(null, profil.id)}
              werte={profilZuFormWerte(profil)}
              istAktuellStandard={profil.istStandard}
            />
          </div>
          <div className="fade-up lg:sticky lg:top-10 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <MachbarVorschau uebungen={alleUebungen(db)} equipment={profil.equipment} />
          </div>
          <section aria-labelledby="loeschen-titel" className="lg:col-start-1 lg:row-start-2">
            <h2 id="loeschen-titel" className={kopfzeileKlein}>
              {de.profil.loeschenTitel}
            </h2>
            <LoeschenKnopf aktion={loescheProfil.bind(null, profil.id)} />
          </section>
        </div>
      </PageShell>
    </>
  );
}

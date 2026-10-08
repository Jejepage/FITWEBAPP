import Link from "next/link";
import { ProfilForm } from "@/components/einstellungen/profil-form";
import { IconPfeilLinks } from "@/components/icons";
import { BREITE, PageShell } from "@/components/page-shell";
import { knopfText } from "@/components/ui";
import { leereProfilFormWerte } from "@/domain/profile-form";
import { de } from "@/i18n/de";
import { speichereNeuesProfil } from "../../actions";

export default function NeuesProfilPage() {
  return (
    <>
      <div className={`mx-auto w-full ${BREITE.schmal}`}>
        <Link href="/einstellungen" className={`${knopfText} -ml-2 mb-1`}>
          <IconPfeilLinks className="size-5" />
          {de.profil.zurueck}
        </Link>
      </div>
      <PageShell title={de.profil.neuTitel} breite="schmal">
        <div className="fade-up">
          <ProfilForm
            aktion={speichereNeuesProfil}
            werte={leereProfilFormWerte()}
            istAktuellStandard={false}
          />
        </div>
      </PageShell>
    </>
  );
}

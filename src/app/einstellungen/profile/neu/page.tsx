import Link from "next/link";
import { ProfilForm } from "@/components/einstellungen/profil-form";
import { leereProfilFormWerte } from "@/domain/profile-form";
import { de } from "@/i18n/de";
import { speichereNeuesProfil } from "../../actions";

export default function NeuesProfilPage() {
  return (
    <>
      <Link href="/einstellungen" className="mb-3 inline-block min-h-11 py-2 text-accent-ink">
        ← {de.profil.zurueck}
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{de.profil.neuTitel}</h1>
      <ProfilForm
        aktion={speichereNeuesProfil}
        werte={leereProfilFormWerte()}
        istAktuellStandard={false}
      />
    </>
  );
}

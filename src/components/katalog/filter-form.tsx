import Link from "next/link";
import { eingabe, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import {
  BELASTUNGSARTEN,
  EQUIPMENT_AUSWAHL,
  EQUIPMENT_NAMEN,
  MUSTER,
  MUSTER_NAMEN,
  PRUEFSTATI,
} from "@/domain/types";
import { de } from "@/i18n/de";
import type { FilterAuswahl } from "@/server/katalog-filter";
import type { Profil } from "@/server/profiles";

const t = de.katalog;
const tt = t.tabelle;

function Auswahl({
  name,
  label,
  wert,
  children,
}: {
  name: string;
  label: string;
  wert: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block">{label}</span>
      <select name={name} defaultValue={wert} className={eingabe}>
        {children}
      </select>
    </label>
  );
}

/** Reines GET-Formular (Kartenansicht): funktioniert ohne JavaScript, Filter stehen in der URL. */
export function FilterForm({
  filter,
  profile,
  aktiv,
  versteckt = [],
}: {
  filter: FilterAuswahl;
  profile: Profil[];
  aktiv: boolean;
  /** Parameter, die beim Absenden erhalten bleiben sollen (Sortierung, Ansicht, Spalten) */
  versteckt?: readonly (readonly [string, string])[];
}) {
  const einseitigWert = filter.einseitig === undefined ? "" : filter.einseitig ? "ja" : "nein";
  const videoWert = filter.video === undefined ? "" : filter.video ? "mit" : "ohne";
  const alle = <option value="">{t.alle}</option>;
  return (
    <details open={aktiv} className="mb-4 rounded-xl border border-line bg-surface">
      <summary className="min-h-11 cursor-pointer list-none px-4 py-3 font-medium">
        {t.filter}
        {aktiv && <span className="ml-2 text-sm font-normal text-accent-ink">●</span>}
      </summary>
      <form
        method="get"
        action="/katalog"
        className="grid gap-3 border-t border-line p-4 sm:grid-cols-2"
      >
        {versteckt.map(([name, wert]) => (
          <input key={name} type="hidden" name={name} value={wert} />
        ))}
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block">{t.suchen}</span>
          <input
            type="search"
            name="q"
            defaultValue={filter.q ?? ""}
            autoComplete="off"
            className={eingabe}
          />
        </label>
        <Auswahl name="muster" label={t.muster} wert={filter.muster ?? ""}>
          {alle}
          {MUSTER.map((m) => (
            <option key={m} value={m}>
              {MUSTER_NAMEN[m]} ({m})
            </option>
          ))}
        </Auswahl>
        <Auswahl
          name="profil"
          label={t.profil}
          wert={filter.profilId ? String(filter.profilId) : ""}
        >
          {alle}
          {profile.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Auswahl>
        <Auswahl name="geraet" label={t.geraet} wert={filter.geraet ?? ""}>
          <option value="">{tt.alleGeraete}</option>
          {EQUIPMENT_AUSWAHL.map((a) => (
            <option key={a} value={a}>
              {tt.benoetigt(EQUIPMENT_NAMEN[a])}
            </option>
          ))}
        </Auswahl>
        <Auswahl name="stufe" label={t.stufe} wert={filter.stufe ? String(filter.stufe) : ""}>
          {alle}
          {[1, 2, 3, 4, 5].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Auswahl>
        <Auswahl name="einseitig" label={t.einseitig} wert={einseitigWert}>
          {alle}
          <option value="ja">{t.ja}</option>
          <option value="nein">{t.nein}</option>
        </Auswahl>
        <Auswahl
          name="belastungsart"
          label={t.belastungsartFilter}
          wert={filter.belastungsart ?? ""}
        >
          {alle}
          {BELASTUNGSARTEN.map((b) => (
            <option key={b} value={b}>
              {t.belastungsarten[b]}
            </option>
          ))}
        </Auswahl>
        <Auswahl name="status" label={t.statusFilter} wert={filter.pruefstatus ?? ""}>
          {alle}
          {PRUEFSTATI.map((p) => (
            <option key={p} value={p}>
              {t.feld.pruefstati[p]}
            </option>
          ))}
        </Auswahl>
        <Auswahl
          name="aktiv"
          label={t.aktivFilter}
          wert={filter.nurInaktive ? "inaktiv" : filter.inaktive ? "alle" : ""}
        >
          <option value="">{tt.aktivAktive}</option>
          <option value="inaktiv">{tt.aktivInaktive}</option>
          <option value="alle">{tt.aktivAlle}</option>
        </Auswahl>
        <Auswahl name="video" label={t.videoFilter} wert={videoWert}>
          {alle}
          <option value="mit">{tt.mitVideo}</option>
          <option value="ohne">{tt.ohneVideo}</option>
        </Auswahl>
        <label className="block text-sm">
          <span className="mb-1 block">{t.muskelFilter}</span>
          <input
            type="search"
            name="muskel"
            defaultValue={filter.muskel ?? ""}
            autoComplete="off"
            className={eingabe}
          />
        </label>
        <div className="flex gap-3 sm:col-span-2">
          <button type="submit" className={knopfPrimaer}>
            {t.filtern}
          </button>
          <Link href="/katalog" className={knopfSekundaer}>
            {t.zuruecksetzen}
          </Link>
        </div>
      </form>
    </details>
  );
}

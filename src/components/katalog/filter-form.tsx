import Link from "next/link";
import { IconFilter } from "@/components/icons";
import { eingabe, knopfNeutral, knopfPrimaer } from "@/components/ui";
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
import { IconChevron } from "./icons-katalog";

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
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      <select name={name} defaultValue={wert} className={eingabe}>
        {children}
      </select>
    </label>
  );
}

/** Ja/Nein/Alle als iOS-Segment (Radiofelder, Wert wie beim Auswahlfeld: "" = alle). */
function Segmente({
  name,
  label,
  wert,
  optionen,
}: {
  name: string;
  label: string;
  wert: string;
  optionen: readonly { wert: string; text: string }[];
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink-2">{label}</legend>
      <div className="flex rounded-xl bg-fill-2 p-0.5">
        {optionen.map((o) => (
          <label
            key={o.wert}
            className="press relative flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[0.65rem] px-2 text-center text-[15px] font-medium text-ink-2 has-checked:bg-surface has-checked:text-ink has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent-ink"
          >
            <input
              type="radio"
              name={name}
              value={o.wert}
              defaultChecked={o.wert === wert}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
            {o.text}
          </label>
        ))}
      </div>
    </fieldset>
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
  const ersatzWert = filter.ersatz === undefined ? "" : filter.ersatz ? "ja" : "nein";
  const videoWert = filter.video === undefined ? "" : filter.video ? "mit" : "ohne";
  const alle = <option value="">{t.alle}</option>;
  return (
    <details
      open={aktiv}
      className="group mb-6 rounded-card border border-line/50 bg-surface shadow-card"
    >
      <summary className="press flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-card px-5 py-3 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
        <IconFilter className="size-5 text-accent-ink" />
        {t.filter}
        {aktiv && <span className="text-sm font-normal text-accent-ink">●</span>}
        <IconChevron className="ml-auto size-5 text-ink-3 transition-transform group-open:rotate-90" />
      </summary>
      <form
        method="get"
        action="/katalog"
        className="grid gap-x-4 gap-y-4 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {versteckt.map(([name, wert]) => (
          <input key={name} type="hidden" name={name} value={wert} />
        ))}
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">{t.suchen}</span>
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
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">{t.muskelFilter}</span>
          <input
            type="search"
            name="muskel"
            defaultValue={filter.muskel ?? ""}
            autoComplete="off"
            className={eingabe}
          />
        </label>
        <Segmente
          name="einseitig"
          label={t.einseitig}
          wert={einseitigWert}
          optionen={[
            { wert: "", text: t.alle },
            { wert: "ja", text: t.ja },
            { wert: "nein", text: t.nein },
          ]}
        />
        <Segmente
          name="ersatz"
          label={t.ersatzFilter}
          wert={ersatzWert}
          optionen={[
            { wert: "", text: t.alle },
            { wert: "ja", text: t.ja },
            { wert: "nein", text: t.nein },
          ]}
        />
        <Segmente
          name="video"
          label={t.videoFilter}
          wert={videoWert}
          optionen={[
            { wert: "", text: t.alle },
            { wert: "mit", text: tt.mitVideo },
            { wert: "ohne", text: tt.ohneVideo },
          ]}
        />
        <Segmente
          name="aktiv"
          label={t.aktivFilter}
          wert={filter.nurInaktive ? "inaktiv" : filter.inaktive ? "alle" : ""}
          optionen={[
            { wert: "", text: tt.aktivAktive },
            { wert: "inaktiv", text: tt.aktivInaktive },
            { wert: "alle", text: tt.aktivAlle },
          ]}
        />
        <Segmente
          name="status"
          label={t.statusFilter}
          wert={filter.pruefstatus ?? ""}
          optionen={[
            { wert: "", text: t.alle },
            ...PRUEFSTATI.map((p) => ({ wert: p, text: t.feld.pruefstati[p] })),
          ]}
        />
        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
          <button type="submit" className={knopfPrimaer}>
            {t.filtern}
          </button>
          <Link href="/katalog" className={knopfNeutral}>
            {t.zuruecksetzen}
          </Link>
        </div>
      </form>
    </details>
  );
}

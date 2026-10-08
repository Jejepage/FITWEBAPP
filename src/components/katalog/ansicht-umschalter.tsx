import { speichereAnsicht } from "@/app/katalog/ansicht-actions";
import { IconKarten, IconTabelle } from "@/components/icons";
import type { Ansicht } from "@/domain/katalog-spalten";
import { de } from "@/i18n/de";

const t = de.katalog.tabelle;

const grund =
  "press inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[0.65rem] px-4 text-[15px] font-medium";
const aktivKlasse = "bg-surface text-ink shadow-sm";
const inaktivKlasse = "text-ink-2 hover:text-ink";

/**
 * Umschalter Karten | Tabelle als iOS-Segment. Jeder Knopf sendet an die Server Action, die die
 * Wahl im Cookie merkt und mit den aktuellen Filtern zurückkehrt (funktioniert ohne JavaScript).
 */
export function AnsichtUmschalter({
  ansicht,
  zurueck,
}: {
  ansicht: Ansicht;
  /** Aktuelle Filter und Sortierung als Query-String */
  zurueck: string;
}) {
  const knopf = (wert: "karten" | "tabelle", text: string) => {
    // "auto": Karten unter 768 px, Tabelle darüber; die Hervorhebung folgt der Breite (CSS).
    const klasse =
      ansicht === wert
        ? aktivKlasse
        : ansicht !== "auto"
          ? inaktivKlasse
          : wert === "karten"
            ? `${aktivKlasse} md:bg-transparent md:text-ink-2 md:shadow-none`
            : `${inaktivKlasse} md:bg-surface md:text-ink md:shadow-sm`;
    const Icon = wert === "karten" ? IconKarten : IconTabelle;
    return (
      <button
        type="submit"
        name="ansicht"
        value={wert}
        aria-pressed={ansicht === wert ? true : ansicht === "auto" ? undefined : false}
        className={`${grund} ${klasse}`}
      >
        <Icon className="size-5" />
        {text}
      </button>
    );
  };
  return (
    <form
      action={speichereAnsicht}
      role="group"
      aria-label={t.ansicht}
      className="inline-flex rounded-xl bg-fill-2 p-0.5"
    >
      <input type="hidden" name="was" value="ansicht" />
      <input type="hidden" name="zurueck" value={zurueck} />
      {knopf("karten", t.karten)}
      {knopf("tabelle", t.tabelle)}
    </form>
  );
}

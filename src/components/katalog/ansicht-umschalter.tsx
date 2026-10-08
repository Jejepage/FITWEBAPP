import { speichereAnsicht } from "@/app/katalog/ansicht-actions";
import type { Ansicht } from "@/domain/katalog-spalten";
import { de } from "@/i18n/de";

const t = de.katalog.tabelle;

/**
 * Umschalter Karten | Tabelle. Jeder Knopf sendet an die Server Action, die die Wahl im Cookie
 * merkt und mit den aktuellen Filtern zurückkehrt (funktioniert ohne JavaScript).
 */
export function AnsichtUmschalter({
  ansicht,
  zurueck,
}: {
  ansicht: Ansicht;
  /** Aktuelle Filter und Sortierung als Query-String */
  zurueck: string;
}) {
  const grund = "min-h-10 flex-1 rounded-lg px-4 text-sm font-medium";
  const aktivKlasse = "bg-accent text-on-accent";
  const inaktivKlasse = "text-ink-2 hover:bg-fill";
  const knopf = (wert: "karten" | "tabelle", text: string) => {
    // "auto": Karten unter 768 px, Tabelle darüber; die Hervorhebung folgt der Breite (CSS).
    const klasse =
      ansicht === wert
        ? aktivKlasse
        : ansicht !== "auto"
          ? inaktivKlasse
          : wert === "karten"
            ? "bg-accent text-on-accent md:bg-transparent md:text-neutral-700"
            : "text-ink-2 md:bg-brand md:text-white md:dark:text-white";
    return (
      <button
        type="submit"
        name="ansicht"
        value={wert}
        aria-pressed={ansicht === wert ? true : ansicht === "auto" ? undefined : false}
        className={`${grund} ${klasse}`}
      >
        {text}
      </button>
    );
  };
  return (
    <form
      action={speichereAnsicht}
      role="group"
      aria-label={t.ansicht}
      className="inline-flex rounded-xl border border-line bg-surface p-0.5"
    >
      <input type="hidden" name="was" value="ansicht" />
      <input type="hidden" name="zurueck" value={zurueck} />
      {knopf("karten", t.karten)}
      {knopf("tabelle", t.tabelle)}
    </form>
  );
}

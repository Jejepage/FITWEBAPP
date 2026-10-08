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
  const aktivKlasse = "bg-brand text-white";
  const inaktivKlasse =
    "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800";
  const knopf = (wert: "karten" | "tabelle", text: string) => {
    // "auto": Karten unter 768 px, Tabelle darüber; die Hervorhebung folgt der Breite (CSS).
    const klasse =
      ansicht === wert
        ? aktivKlasse
        : ansicht !== "auto"
          ? inaktivKlasse
          : wert === "karten"
            ? "bg-brand text-white md:bg-transparent md:text-neutral-700 md:dark:text-neutral-300"
            : "text-neutral-700 dark:text-neutral-300 md:bg-brand md:text-white md:dark:text-white";
    return (
      <button
        type="submit"
        name="ansicht"
        value={wert}
        aria-pressed={
          ansicht === wert ? true : ansicht === "auto" ? undefined : false
        }
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
      className="inline-flex rounded-xl border border-neutral-300 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900"
    >
      <input type="hidden" name="was" value="ansicht" />
      <input type="hidden" name="zurueck" value={zurueck} />
      {knopf("karten", t.karten)}
      {knopf("tabelle", t.tabelle)}
    </form>
  );
}

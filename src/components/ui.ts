// Gemeinsame Tailwind-Klassen (Designvorlage: Monospace, dezente Pastellfarben, Karten 24 px, Felder 16 px). Alle Farben sind Tokens aus globals.css und schalten
// zwischen Hell und Dunkel selbst um. Tippflächen mindestens 44 px, Eingabeschrift mindestens 16 px
// (kein Zoom auf dem iPhone).

/** Eingabefeld, Auswahl, Textfeld: Fläche mit feinem Rahmen */
export const eingabe =
  "block w-full min-h-12 rounded-2xl border border-line bg-fill px-4 py-2.5 text-base text-ink placeholder:text-ink-3 transition-colors focus:border-accent-ink focus:bg-surface focus:outline-2 focus:outline-offset-0 focus:outline-tint disabled:opacity-60";

const knopf =
  "press inline-flex min-h-12 select-none items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-base font-semibold leading-tight disabled:cursor-not-allowed disabled:bg-fill-2 disabled:text-ink-3 disabled:border-transparent";
/** Hauptaktion: gefüllt */
export const knopfPrimaer = `${knopf} bg-accent text-on-accent hover:brightness-110`;
/** Nebenaktion: Pastellfläche (hell Akzent, dunkel Lavendel) */
export const knopfSekundaer = `${knopf} bg-tint-2 text-on-tint-2 hover:brightness-95`;
/** Zurückhaltend: nur Rahmen (wie „Abbrechen“ in der Vorlage) */
export const knopfNeutral = `${knopf} border border-ink-2 bg-transparent text-ink hover:bg-fill`;
/** Löschen/Abbrechen: getönt in Rot */
export const knopfGefahr = `${knopf} bg-bad-soft text-bad-ink hover:brightness-95`;
/** Nur Text (z. B. Zurück-Links in Kopfzeilen) */
export const knopfText = `press inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-base font-medium text-accent-ink hover:underline`;
/** Kleinerer Knopf für dichte Stellen (weiterhin ≥ 44 px Tippfläche) */
export const knopfKlein =
  "press inline-flex min-h-11 select-none items-center justify-center gap-1.5 rounded-2xl border border-line bg-fill px-4 py-2 text-sm font-semibold text-ink hover:bg-fill-2";

/** Karte mit feinem Rahmen */
export const karte = "rounded-card border border-line bg-surface p-5 shadow-card";
/** Gruppierte Liste im iOS-Stil: Container und Zeilen mit Trennlinie */
export const gruppe =
  "overflow-hidden rounded-card border border-line bg-surface shadow-card divide-y divide-line";
export const gruppeZeile = "flex min-h-12 items-center gap-3 px-4 py-3";

/** Große Seitentitel (Überschrift 28/36 Bold) */
export const titel = "text-[1.75rem] font-bold leading-9 tracking-tight text-ink lg:text-[2.25rem] lg:leading-tight";
/** Titel 18/26 */
export const abschnittTitel = "text-lg font-semibold leading-[1.625rem] text-ink lg:text-xl";
/** Kleine Überschrift über Gruppen (Beschriftung) */
export const kopfzeileKlein = "px-1 pb-2 text-sm font-medium text-ink-2";
export const hilfstext = "text-sm text-ink-3";

/** Getönte Hinweisfläche */
export const bannerInfo = "rounded-2xl bg-accent-soft p-4 text-ink";
export const bannerOk = "rounded-2xl bg-ok-soft p-4 text-ink";
export const bannerWarn = "rounded-2xl bg-warn-soft p-4 text-ink";
export const bannerFehler = "rounded-2xl bg-bad-soft p-4 text-ink";

/** Chip zum Filtern/Springen */
export const chip =
  "press inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-fill px-3.5 text-sm font-medium text-ink hover:bg-fill-2";
/** Segment-Umschalter (iOS Segmented Control) */
export const segmentRahmen = "inline-flex rounded-2xl border border-line bg-surface p-1";
export const segment =
  "press inline-flex min-h-9 items-center justify-center rounded-xl px-4 text-sm font-medium text-ink-2";
export const segmentAktiv = "bg-tint font-semibold text-on-tint";

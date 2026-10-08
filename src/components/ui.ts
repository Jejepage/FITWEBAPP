// Gemeinsame Tailwind-Klassen (iOS-Look). Alle Farben sind Tokens aus globals.css und schalten
// zwischen Hell und Dunkel selbst um. Tippflächen mindestens 44 px, Eingabeschrift mindestens 16 px
// (kein Zoom auf dem iPhone).

/** Eingabefeld, Auswahl, Textfeld: Fläche statt dicker Rahmen */
export const eingabe =
  "block w-full min-h-12 rounded-xl border border-line bg-fill px-4 py-2.5 text-[17px] text-ink placeholder:text-ink-3 transition-colors focus:border-accent focus:bg-surface focus:outline-2 focus:outline-offset-0 focus:outline-accent/40 disabled:opacity-60";

const knopf =
  "press inline-flex min-h-12 select-none items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[17px] font-semibold leading-tight";
/** Hauptaktion: gefüllt */
export const knopfPrimaer = `${knopf} bg-accent text-on-accent hover:brightness-110`;
/** Nebenaktion: getönt */
export const knopfSekundaer = `${knopf} bg-accent-soft text-accent-ink hover:brightness-95`;
/** Zurückhaltend: graue Fläche */
export const knopfNeutral = `${knopf} bg-fill-2 text-ink hover:brightness-95`;
/** Löschen/Abbrechen: getönt in Rot */
export const knopfGefahr = `${knopf} bg-bad-soft text-bad-ink hover:brightness-95`;
/** Nur Text (z. B. Zurück-Links in Kopfzeilen) */
export const knopfText = `press inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[17px] font-medium text-accent-ink hover:underline`;
/** Kleinerer Knopf für dichte Stellen (weiterhin ≥ 44 px Tippfläche) */
export const knopfKlein =
  "press inline-flex min-h-11 select-none items-center justify-center gap-1.5 rounded-xl bg-fill-2 px-4 py-2 text-[15px] font-semibold text-ink hover:brightness-95";

/** Weiche Karte ohne harten Rahmen */
export const karte = "rounded-card border border-line/50 bg-surface p-5 shadow-card";
/** Gruppierte Liste im iOS-Stil: Container und Zeilen mit Trennlinie */
export const gruppe =
  "overflow-hidden rounded-card border border-line/50 bg-surface shadow-card divide-y divide-line";
export const gruppeZeile = "flex min-h-12 items-center gap-3 px-4 py-3";

/** Große Seitentitel */
export const titel = "text-[2rem] font-bold leading-tight tracking-tight text-ink lg:text-[2.5rem]";
export const abschnittTitel = "text-xl font-semibold tracking-tight text-ink lg:text-2xl";
/** Kleine Überschrift über Gruppen (wie"EINSTELLUNGEN" in iOS) */
export const kopfzeileKlein = "px-1 pb-2 text-sm font-medium uppercase tracking-wide text-ink-3";
export const hilfstext = "text-sm text-ink-3";

/** Getönte Hinweisfläche */
export const bannerInfo = "rounded-2xl bg-accent-soft p-4 text-ink";
export const bannerOk = "rounded-2xl bg-ok-soft p-4 text-ink";
export const bannerWarn = "rounded-2xl bg-warn-soft p-4 text-ink";
export const bannerFehler = "rounded-2xl bg-bad-soft p-4 text-ink";

/** Chip zum Filtern/Springen */
export const chip =
  "press inline-flex min-h-9 items-center gap-1.5 rounded-full bg-fill px-3.5 text-sm font-medium text-ink hover:bg-fill-2";
/** Segment-Umschalter (iOS Segmented Control) */
export const segmentRahmen = "inline-flex rounded-xl bg-fill-2 p-1";
export const segment =
  "press inline-flex min-h-9 items-center justify-center rounded-lg px-4 text-[15px] font-medium text-ink-2";
export const segmentAktiv = "bg-surface text-ink shadow-sm";

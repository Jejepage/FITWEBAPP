import type { ReactNode } from "react";
import { IconKreisHaken, IconWarnung } from "@/components/einstellungen/icons-einstellungen";
import { IconHaken } from "@/components/icons";
import { bannerFehler, bannerOk, hilfstext, kopfzeileKlein } from "@/components/ui";

// Gemeinsame Bausteine für alle Formulare (Katalog, Einstellungen, Plan, Equipment).
// Rein optische Gestaltung: Props und Exporte bleiben kompatibel, neue Props sind optional.

/** Roter Rahmen am Eingabefeld, wenn das Feld einen Fehler hat (Kind-Elemente von Feld). */
const FELD_MIT_FEHLER = "[&_:is(input,select,textarea)]:border-bad";

function FehlerText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-bad-ink">
      <IconWarnung className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Beschriftung über dem Feld, Hilfe darunter, Fehler in Rot (mit rotem Rahmen am Feld). */
export function Feld({
  label,
  hilfe,
  fehler,
  punkt,
  klasse = "mb-5",
  children,
}: {
  label: string;
  hilfe?: string;
  fehler?: string;
  /** Farbklasse eines kleinen Punkts vor der Beschriftung (z. B. Musterfarbe `bg-m-kn`) */
  punkt?: string;
  /** Klassen des äußeren Elements (Standard: Abstand nach unten) */
  klasse?: string;
  children: ReactNode;
}) {
  return (
    <div className={klasse}>
      <label className={`block ${fehler ? FELD_MIT_FEHLER : ""}`}>
        <span className="mb-1.5 flex items-start gap-2 text-sm font-medium leading-tight text-ink-2">
          {punkt && (
            <span
              aria-hidden="true"
              className={`mt-[3px] size-2.5 shrink-0 rounded-full ${punkt}`}
            />
          )}
          {label}
        </span>
        {children}
      </label>
      {hilfe && <p className={`${hilfstext} mt-1.5`}>{hilfe}</p>}
      {fehler && <FehlerText>{fehler}</FehlerText>}
    </div>
  );
}

/** Ganze Zeile als Tippfläche; gewählte Zeile wird akzentfarbig getönt. */
const AUSWAHL_ZEILE =
  "press flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line bg-fill px-4 py-2.5 has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:disabled]:cursor-default has-[:disabled]:opacity-75";

function AuswahlText({ label, hilfe }: { label: string; hilfe?: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[17px] leading-snug text-ink">{label}</span>
      {hilfe && <span className="mt-0.5 block text-sm leading-snug text-ink-3">{hilfe}</span>}
    </span>
  );
}

interface AuswahlProps {
  name: string;
  value?: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Kleiner Hilfetext unter der Beschriftung (Teil der Tippfläche) */
  hilfe?: string;
}

export function Checkbox({ name, value, label, checked, disabled, required, hilfe }: AuswahlProps) {
  return (
    <label className={AUSWAHL_ZEILE}>
      <span className="relative grid size-6 shrink-0 place-items-center">
        <input
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={checked}
          disabled={disabled}
          required={required}
          className="peer size-6 cursor-[inherit] appearance-none rounded-md border-2 border-ink-3 bg-surface transition-colors checked:border-accent checked:bg-accent"
        />
        <IconHaken className="pointer-events-none absolute inset-0 m-auto size-4 text-on-accent opacity-0 transition-opacity peer-checked:opacity-100" />
      </span>
      <AuswahlText label={label} hilfe={hilfe} />
    </label>
  );
}

/** Einzelauswahl in derselben Zeilen-Optik wie Checkbox. */
export function Radio({ name, value, label, checked, disabled, required, hilfe }: AuswahlProps) {
  return (
    <label className={AUSWAHL_ZEILE}>
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={checked}
        disabled={disabled}
        required={required}
        className="size-6 shrink-0 cursor-[inherit] appearance-none rounded-full border-2 border-ink-3 bg-surface transition-all checked:border-[7px] checked:border-accent"
      />
      <AuswahlText label={label} hilfe={hilfe} />
    </label>
  );
}

/** Fieldset mit Legende im Stil kleiner Gruppenüberschriften. */
export function Gruppe({
  legende,
  fehler,
  hilfe,
  children,
}: {
  legende: string;
  fehler?: string;
  hilfe?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="mb-6 min-w-0">
      <legend className={kopfzeileKlein}>{legende}</legend>
      {hilfe && <p className={`${hilfstext} -mt-1 mb-3 px-1`}>{hilfe}</p>}
      <div className="space-y-2 [&>.grid:not([class*=gap])]:gap-2">{children}</div>
      {fehler && <FehlerText>{fehler}</FehlerText>}
    </fieldset>
  );
}

/** Fehlermeldung des Servers oder Formulars (role=alert). */
export function FehlerBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className={`${bannerFehler} mb-4 flex items-start gap-3 text-[15px] font-medium`}
    >
      <IconWarnung className="mt-0.5 size-5 shrink-0 text-bad-ink" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function ErfolgBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className={`${bannerOk} mb-4 flex items-start gap-3 text-[15px] font-medium`}
    >
      <IconKreisHaken className="mt-0.5 size-5 shrink-0 text-ok-ink" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

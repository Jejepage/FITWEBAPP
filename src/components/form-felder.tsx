import type { ReactNode } from "react";

// Kleine, gemeinsame Bausteine für alle Formulare (Katalog, Einstellungen, Profile).

export function Feld({
  label,
  hilfe,
  fehler,
  children,
}: {
  label: string;
  hilfe?: string;
  fehler?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{label}</span>
        {children}
      </label>
      {hilfe && <p className="mt-1 text-sm text-ink-3">{hilfe}</p>}
      {fehler && (
        <p role="alert" className="mt-1 text-sm font-medium text-bad-ink">
          {fehler}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  name,
  value,
  label,
  checked,
  disabled,
}: {
  name: string;
  value?: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        disabled={disabled}
        className="size-5"
      />
      <span>{label}</span>
    </label>
  );
}

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
    <fieldset className="mb-4 rounded-lg border border-line p-3">
      <legend className="px-1 text-sm font-medium">{legende}</legend>
      {hilfe && <p className="mb-1 text-sm text-ink-3">{hilfe}</p>}
      {children}
      {fehler && (
        <p role="alert" className="mt-1 text-sm font-medium text-bad-ink">
          {fehler}
        </p>
      )}
    </fieldset>
  );
}

export function FehlerBanner({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mb-4 rounded-lg bg-bad-soft p-3 text-sm font-medium text-bad-ink">
      {children}
    </p>
  );
}

export function ErfolgBanner({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mb-4 rounded-lg bg-ok-soft p-3 text-sm font-medium text-ok-ink">
      {children}
    </p>
  );
}

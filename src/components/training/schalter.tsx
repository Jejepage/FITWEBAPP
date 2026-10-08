import type { ReactNode } from "react";

/**
 * Schalter im iOS-Stil. Technisch bleibt es eine ganz normale Checkbox (Beschriftung, Name,
 * Tastatur und Formularversand unverändert); nur das Aussehen ist ein Schalter.
 * Die ganze Zeile ist die Tippfläche.
 */
export function Schalter({
  children,
  name,
  checked,
  defaultChecked,
  onChange,
  klasse = "",
}: {
  children: ReactNode;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  klasse?: string;
}) {
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3 ${klasse}`}
    >
      <span className="text-base leading-snug">{children}</span>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="relative h-8 w-[3.25rem] shrink-0 cursor-pointer appearance-none rounded-full bg-fill-2 ring-1 ring-inset ring-line transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:size-7 after:rounded-full after:bg-on-accent after:shadow-md after:transition-transform after:duration-200 checked:bg-accent checked:ring-0 checked:after:translate-x-5"
      />
    </label>
  );
}

import type { ReactNode } from "react";

const farben = {
  neutral: "bg-fill text-ink-2",
  hinweis: "bg-warn-soft text-warn-ink",
  gut: "bg-ok-soft text-ok-ink",
  grau: "bg-fill-2 text-ink-3",
  akzent: "bg-accent-soft text-accent-ink",
  fehler: "bg-bad-soft text-bad-ink",
} as const;

export function Badge({
  children,
  farbe = "neutral",
  klasse = "",
}: {
  children: ReactNode;
  farbe?: keyof typeof farben;
  /** Eigene Farbklassen (z. B. Musterfarbe), ersetzen die Farbe */
  klasse?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${klasse || farben[farbe]}`}
    >
      {children}
    </span>
  );
}

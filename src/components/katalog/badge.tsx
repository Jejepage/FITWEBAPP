import type { ReactNode } from "react";

const farben = {
  neutral:
    "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  hinweis:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  gut: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  grau: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
} as const;

export function Badge({
  children,
  farbe = "neutral",
}: {
  children: ReactNode;
  farbe?: keyof typeof farben;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${farben[farbe]}`}
    >
      {children}
    </span>
  );
}

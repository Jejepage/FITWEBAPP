// Symbole und Kachel nur für Einstellungen, Formulare, Login und Hinweis (24 × 24, Linienstil, wie
// src/components/icons.tsx). Dekorativ: aria-hidden.
import type { ReactNode, SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "children">;

function Svg({ children, ...rest }: Props & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="size-6"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconWarnung = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4 2.9 19.4a1 1 0 0 0 .9 1.5h16.4a1 1 0 0 0 .9-1.5L12 4Z" />
    <path d="M12 10v4.5M12 17.6h.01" />
  </Svg>
);
export const IconInfo = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.7h.01" />
  </Svg>
);
export const IconKreisHaken = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 3 3 5-6" />
  </Svg>
);
export const IconDownload = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4v11M7.5 11 12 15.5l4.5-4.5M5 19.5h14" />
  </Svg>
);
export const IconUpload = (p: Props) => (
  <Svg {...p}>
    <path d="M12 15.5v-11M7.5 9 12 4.5 16.5 9M5 19.5h14" />
  </Svg>
);
export const IconInstallieren = (p: Props) => (
  <Svg {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.6" />
    <path d="M12 7.5v5M9.8 10.5 12 12.7l2.2-2.2M10.5 18.5h3" />
  </Svg>
);
export const IconAbmelden = (p: Props) => (
  <Svg {...p}>
    <path d="M14 4.5h4.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h10" />
  </Svg>
);
export const IconDatenbank = (p: Props) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  </Svg>
);
export const IconSchloss = (p: Props) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);

const TON = {
  akzent: "bg-accent-soft text-accent-ink",
  ok: "bg-ok-soft text-ok-ink",
  warn: "bg-warn-soft text-warn-ink",
  bad: "bg-bad-soft text-bad-ink",
  grau: "bg-fill-2 text-ink-2",
  verlauf: "bg-gradient-to-br from-hero-from to-hero-to text-on-accent shadow-card",
} as const;

/** Runde Symbolkachel (wie in der iOS-Einstellungen-App). */
export function SymbolKachel({
  ton = "akzent",
  gross = false,
  children,
}: {
  ton?: keyof typeof TON;
  gross?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center ${gross ? "size-12 rounded-2xl" : "size-10 rounded-xl"} ${TON[ton]}`}
    >
      {children}
    </span>
  );
}

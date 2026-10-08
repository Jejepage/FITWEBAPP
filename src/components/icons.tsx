// Eigene Inline-SVG-Symbole (24 × 24, Linienstil), keine Bibliothek. Dekorativ: aria-hidden.
import type { ReactNode, SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & { gross?: boolean };

function Svg({ gross, children, ...rest }: Props & { children: ReactNode }) {
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
      className={gross ? "size-7" : "size-6"}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconStart = (p: Props) => (
  <Svg {...p}>
    <path d="M3.5 10.8 12 3.5l8.5 7.3" />
    <path d="M5.5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.5" />
    <path d="M10 20.5v-5h4v5" />
  </Svg>
);
export const IconKatalog = (p: Props) => (
  <Svg {...p}>
    <path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" />
    <path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H19" />
    <path d="M9 8h6" />
  </Svg>
);
export const IconPlan = (p: Props) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <path d="m9 15 2 2 4-4" />
  </Svg>
);
export const IconVerlauf = (p: Props) => (
  <Svg {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="m7.5 14.5 3.5-4 3 2.5 4.5-6" />
  </Svg>
);
export const IconEinstellungen = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Svg>
);
export const IconHantel = (p: Props) => (
  <Svg {...p}>
    <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
  </Svg>
);
export const IconPlay = (p: Props) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
  </Svg>
);
export const IconHaken = (p: Props) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const IconPfeilRechts = (p: Props) => (
  <Svg {...p} strokeWidth={2.2}>
    <path d="m9.5 5 7 7-7 7" />
  </Svg>
);
export const IconPfeilLinks = (p: Props) => (
  <Svg {...p} strokeWidth={2.2}>
    <path d="m14.5 5-7 7 7 7" />
  </Svg>
);
export const IconSuche = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
);
export const IconFilter = (p: Props) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Svg>
);
export const IconPlus = (p: Props) => (
  <Svg {...p} strokeWidth={2.2}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMinus = (p: Props) => (
  <Svg {...p} strokeWidth={2.2}>
    <path d="M5 12h14" />
  </Svg>
);
export const IconTabelle = (p: Props) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M3.5 15h17M9.5 4.5v15" />
  </Svg>
);
export const IconKarten = (p: Props) => (
  <Svg {...p}>
    <rect x="3.5" y="4" width="17" height="7" rx="2.5" />
    <rect x="3.5" y="13" width="17" height="7" rx="2.5" />
  </Svg>
);
export const IconBlitz = (p: Props) => (
  <Svg {...p}>
    <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />
  </Svg>
);

// Symbole, die nur Start und Training brauchen (24 × 24, Linienstil wie in components/icons.tsx).
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

export const IconChevronUnten = (p: Props) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Svg>
);
export const IconTausch = (p: Props) => (
  <Svg {...p}>
    <path d="M4 8.5h14.5M15 5l3.5 3.5L15 12" />
    <path d="M20 15.5H5.5M9 12l-3.5 3.5L9 19" />
  </Svg>
);
export const IconMehr = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth={2.6} />
  </Svg>
);
export const IconZurueck = (p: Props) => (
  <Svg {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Svg>
);
export const IconBuch = (p: Props) => (
  <Svg {...p}>
    <path d="M12 6.5C10.3 5.2 8 4.8 4.5 5v12.5c3.5-.2 5.8.2 7.5 1.5 1.7-1.3 4-1.7 7.5-1.5V5c-3.5-.2-5.8.2-7.5 1.5Z" />
    <path d="M12 6.5V19" />
  </Svg>
);
export const IconUhr = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);
export const IconZiel = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </Svg>
);
export const IconSonne = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
  </Svg>
);
export const IconPokal = (p: Props) => (
  <Svg {...p}>
    <path d="M8 4.5h8v5a4 4 0 0 1-8 0v-5Z" />
    <path d="M8 6.5H5v1.2a3 3 0 0 0 3 3M16 6.5h3v1.2a3 3 0 0 1-3 3" />
    <path d="M12 13.5V17M8.5 19.5h7M10 19.5v-2.5h4v2.5" />
  </Svg>
);
export const IconBlock = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="m8.5 12.3 2.4 2.4 4.6-4.9" strokeWidth={2.2} />
  </Svg>
);
export const IconAbbrechen = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </Svg>
);

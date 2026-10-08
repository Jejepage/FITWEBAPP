// Lokale Symbole für Katalog, Plan und Verlauf (24 × 24, Linienstil, dekorativ).
import type { ReactNode, SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "children">;

function Svg({ children, ...rest }: Props & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="size-5"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconWarnung = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4 2.8 19.5a1 1 0 0 0 .9 1.5h16.6a1 1 0 0 0 .9-1.5L12 4Z" />
    <path d="M12 10v4.5M12 17.6v.1" />
  </Svg>
);
export const IconInfo = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.9v.1" />
  </Svg>
);
export const IconHakenKreis = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 3 3 5-6" />
  </Svg>
);
export const IconZurueck = (p: Props) => (
  <Svg {...p} strokeWidth={2.3}>
    <path d="m14.5 5-7 7 7 7" />
  </Svg>
);
export const IconChevron = (p: Props) => (
  <Svg {...p} strokeWidth={2.3}>
    <path d="m9.5 5 7 7-7 7" />
  </Svg>
);

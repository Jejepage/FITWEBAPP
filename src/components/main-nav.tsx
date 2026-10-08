"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  IconEinstellungen,
  IconHantel,
  IconKatalog,
  IconPlan,
  IconStart,
  IconVerlauf,
} from "@/components/icons";
import { de } from "@/i18n/de";

const items: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { href: "/", label: de.nav.start, Icon: IconStart },
  { href: "/katalog", label: de.nav.katalog, Icon: IconKatalog },
  { href: "/plan", label: de.nav.plan, Icon: IconPlan },
  { href: "/verlauf", label: de.nav.verlauf, Icon: IconVerlauf },
  {
    href: "/einstellungen",
    label: de.nav.einstellungen,
    Icon: IconEinstellungen,
  },
];

/**
 * Eine Navigation, zwei Gestalten: unter 1024 px durchscheinende Tab-Leiste am unteren Rand
 * (Symbol über Beschriftung), ab 1024 px feste Seitenleiste links (Symbol neben Beschriftung).
 */
export function MainNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-overlay pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:inset-y-0 lg:right-auto lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-t-0 lg:bg-surface lg:pb-0 lg:backdrop-blur-none"
    >
      <div className="hidden items-center gap-3 px-6 pb-6 pt-8 lg:flex">
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-hero-from to-hero-to text-white shadow-card"
        >
          <IconHantel className="size-6" />
        </span>
        <span className="text-xl font-bold tracking-tight">{de.app.name}</span>
      </div>
      <ul className="mx-auto flex max-w-xl justify-around px-1 lg:mx-0 lg:max-w-none lg:flex-col lg:gap-1 lg:px-3">
        {items.map(({ href, label, Icon }) => {
          const aktiv = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1 lg:flex-none">
              <Link
                href={href}
                aria-current={aktiv ? "page" : undefined}
                className={`press flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-base ${
                  aktiv
                    ? "text-accent-ink lg:bg-accent-soft lg:font-semibold"
                    : "text-ink-3 hover:text-ink lg:hover:bg-fill"
                }`}
              >
                <Icon className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

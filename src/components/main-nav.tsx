"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { de } from "@/i18n/de";

const items = [
  { href: "/", label: de.nav.start },
  { href: "/katalog", label: de.nav.katalog },
  { href: "/plan", label: de.nav.plan },
  { href: "/verlauf", label: de.nav.verlauf },
  { href: "/einstellungen", label: de.nav.einstellungen },
] as const;

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-neutral-800 dark:bg-neutral-900 md:static md:border-t-0 md:border-b md:pb-0"
    >
      <ul className="mx-auto flex max-w-3xl justify-around md:justify-start md:gap-2 md:px-4">
        {items.map((item) => {
          const aktiv = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1 md:flex-none">
              <Link
                href={item.href}
                aria-current={aktiv ? "page" : undefined}
                className={`block px-2 py-3 text-center text-sm md:px-4 ${
                  aktiv ? "font-semibold text-brand" : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

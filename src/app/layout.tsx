import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { HinweisGate } from "@/components/hinweis-gate";
import { MainNav } from "@/components/main-nav";
import { SwRegistrar } from "@/components/sw-registrar";
import { db } from "@/db/client";
import { SESSION_COOKIE } from "@/domain/auth";
import { de } from "@/i18n/de";
import { istAngemeldet } from "@/server/auth";
import { getSettings } from "@/server/settings";
import "./globals.css";

// Liest die Einstellungen (Hinweis bestätigt?) aus der DB, nie zur Buildzeit.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: de.app.name,
  description: de.app.description,
  applicationName: de.app.name,
  // iPhone: vom Home-Bildschirm im Vollbild starten, mit eigenem Symbol
  appleWebApp: { capable: true, title: de.app.name, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Mit Passwortschutz und ohne gültige Sitzung gibt es nur die Anmeldeseite, weder Navigation
  // noch Hinweisseite (deren Bestätigung wäre ohne Sitzung ohnehin nicht möglich).
  const angemeldet = istAngemeldet((await cookies()).get(SESSION_COOKIE)?.value);
  const hinweisBestaetigt = angemeldet && getSettings(db).hinweisAkzeptiertAm !== null;
  return (
    <html lang="de">
      <body className="min-h-dvh">
        <SwRegistrar />
        {!angemeldet ? (
          <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">{children}</main>
        ) : hinweisBestaetigt ? (
          <>
            <MainNav />
            <main className="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6 lg:pb-12 lg:pl-[calc(16rem+2.5rem)] lg:pr-10 lg:pt-10">
              {children}
            </main>
          </>
        ) : (
          <main className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
            <HinweisGate />
          </main>
        )}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { HinweisGate } from "@/components/hinweis-gate";
import { MainNav } from "@/components/main-nav";
import { db } from "@/db/client";
import { de } from "@/i18n/de";
import { getSettings } from "@/server/settings";
import "./globals.css";

// Liest die Einstellungen (Hinweis bestätigt?) aus der DB, nie zur Buildzeit.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: de.app.name,
  description: de.app.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const hinweisBestaetigt = getSettings(db).hinweisAkzeptiertAm !== null;
  return (
    <html lang="de">
      <body className="min-h-dvh pb-20 md:pb-0">
        {hinweisBestaetigt ? (
          <>
            <MainNav />
            <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
          </>
        ) : (
          <main className="mx-auto max-w-3xl px-4 py-6">
            <HinweisGate />
          </main>
        )}
      </body>
    </html>
  );
}

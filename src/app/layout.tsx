import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MainNav } from "@/components/main-nav";
import { de } from "@/i18n/de";
import "./globals.css";

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
  return (
    <html lang="de">
      <body className="min-h-dvh pb-20 md:pb-0">
        <MainNav />
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

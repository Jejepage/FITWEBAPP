import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Nur für parallele Entwicklungsläufe (jeder Lauf baut in einen eigenen Ordner); Standard: .next
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Der Service Worker darf nie veraltet aus dem Browser-Cache kommen und gilt für die ganze App.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "text/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;

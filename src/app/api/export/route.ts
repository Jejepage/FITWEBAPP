import { db } from "@/db/client";
import type { BackupArt } from "@/domain/backup-types";
import { exportiere } from "@/server/backup";

export const dynamic = "force-dynamic";

/** Backup als Download: ?art=alles (Standard) oder ?art=katalog. */
export function GET(req: Request): Response {
  const art: BackupArt =
    new URL(req.url).searchParams.get("art") === "katalog" ? "katalog" : "alles";
  const datei = exportiere(db, art);
  const tag = datei.erstelltAm.slice(0, 10);
  const name = art === "alles" ? `fitness-backup-${tag}.json` : `fitness-katalog-${tag}.json`;
  return new Response(JSON.stringify(datei, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

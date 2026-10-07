import { sqlite } from "@/db/client";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    sqlite.prepare("select 1").get();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}

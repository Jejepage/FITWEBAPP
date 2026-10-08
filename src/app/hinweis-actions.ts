"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/domain/auth";
import { istAngemeldet } from "@/server/auth";
import { db } from "@/db/client";
import { hinweisAkzeptieren } from "@/server/settings";

export async function hinweisBestaetigen(): Promise<void> {
  // Die Action steht über das Layout auch auf freien Seiten (/login): ohne Sitzung nichts schreiben.
  if (!istAngemeldet((await cookies()).get(SESSION_COOKIE)?.value)) return;
  hinweisAkzeptieren(db);
  revalidatePath("/", "layout");
}

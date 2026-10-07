"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { hinweisAkzeptieren } from "@/server/settings";

export async function hinweisBestaetigen(): Promise<void> {
  hinweisAkzeptieren(db);
  revalidatePath("/", "layout");
}

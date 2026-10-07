import { notFound, redirect } from "next/navigation";
import { TrainingsAnsicht } from "@/components/training/trainings-ansicht";
import { db } from "@/db/client";
import { ladeTrainingsDaten } from "@/server/training-daten";
import { getWorkout } from "@/server/workouts";

export const dynamic = "force-dynamic";

export default async function TrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const w = getWorkout(db, Number(id));
  if (!w) notFound();
  // Beendete oder abgebrochene Einheiten haben keinen Trainingsbildschirm mehr.
  if (w.status !== "laufend") redirect("/");

  const daten = ladeTrainingsDaten(db, w.id);
  if (!daten) notFound();
  return <TrainingsAnsicht daten={daten} />;
}

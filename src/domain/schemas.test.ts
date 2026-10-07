import { describe, expect, it } from "vitest";
import { equipmentBedingungSchema } from "./schemas";

describe("equipmentBedingung", () => {
  it("akzeptiert Gruppenlisten und die leere Liste", () => {
    expect(equipmentBedingungSchema.safeParse([]).success).toBe(true);
    expect(equipmentBedingungSchema.safeParse([["kurzhanteln", "kettlebell"]]).success).toBe(true);
    expect(equipmentBedingungSchema.safeParse([["kurzhanteln"], ["bank"]]).success).toBe(true);
  });
  it("verwirft unbekannte Arten und leere Gruppen", () => {
    expect(equipmentBedingungSchema.safeParse([["hantelbank"]]).success).toBe(false);
    expect(equipmentBedingungSchema.safeParse([[]]).success).toBe(false);
    expect(equipmentBedingungSchema.safeParse([["keins"]]).success).toBe(false);
  });
});

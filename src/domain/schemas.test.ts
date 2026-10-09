import { describe, expect, it } from "vitest";
import { equipmentBedingungSchema } from "./schemas";

describe("equipmentBedingung", () => {
  it("akzeptiert Gerätelisten und die leere Liste", () => {
    expect(equipmentBedingungSchema.safeParse([]).success).toBe(true);
    expect(equipmentBedingungSchema.safeParse(["kettlebell"]).success).toBe(true);
    expect(equipmentBedingungSchema.safeParse(["kurzhanteln", "bank"]).success).toBe(true);
  });
  it("verwirft unbekannte Arten, 'keins', Doppelte und das alte Gruppenformat", () => {
    expect(equipmentBedingungSchema.safeParse(["hantelbank"]).success).toBe(false);
    expect(equipmentBedingungSchema.safeParse(["keins"]).success).toBe(false);
    expect(equipmentBedingungSchema.safeParse(["bank", "bank"]).success).toBe(false);
    expect(equipmentBedingungSchema.safeParse([["kurzhanteln"]]).success).toBe(false);
  });
});

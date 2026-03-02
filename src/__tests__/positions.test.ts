import { describe, expect, it } from "vitest";
import { mapPosition, resolvePosition } from "@/lib/positions";

describe("resolvePosition", () => {
  it("defender + primary ZAG -> ZAG", () => {
    expect(resolvePosition("defender", "ZAG", null)).toBe("ZAG");
  });

  it("defender + primary VOL -> fallback ZAG", () => {
    expect(resolvePosition("defender", "VOL", null)).toBe("ZAG");
  });

  it("midfielder + primary VOL, secondary ZAG -> VOL", () => {
    expect(resolvePosition("midfielder", "VOL", "ZAG")).toBe("VOL");
  });

  it("midfielder + primary GK, secondary MC -> MC", () => {
    expect(resolvePosition("midfielder", "GK", "MC")).toBe("MC");
  });

  it("midfielder + primary GK, without secondary -> VOL", () => {
    expect(resolvePosition("midfielder", "GK", null)).toBe("VOL");
  });

  it("goalkeeper + primary GK -> GK", () => {
    expect(resolvePosition("goalkeeper", "GK", "MC")).toBe("GK");
  });

  it("forward + primary ATA -> ATA", () => {
    expect(resolvePosition("forward", "ATA", "AD")).toBe("ATA");
  });

  it("midfielder ambiguity, primary MC, secondary AE -> MC", () => {
    expect(resolvePosition("midfielder", "MC", "AE")).toBe("MC");
  });
});

describe("mapPosition", () => {
  it("is an alias of resolvePosition", () => {
    expect(mapPosition("midfielder", "GK", "AE")).toBe("AE");
  });
});

import { describe, expect, it } from "vitest";
import { hasAnyRole, hasRole } from "@/lib/auth/roles";

describe("auth roles helpers", () => {
  it("hasRole retorna true quando role requerida existe", () => {
    expect(hasRole(["player", "manager"], "manager")).toBe(true);
  });

  it("hasRole retorna false quando role requerida não existe", () => {
    expect(hasRole(["player"], "admin")).toBe(false);
  });

  it("hasAnyRole retorna true quando existe pelo menos uma role requerida", () => {
    expect(hasAnyRole(["moderator"], ["manager", "moderator", "admin"])).toBe(true);
  });

  it("hasAnyRole retorna false quando nenhuma role requerida existe", () => {
    expect(hasAnyRole(["player"], ["manager", "admin"])).toBe(false);
  });
});


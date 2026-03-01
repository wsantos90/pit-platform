import { describe, expect, it } from "vitest"
import { normalizeModerationTab } from "@/app/(dashboard)/moderation/tabs"

describe("moderation tab normalization", () => {
  it("retorna tab válida em lowercase", () => {
    expect(normalizeModerationTab("Claims")).toBe("claims")
    expect(normalizeModerationTab("USERS")).toBe("users")
  })

  it("retorna null para tab inválida", () => {
    expect(normalizeModerationTab("finance")).toBeNull()
    expect(normalizeModerationTab("")).toBeNull()
    expect(normalizeModerationTab(undefined)).toBeNull()
  })
})

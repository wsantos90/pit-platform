import { describe, expect, it } from "vitest"
import { normalizeAdminTab } from "@/app/(dashboard)/admin/tabs"

describe("admin tab normalization", () => {
  it("returns valid tab in lowercase", () => {
    expect(normalizeAdminTab("Dashboard")).toBe("dashboard")
    expect(normalizeAdminTab("SUBSCRIPTIONS")).toBe("subscriptions")
    expect(normalizeAdminTab("manual-id")).toBe("manual-id")
  })

  it("returns null for invalid tab", () => {
    expect(normalizeAdminTab("claims")).toBeNull()
    expect(normalizeAdminTab("")).toBeNull()
    expect(normalizeAdminTab(undefined)).toBeNull()
  })
})

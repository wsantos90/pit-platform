export const adminTabs = ["dashboard", "discovery", "manual-id", "financial", "settings", "subscriptions", "collect"] as const

export type AdminTab = (typeof adminTabs)[number]

const adminTabSet = new Set<AdminTab>(adminTabs)

export function normalizeAdminTab(value: string | null | undefined): AdminTab | null {
  if (!value) return null
  const normalized = value.toLowerCase()
  if (adminTabSet.has(normalized as AdminTab)) {
    return normalized as AdminTab
  }
  return null
}

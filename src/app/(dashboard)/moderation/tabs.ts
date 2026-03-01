export const moderationTabs = ["claims", "tournaments", "disputes", "users"] as const

export type ModerationTab = (typeof moderationTabs)[number]

const moderationTabSet = new Set<ModerationTab>(moderationTabs)

export function normalizeModerationTab(value: string | null | undefined): ModerationTab | null {
  if (!value) return null
  const normalized = value.toLowerCase()
  if (moderationTabSet.has(normalized as ModerationTab)) {
    return normalized as ModerationTab
  }
  return null
}

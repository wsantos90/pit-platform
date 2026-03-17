import type { Notification } from "@/types/database"

function getRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function getString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null
}

export function resolveNotificationRoute(notification: Pick<Notification, "type" | "data">) {
  const data = getRecord(notification.data)
  const tournamentId = getString(data.tournament_id)

  switch (notification.type) {
    case "claim_approved":
      return "/team"
    case "claim_rejected":
    case "team_discovered":
      return "/team/claim"
    case "match_found":
    case "match_expired":
      return "/matchmaking"
    case "tournament_confirmed":
    case "tournament_cancelled":
      return tournamentId ? `/tournaments/${tournamentId}` : "/tournaments"
    case "payment_due":
    case "payment_overdue":
      return tournamentId ? `/tournaments/${tournamentId}` : "/tournaments"
    case "dispute_update":
      return "/moderation/disputes"
    case "roster_invite":
      return "/team/roster"
    case "general":
    default:
      return "/dashboard"
  }
}

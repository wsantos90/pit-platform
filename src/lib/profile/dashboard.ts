import type { MatchType, PlayerPosition } from "@/types/database"

export const PROFILE_MATCH_TYPES: MatchType[] = ["championship", "friendly_pit"]

export const PROFILE_PERIOD_OPTIONS = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "all", label: "Todo período" },
] as const

export type ProfilePeriod = (typeof PROFILE_PERIOD_OPTIONS)[number]["value"]

export type ProfileMatchRelation = {
  id: string
  match_timestamp: string
  match_type: MatchType
  home_score: number
  away_score: number
  home_club_name: string
  away_club_name: string
  home_club_id: string | null
  away_club_id: string | null
  home_ea_club_id: string
  away_ea_club_id: string
}

export type ProfileClubRelation = {
  display_name: string | null
}

export type ProfileMatchRow = {
  id: string
  player_id?: string | null
  club_id: string | null
  ea_club_id: string
  goals: number
  assists: number
  rating: number | null
  passes_completed: number
  tackles_made: number
  saves?: number
  resolved_position: PlayerPosition | null
  man_of_match: boolean
  matches: ProfileMatchRelation | ProfileMatchRelation[] | null
  clubs?: ProfileClubRelation | ProfileClubRelation[] | null
}

export type NormalizedProfileMatchRow = Omit<ProfileMatchRow, "matches" | "clubs"> & {
  matches: ProfileMatchRelation
  clubs: ProfileClubRelation | null
}

export const PLAYER_POSITION_OPTIONS: Array<{ value: PlayerPosition | "all"; label: string }> = [
  { value: "all", label: "Todas posições" },
  { value: "GK", label: "GK" },
  { value: "ZAG", label: "ZAG" },
  { value: "VOL", label: "VOL" },
  { value: "MC", label: "MC" },
  { value: "AE", label: "AE" },
  { value: "AD", label: "AD" },
  { value: "ATA", label: "ATA" },
]

export function getPeriodCutoff(period: ProfilePeriod) {
  if (period === "all") {
    return null
  }

  const days = Number.parseInt(period.replace("d", ""), 10)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return cutoff.toISOString()
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0)
}

export function formatRating(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  return value.toFixed(2)
}

export function formatDateTime(value: string, options?: Intl.DateTimeFormatOptions) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  }).format(parsed)
}

/** Converte valor numérico do banco (pode chegar como string). Retorna null para null/inválido. */
export function parseNumeric(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function normalizeProfileMatchRow(row: ProfileMatchRow): NormalizedProfileMatchRow | null {
  const match = Array.isArray(row.matches) ? row.matches[0] : row.matches
  const club = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs ?? null

  if (!match) {
    return null
  }

  return {
    ...row,
    matches: match,
    clubs: club,
  }
}

function isHomeClub(match: ProfileMatchRelation, clubId: string | null, eaClubId: string) {
  if (clubId && match.home_club_id === clubId) {
    return true
  }

  return match.home_ea_club_id === eaClubId
}

function isAwayClub(match: ProfileMatchRelation, clubId: string | null, eaClubId: string) {
  if (clubId && match.away_club_id === clubId) {
    return true
  }

  return match.away_ea_club_id === eaClubId
}

export function getOpponentName(row: NormalizedProfileMatchRow) {
  if (isHomeClub(row.matches, row.club_id, row.ea_club_id)) {
    return row.matches.away_club_name
  }

  if (isAwayClub(row.matches, row.club_id, row.ea_club_id)) {
    return row.matches.home_club_name
  }

  return row.matches.away_club_name
}

export function getScoreline(row: NormalizedProfileMatchRow) {
  if (isHomeClub(row.matches, row.club_id, row.ea_club_id)) {
    return `${row.matches.home_score}-${row.matches.away_score}`
  }

  if (isAwayClub(row.matches, row.club_id, row.ea_club_id)) {
    return `${row.matches.away_score}-${row.matches.home_score}`
  }

  return `${row.matches.home_score}-${row.matches.away_score}`
}

export function getMatchResult(row: NormalizedProfileMatchRow) {
  const clubIsHome = isHomeClub(row.matches, row.club_id, row.ea_club_id)
  const clubIsAway = isAwayClub(row.matches, row.club_id, row.ea_club_id)
  const ownScore = clubIsHome ? row.matches.home_score : clubIsAway ? row.matches.away_score : row.matches.home_score
  const opponentScore = clubIsHome ? row.matches.away_score : clubIsAway ? row.matches.home_score : row.matches.away_score

  if (ownScore > opponentScore) {
    return "W"
  }

  if (ownScore < opponentScore) {
    return "L"
  }

  return "D"
}

export function getResultBadgeClass(result: "W" | "D" | "L") {
  if (result === "W") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
  }

  if (result === "L") {
    return "border-destructive/30 bg-destructive/10 text-destructive"
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-700"
}

export function getRatingClass(rating: number | null) {
  if (rating === null || rating === undefined) {
    return "text-muted-foreground"
  }

  if (rating >= 8) {
    return "text-emerald-600"
  }

  if (rating >= 6.5) {
    return "text-amber-600"
  }

  return "text-destructive"
}

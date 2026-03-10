import { createAdminClient } from "@/lib/supabase/admin"
import {
  createEmptyMatchClassificationContext,
  normalizeMatchPairKey,
  type MatchClassificationContext,
} from "@/lib/match-classifier"

type AdminClient = ReturnType<typeof createAdminClient>

type TournamentBracketRow = {
  tournament_id: string
  round: string | null
  home_club_id: string | null
  away_club_id: string | null
}

type ConfrontationChatRow = {
  id: string
  club_a_id: string | null
  club_b_id: string | null
}

type ClubLookupRow = {
  id: string
  ea_club_id: string
}

type LoadMatchClassificationContextOptions = {
  targetEaClubIds?: string[] | null
}

const SELECT_CHUNK_SIZE = 100

function chunkArray<T>(items: T[], chunkSize: number) {
  if (chunkSize <= 0) return [items]

  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

async function loadEaClubIdsByClubId(adminClient: AdminClient, clubIds: string[]) {
  const eaClubIdsByClubId = new Map<string, string>()
  if (clubIds.length === 0) return eaClubIdsByClubId

  for (const chunk of chunkArray(clubIds, SELECT_CHUNK_SIZE)) {
    const { data, error } = await adminClient.from("clubs").select("id,ea_club_id").in("id", chunk)

    if (error) {
      throw error
    }

    for (const row of (data ?? []) as ClubLookupRow[]) {
      if (row.ea_club_id) {
        eaClubIdsByClubId.set(row.id, row.ea_club_id)
      }
    }
  }

  return eaClubIdsByClubId
}

function shouldIncludePair(
  homeEaClubId: string,
  awayEaClubId: string,
  allowedEaClubIds: Set<string> | null
) {
  if (!allowedEaClubIds || allowedEaClubIds.size === 0) {
    return true
  }

  return allowedEaClubIds.has(homeEaClubId) && allowedEaClubIds.has(awayEaClubId)
}

export async function loadMatchClassificationContext(
  adminClient: AdminClient,
  options?: LoadMatchClassificationContextOptions
): Promise<MatchClassificationContext> {
  const [tournamentBracketsResult, confrontationChatsResult] = await Promise.all([
    adminClient
      .from("tournament_brackets")
      .select("tournament_id,round,home_club_id,away_club_id,tournaments!inner(status)")
      .eq("tournaments.status", "in_progress")
      .is("match_id", null),
    adminClient
      .from("confrontation_chats")
      .select("id,club_a_id,club_b_id,status")
      .in("status", ["active", "confirmed"]),
  ])

  if (tournamentBracketsResult.error) {
    throw tournamentBracketsResult.error
  }

  if (confrontationChatsResult.error) {
    throw confrontationChatsResult.error
  }

  const tournamentBrackets = (tournamentBracketsResult.data ?? []) as TournamentBracketRow[]
  const confrontationChats = (confrontationChatsResult.data ?? []) as ConfrontationChatRow[]
  const clubIds = new Set<string>()

  for (const bracket of tournamentBrackets) {
    if (bracket.home_club_id) {
      clubIds.add(bracket.home_club_id)
    }
    if (bracket.away_club_id) {
      clubIds.add(bracket.away_club_id)
    }
  }

  for (const chat of confrontationChats) {
    if (chat.club_a_id) {
      clubIds.add(chat.club_a_id)
    }
    if (chat.club_b_id) {
      clubIds.add(chat.club_b_id)
    }
  }

  const eaClubIdsByClubId = await loadEaClubIdsByClubId(adminClient, Array.from(clubIds))
  const allowedEaClubIds = options?.targetEaClubIds?.length
    ? new Set(options.targetEaClubIds.filter(Boolean))
    : null
  const context = createEmptyMatchClassificationContext()

  for (const bracket of tournamentBrackets) {
    if (!bracket.home_club_id || !bracket.away_club_id) {
      continue
    }

    const homeEaClubId = eaClubIdsByClubId.get(bracket.home_club_id)
    const awayEaClubId = eaClubIdsByClubId.get(bracket.away_club_id)

    if (!homeEaClubId || !awayEaClubId) {
      continue
    }

    if (!shouldIncludePair(homeEaClubId, awayEaClubId, allowedEaClubIds)) {
      continue
    }

    const pairKey = normalizeMatchPairKey(homeEaClubId, awayEaClubId)
    if (!context.tournamentPairs[pairKey]) {
      context.tournamentPairs[pairKey] = {
        tournamentId: bracket.tournament_id,
        tournamentRound: bracket.round,
      }
    }
  }

  for (const chat of confrontationChats) {
    if (!chat.club_a_id || !chat.club_b_id) {
      continue
    }

    const clubAEaClubId = eaClubIdsByClubId.get(chat.club_a_id)
    const clubBEaClubId = eaClubIdsByClubId.get(chat.club_b_id)

    if (!clubAEaClubId || !clubBEaClubId) {
      continue
    }

    if (!shouldIncludePair(clubAEaClubId, clubBEaClubId, allowedEaClubIds)) {
      continue
    }

    const pairKey = normalizeMatchPairKey(clubAEaClubId, clubBEaClubId)
    if (!context.matchmakingPairs[pairKey]) {
      context.matchmakingPairs[pairKey] = {
        matchmakingId: chat.id,
      }
    }
  }

  return context
}

export type { LoadMatchClassificationContextOptions }

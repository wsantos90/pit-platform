import type { MatchType } from "@/types/database"

type TournamentPairMetadata = {
  tournamentId: string
  tournamentRound: string | null
}

type MatchmakingPairMetadata = {
  matchmakingId: string
}

type MatchClassificationContext = {
  tournamentPairs: Record<string, TournamentPairMetadata>
  matchmakingPairs: Record<string, MatchmakingPairMetadata>
}

type MatchClassificationInput = {
  homeClubId: string
  awayClubId: string
  context: MatchClassificationContext
}

type MatchClassificationResult = {
  matchType: MatchType
  tournamentId: string | null
  tournamentRound: string | null
  matchmakingId: string | null
}

const EXTERNAL_MATCH_RESULT: MatchClassificationResult = {
  matchType: "friendly_external",
  tournamentId: null,
  tournamentRound: null,
  matchmakingId: null,
}

export function normalizeMatchPairKey(clubAId: string, clubBId: string) {
  const [firstClubId, secondClubId] = [clubAId.trim(), clubBId.trim()].sort()
  return `${firstClubId}::${secondClubId}`
}

export function createEmptyMatchClassificationContext(): MatchClassificationContext {
  return {
    tournamentPairs: {},
    matchmakingPairs: {},
  }
}

export function classifyMatch(input: MatchClassificationInput): MatchClassificationResult {
  const pairKey = normalizeMatchPairKey(input.homeClubId, input.awayClubId)
  const tournamentMatch = input.context.tournamentPairs[pairKey]

  if (tournamentMatch) {
    return {
      matchType: "championship",
      tournamentId: tournamentMatch.tournamentId,
      tournamentRound: tournamentMatch.tournamentRound,
      matchmakingId: null,
    }
  }

  const matchmakingMatch = input.context.matchmakingPairs[pairKey]

  if (matchmakingMatch) {
    return {
      matchType: "friendly_pit",
      tournamentId: null,
      tournamentRound: null,
      matchmakingId: matchmakingMatch.matchmakingId,
    }
  }

  return EXTERNAL_MATCH_RESULT
}

export type {
  MatchClassificationContext,
  MatchClassificationInput,
  MatchClassificationResult,
  MatchmakingPairMetadata,
  TournamentPairMetadata,
}

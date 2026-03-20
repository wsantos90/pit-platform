import { describe, expect, it, vi } from "vitest"
import {
  createEmptyMatchClassificationContext,
  normalizeMatchPairKey,
} from "@/lib/match-classifier"
import { persistMatchesForClub } from "@/lib/collect/persistMatches"
import type { EaParsedMatch } from "@/types/ea-api"

function makeMatch(matchId: string): EaParsedMatch {
  return {
    matchId,
    timestampUtc: new Date("2026-03-07T03:00:00.000Z"),
    timestampBrasilia: "2026-03-07T00:00:00-03:00",
    homeClubId: "club-home",
    awayClubId: "club-away",
    homeClubName: "Casa",
    awayClubName: "Fora",
    homeScore: 2,
    awayScore: 1,
    clubs: {},
    players: [
      {
        eaClubId: "club-home",
        gamertag: "player-one",
        playerName: "Player One",
        position: "midfielder",
        goals: 1,
        assists: 0,
        rating: 7.5,
        passesAttempted: 20,
        passesMade: 18,
        tacklesAttempted: 4,
        tacklesMade: 2,
        shots: 3,
        shotsOnTarget: 2,
        yellowCards: 0,
        redCards: 0,
        cleanSheets: 0,
        saves: 0,
        manOfMatch: false,
        minutesPlayed: 90,
      },
    ],
  }
}

function makeAdminClient(options?: {
  insertedMatches?: Array<{ id: string; ea_match_id: string }>
}) {
  const clubsIn = vi.fn().mockResolvedValue({
    data: [
      { id: "db-club-home", ea_club_id: "club-home" },
      { id: "db-club-away", ea_club_id: "club-away" },
    ],
    error: null,
  })

  const playersIn = vi.fn().mockResolvedValue({
    data: [{ id: "db-player-1", ea_gamertag: "Player One" }],
    error: null,
  })

  const matchesSelect = vi.fn().mockResolvedValue({
    data: options?.insertedMatches ?? [{ id: "db-match-1", ea_match_id: "m-1" }],
    error: null,
  })
  const matchesUpsert = vi.fn().mockReturnValue({
    select: matchesSelect,
  })

  const matchPlayersUpsert = vi.fn().mockResolvedValue({ data: null, error: null })

  return {
    from: vi.fn((table: string) => {
      if (table === "clubs") {
        return {
          select: vi.fn().mockReturnValue({
            in: clubsIn,
          }),
        }
      }

      if (table === "players") {
        return {
          select: vi.fn().mockReturnValue({
            in: playersIn,
          }),
        }
      }

      if (table === "matches") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
          upsert: matchesUpsert,
        }
      }

      if (table === "match_players") {
        return {
          upsert: matchPlayersUpsert,
        }
      }

      return {}
    }),
    __mocks: {
      matchesUpsert,
      matchPlayersUpsert,
      clubsIn,
      playersIn,
    },
  }
}

describe("persistMatchesForClub", () => {
  it("deduplica matches por matchId e persiste apenas novos", async () => {
    const adminClient = makeAdminClient()
    const matches = [makeMatch("m-1"), makeMatch("m-1")]

    const result = await persistMatchesForClub("club-home", matches, adminClient as never)

    expect(result).toEqual({
      matchesNew: 1,
      matchesSkipped: 1,
      playersLinked: 1,
    })
    expect(adminClient.__mocks.matchesUpsert).toHaveBeenCalledTimes(1)
    expect(adminClient.__mocks.matchPlayersUpsert).toHaveBeenCalledTimes(1)
  })

  it("preenche match_type, tournament_id e tournament_round quando o par pertence a um bracket ativo", async () => {
    const adminClient = makeAdminClient()
    const classificationContext = createEmptyMatchClassificationContext()
    classificationContext.tournamentPairs[normalizeMatchPairKey("club-home", "club-away")] = {
      tournamentId: "tournament-1",
      tournamentRound: "quarter_final",
    }

    await persistMatchesForClub("club-home", [makeMatch("m-1")], adminClient as never, classificationContext)

    const [rowsToInsert] = adminClient.__mocks.matchesUpsert.mock.calls[0]
    expect(rowsToInsert[0]).toMatchObject({
      match_type: "championship",
      tournament_id: "tournament-1",
      tournament_round: "quarter_final",
      matchmaking_id: null,
    })
  })

  it("preenche matchmaking_id quando o par pertence a um confronto ativo", async () => {
    const adminClient = makeAdminClient()
    const classificationContext = createEmptyMatchClassificationContext()
    classificationContext.matchmakingPairs[normalizeMatchPairKey("club-home", "club-away")] = {
      matchmakingId: "chat-1",
    }

    await persistMatchesForClub("club-home", [makeMatch("m-1")], adminClient as never, classificationContext)

    const [rowsToInsert] = adminClient.__mocks.matchesUpsert.mock.calls[0]
    expect(rowsToInsert[0]).toMatchObject({
      match_type: "friendly_pit",
      tournament_id: null,
      tournament_round: null,
      matchmaking_id: "chat-1",
    })
  })

  it("conta como skipped quando nenhum match novo e evita inserir match_players", async () => {
    const adminClient = makeAdminClient({ insertedMatches: [] })
    const matches = [makeMatch("m-1")]

    const result = await persistMatchesForClub("club-home", matches, adminClient as never)

    expect(result).toEqual({
      matchesNew: 0,
      matchesSkipped: 1,
      playersLinked: 0,
    })
    expect(adminClient.__mocks.matchPlayersUpsert).not.toHaveBeenCalled()
  })
})

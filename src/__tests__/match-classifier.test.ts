import { describe, expect, it } from "vitest"
import {
  classifyMatch,
  createEmptyMatchClassificationContext,
  normalizeMatchPairKey,
} from "@/lib/match-classifier"

describe("classifyMatch", () => {
  it("retorna championship para um par de torneio ativo", () => {
    const context = createEmptyMatchClassificationContext()
    context.tournamentPairs[normalizeMatchPairKey("club-b", "club-a")] = {
      tournamentId: "t-1",
      tournamentRound: "semi_final",
    }

    const result = classifyMatch({
      homeClubId: "club-a",
      awayClubId: "club-b",
      context,
    })

    expect(result).toEqual({
      matchType: "championship",
      tournamentId: "t-1",
      tournamentRound: "semi_final",
      matchmakingId: null,
    })
  })

  it("retorna friendly_pit para um par de matchmaking ativo", () => {
    const context = createEmptyMatchClassificationContext()
    context.matchmakingPairs[normalizeMatchPairKey("club-a", "club-b")] = {
      matchmakingId: "chat-1",
    }

    const result = classifyMatch({
      homeClubId: "club-a",
      awayClubId: "club-b",
      context,
    })

    expect(result).toEqual({
      matchType: "friendly_pit",
      tournamentId: null,
      tournamentRound: null,
      matchmakingId: "chat-1",
    })
  })

  it("retorna friendly_external quando o par nao esta em nenhum contexto", () => {
    const result = classifyMatch({
      homeClubId: "club-a",
      awayClubId: "club-z",
      context: createEmptyMatchClassificationContext(),
    })

    expect(result).toEqual({
      matchType: "friendly_external",
      tournamentId: null,
      tournamentRound: null,
      matchmakingId: null,
    })
  })

  it("nao gera falso positivo quando os clubes ativos pertencem a confrontos diferentes", () => {
    const context = createEmptyMatchClassificationContext()
    context.tournamentPairs[normalizeMatchPairKey("club-a", "club-b")] = {
      tournamentId: "t-1",
      tournamentRound: "round-1",
    }
    context.matchmakingPairs[normalizeMatchPairKey("club-c", "club-d")] = {
      matchmakingId: "chat-1",
    }

    const result = classifyMatch({
      homeClubId: "club-a",
      awayClubId: "club-d",
      context,
    })

    expect(result.matchType).toBe("friendly_external")
  })

  it("prioriza tournament sobre matchmaking para o mesmo par", () => {
    const context = createEmptyMatchClassificationContext()
    const pairKey = normalizeMatchPairKey("club-a", "club-b")

    context.tournamentPairs[pairKey] = {
      tournamentId: "t-1",
      tournamentRound: "final",
    }
    context.matchmakingPairs[pairKey] = {
      matchmakingId: "chat-1",
    }

    const result = classifyMatch({
      homeClubId: "club-a",
      awayClubId: "club-b",
      context,
    })

    expect(result).toEqual({
      matchType: "championship",
      tournamentId: "t-1",
      tournamentRound: "final",
      matchmakingId: null,
    })
  })
})

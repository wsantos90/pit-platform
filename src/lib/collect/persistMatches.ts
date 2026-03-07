import { createAdminClient } from "@/lib/supabase/admin"
import type { EaParsedMatch } from "@/types/ea-api"

type AdminClient = ReturnType<typeof createAdminClient>

type ClubLookupRow = {
  id: string
  ea_club_id: string
}

type PlayerLookupRow = {
  id: string
  ea_gamertag: string
}

type InsertedMatchRow = {
  id: string
  ea_match_id: string
}

type PersistMatchesResult = {
  matchesNew: number
  matchesSkipped: number
  playersLinked: number
}

const SELECT_CHUNK_SIZE = 100
const UPSERT_CHUNK_SIZE = 200

function chunkArray<T>(items: T[], chunkSize: number) {
  if (chunkSize <= 0) return [items]

  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

function dedupeMatchesById(matches: EaParsedMatch[]) {
  const uniqueMatches = new Map<string, EaParsedMatch>()
  for (const match of matches) {
    if (!match.matchId || uniqueMatches.has(match.matchId)) continue
    uniqueMatches.set(match.matchId, match)
  }

  return {
    deduped: Array.from(uniqueMatches.values()),
    duplicatesSkipped: Math.max(0, matches.length - uniqueMatches.size),
  }
}

async function loadClubIdsByEaClubId(adminClient: AdminClient, eaClubIds: string[]) {
  const byEaClubId = new Map<string, string>()
  if (eaClubIds.length === 0) return byEaClubId

  for (const chunk of chunkArray(eaClubIds, SELECT_CHUNK_SIZE)) {
    const { data, error } = await adminClient
      .from("clubs")
      .select("id,ea_club_id")
      .in("ea_club_id", chunk)

    if (error) {
      throw error
    }

    for (const row of (data ?? []) as ClubLookupRow[]) {
      byEaClubId.set(row.ea_club_id, row.id)
    }
  }

  return byEaClubId
}

async function loadPlayerIdsByGamertag(adminClient: AdminClient, gamertags: string[]) {
  const byGamertag = new Map<string, string>()
  if (gamertags.length === 0) return byGamertag

  for (const chunk of chunkArray(gamertags, SELECT_CHUNK_SIZE)) {
    const { data, error } = await adminClient
      .from("players")
      .select("id,ea_gamertag")
      .in("ea_gamertag", chunk)

    if (error) {
      throw error
    }

    for (const row of (data ?? []) as PlayerLookupRow[]) {
      byGamertag.set(row.ea_gamertag, row.id)
    }
  }

  return byGamertag
}

function buildRawMatchData(match: EaParsedMatch, sourceEaClubId: string) {
  return {
    source: "ea_api_collect",
    source_ea_club_id: sourceEaClubId,
    match_id: match.matchId,
    timestamp_utc: match.timestampUtc.toISOString(),
    home_club_id: match.homeClubId,
    away_club_id: match.awayClubId,
    home_score: match.homeScore,
    away_score: match.awayScore,
    players_count: match.players.length,
  }
}

export async function persistMatchesForClub(
  eaClubId: string,
  matches: EaParsedMatch[],
  adminClient: AdminClient
): Promise<PersistMatchesResult> {
  const { deduped, duplicatesSkipped } = dedupeMatchesById(matches)

  if (deduped.length === 0) {
    return {
      matchesNew: 0,
      matchesSkipped: duplicatesSkipped,
      playersLinked: 0,
    }
  }

  const eaClubIds = new Set<string>()
  const gamertags = new Set<string>()

  for (const match of deduped) {
    eaClubIds.add(match.homeClubId)
    eaClubIds.add(match.awayClubId)

    for (const player of match.players) {
      eaClubIds.add(player.eaClubId)
      const gamertag = player.gamertag.trim()
      if (gamertag.length > 0) {
        gamertags.add(gamertag)
      }
    }
  }

  const [clubIdsByEaClubId, playerIdsByGamertag] = await Promise.all([
    loadClubIdsByEaClubId(adminClient, Array.from(eaClubIds)),
    loadPlayerIdsByGamertag(adminClient, Array.from(gamertags)),
  ])

  const rowsToInsert = deduped.map((match) => ({
    ea_match_id: match.matchId,
    match_timestamp: match.timestampUtc.toISOString(),
    home_club_id: clubIdsByEaClubId.get(match.homeClubId) ?? null,
    away_club_id: clubIdsByEaClubId.get(match.awayClubId) ?? null,
    home_ea_club_id: match.homeClubId,
    away_ea_club_id: match.awayClubId,
    home_club_name: match.homeClubName,
    away_club_name: match.awayClubName,
    home_score: match.homeScore,
    away_score: match.awayScore,
    match_type: "friendly_external" as const,
    raw_data: buildRawMatchData(match, eaClubId),
  }))

  const { data: insertedMatches, error: insertMatchesError } = await adminClient
    .from("matches")
    .upsert(rowsToInsert, {
      onConflict: "ea_match_id",
      ignoreDuplicates: true,
    })
    .select("id,ea_match_id")

  if (insertMatchesError) {
    throw insertMatchesError
  }

  const insertedRows = (insertedMatches ?? []) as InsertedMatchRow[]
  const matchesNew = insertedRows.length
  const matchesSkipped = Math.max(0, deduped.length - matchesNew) + duplicatesSkipped

  if (insertedRows.length === 0) {
    return {
      matchesNew,
      matchesSkipped,
      playersLinked: 0,
    }
  }

  const matchByEaMatchId = new Map<string, EaParsedMatch>()
  for (const match of deduped) {
    matchByEaMatchId.set(match.matchId, match)
  }

  const matchPlayersRows = insertedRows.flatMap((insertedMatch) => {
    const match = matchByEaMatchId.get(insertedMatch.ea_match_id)
    if (!match) return []

    return match.players
      .map((player) => {
        const gamertag = player.gamertag.trim()
        if (!gamertag) return null

        return {
          match_id: insertedMatch.id,
          player_id: playerIdsByGamertag.get(gamertag) ?? null,
          ea_gamertag: gamertag,
          club_id: clubIdsByEaClubId.get(player.eaClubId) ?? null,
          ea_club_id: player.eaClubId,
          ea_position: player.position,
          goals: player.goals,
          assists: player.assists,
          rating: player.rating,
          passes_completed: player.passesMade,
          passes_attempted: player.passesAttempted,
          tackles_made: player.tacklesMade,
          tackles_attempted: player.tacklesAttempted,
          shots: player.shots,
          shots_on_target: player.shotsOnTarget,
          yellow_cards: player.yellowCards,
          red_cards: player.redCards,
          clean_sheets: player.cleanSheets,
          saves: player.saves,
          man_of_match: player.manOfMatch,
          minutes_played: player.minutesPlayed,
          interceptions: 0,
          possession: null,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
  })

  const playersLinked = matchPlayersRows.reduce(
    (count, row) => count + (row.player_id ? 1 : 0),
    0
  )

  if (matchPlayersRows.length === 0) {
    return {
      matchesNew,
      matchesSkipped,
      playersLinked,
    }
  }

  const upsertResults = await Promise.allSettled(
    chunkArray(matchPlayersRows, UPSERT_CHUNK_SIZE).map((rowsChunk) =>
      adminClient.from("match_players").upsert(rowsChunk, {
        onConflict: "match_id,ea_gamertag",
        ignoreDuplicates: true,
      })
    )
  )

  const failedUpserts = upsertResults.filter((result) => result.status === "rejected")
  if (failedUpserts.length > 0) {
    console.error(
      `[Collect] ${failedUpserts.length} chunk(s) failed during match_players upsert for eaClubId=${eaClubId}.`
    )
  }

  return {
    matchesNew,
    matchesSkipped,
    playersLinked,
  }
}

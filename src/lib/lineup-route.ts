import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  FORMATION_352_SLOT_ID_VALUES,
  isPlayerValidForSlot,
  unwrapRelation,
  type LineupPlayerSummary,
} from '@/lib/lineups'
import { PLAYER_POSITIONS } from '@/lib/positions'

export const lineupPlayerInputSchema = z.object({
  player_id: z.string().uuid(),
  position: z.enum(PLAYER_POSITIONS),
  slot_id: z.enum(FORMATION_352_SLOT_ID_VALUES),
  is_starter: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(99),
})

export const createLineupSchema = z.object({
  name: z.string().trim().min(1).max(60),
  formation: z.literal('3-5-2').default('3-5-2'),
  players: z.array(lineupPlayerInputSchema).max(11).default([]),
})

export const updateLineupSchema = createLineupSchema.extend({
  is_default: z.boolean().optional(),
})

export async function requireManagerClub() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'unauthorized' as const }
  }

  const admin = createAdminClient()
  const { data: club, error } = await admin
    .from('clubs')
    .select('id, display_name, manager_id, status')
    .eq('manager_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    return { error: 'failed_to_load_club' as const }
  }

  if (!club) {
    return { error: 'club_not_found' as const }
  }

  return { user, club, admin }
}

export async function ensureLineupBelongsToClub(admin: ReturnType<typeof createAdminClient>, lineupId: string, clubId: string) {
  const { data: lineup, error } = await admin
    .from('lineups')
    .select('id, club_id, is_default')
    .eq('id', lineupId)
    .eq('club_id', clubId)
    .maybeSingle()

  if (error) {
    return { error: 'failed_to_load_lineup' as const }
  }

  if (!lineup) {
    return { error: 'lineup_not_found' as const }
  }

  return { lineup }
}

export async function replaceLineupPlayers(
  admin: ReturnType<typeof createAdminClient>,
  lineupId: string,
  players: Array<z.infer<typeof lineupPlayerInputSchema>>
) {
  const { error: deleteError } = await admin.from('lineup_players').delete().eq('lineup_id', lineupId)

  if (deleteError) {
    return { error: 'failed_to_clear_lineup_players' as const }
  }

  if (players.length === 0) {
    return { ok: true as const }
  }

  const { error: insertError } = await admin.from('lineup_players').insert(
    players.map((player) => ({
      lineup_id: lineupId,
      ...player,
    }))
  )

  if (insertError) {
    return { error: 'failed_to_save_lineup_players' as const }
  }

  return { ok: true as const }
}

export async function clearDefaultLineups(admin: ReturnType<typeof createAdminClient>, clubId: string) {
  const { error } = await admin.from('lineups').update({ is_default: false }).eq('club_id', clubId).eq('is_default', true)

  if (error) {
    return { error: 'failed_to_clear_default_lineups' as const }
  }

  return { ok: true as const }
}

export async function validateLineupPlayersForClub(
  admin: ReturnType<typeof createAdminClient>,
  clubId: string,
  players: Array<z.infer<typeof lineupPlayerInputSchema>>
) {
  if (players.length === 0) {
    return { ok: true as const }
  }

  const playerIds = [...new Set(players.map((player) => player.player_id))]
  const { data, error } = await admin
    .from('club_players')
    .select(`
      player:players(id, ea_gamertag, primary_position, secondary_position)
    `)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .is('left_at', null)
    .in('player_id', playerIds)

  if (error) {
    return { error: 'failed_to_validate_lineup_players' as const }
  }

  const roster = new Map(
    ((data ?? []) as Array<{ player: LineupPlayerSummary | LineupPlayerSummary[] | null }>)
      .map((row) => unwrapRelation(row.player))
      .filter((player): player is LineupPlayerSummary => Boolean(player))
      .map((player) => [player.id, player])
  )

  if (roster.size !== playerIds.length) {
    return { error: 'player_not_in_active_roster' as const }
  }

  for (const player of players) {
    const rosterPlayer = roster.get(player.player_id)
    if (!rosterPlayer || !isPlayerValidForSlot(rosterPlayer, player.slot_id)) {
      return { error: 'invalid_player_position' as const }
    }
  }

  return { ok: true as const }
}

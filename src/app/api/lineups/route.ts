import { NextRequest, NextResponse } from 'next/server'
import type { Lineup, LineupPlayer } from '@/types/database'
import {
  createLineupSchema,
  requireManagerClub,
  replaceLineupPlayers,
  validateLineupPlayersForClub,
} from '@/lib/lineup-route'
import { unwrapRelation } from '@/lib/lineups'

type ApiLineup = Lineup & {
  lineup_players: Array<
    LineupPlayer & {
      player: {
        id: string
        ea_gamertag: string
        primary_position: LineupPlayer['position']
        secondary_position: LineupPlayer['position'] | null
      } | null
    }
  >
}

const lineupSelect = `
  id, club_id, match_id, name, formation, is_default, created_by, created_at, updated_at,
  lineup_players(
    id, lineup_id, player_id, position, slot_id, is_starter, sort_order,
    player:players(id, ea_gamertag, primary_position, secondary_position)
  )
`

export async function GET() {
  const context = await requireManagerClub()

  if ('error' in context) {
    const status = context.error === 'unauthorized' ? 401 : context.error === 'club_not_found' ? 404 : 500
    return NextResponse.json({ error: context.error }, { status })
  }

  const { admin, club } = context
  const { data, error } = await admin
    .from('lineups')
    .select(lineupSelect)
    .eq('club_id', club.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'failed_to_load_lineups' }, { status: 500 })
  }

  const lineups = ((data ?? []) as unknown as ApiLineup[]).map((lineup) => ({
    ...lineup,
    lineup_players: [...(lineup.lineup_players ?? [])]
      .map((lineupPlayer) => ({
        ...lineupPlayer,
        player: unwrapRelation(lineupPlayer.player),
      }))
      .sort((a, b) => a.sort_order - b.sort_order),
  }))

  return NextResponse.json({ lineups })
}

export async function POST(request: NextRequest) {
  const context = await requireManagerClub()

  if ('error' in context) {
    const status = context.error === 'unauthorized' ? 401 : context.error === 'club_not_found' ? 404 : 500
    return NextResponse.json({ error: context.error }, { status })
  }

  const body = await request.json().catch(() => null)
  const parsed = createLineupSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { admin, user, club } = context
  const validationResult = await validateLineupPlayersForClub(admin, club.id, parsed.data.players)
  if ('error' in validationResult) {
    return NextResponse.json({ error: validationResult.error }, { status: 400 })
  }

  const { data: inserted, error: insertError } = await admin
    .from('lineups')
    .insert({
      club_id: club.id,
      match_id: null,
      name: parsed.data.name,
      formation: parsed.data.formation,
      is_default: false,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return NextResponse.json({ error: 'failed_to_create_lineup' }, { status: 500 })
  }

  const replaceResult = await replaceLineupPlayers(admin, inserted.id, parsed.data.players)
  if ('error' in replaceResult) {
    await admin.from('lineups').delete().eq('id', inserted.id)
    return NextResponse.json({ error: replaceResult.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, lineupId: inserted.id }, { status: 201 })
}

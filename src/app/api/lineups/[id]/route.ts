import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  clearDefaultLineups,
  ensureLineupBelongsToClub,
  replaceLineupPlayers,
  requireManagerClub,
  updateLineupSchema,
  validateLineupPlayersForClub,
} from '@/lib/lineup-route'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = paramsSchema.safeParse(await context.params)
  if (!params.success) {
    return NextResponse.json({ error: 'invalid_lineup_id' }, { status: 400 })
  }

  const managerContext = await requireManagerClub()
  if ('error' in managerContext) {
    const status = managerContext.error === 'unauthorized' ? 401 : managerContext.error === 'club_not_found' ? 404 : 500
    return NextResponse.json({ error: managerContext.error }, { status })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateLineupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { admin, club } = managerContext
  const lineupResult = await ensureLineupBelongsToClub(admin, params.data.id, club.id)
  if ('error' in lineupResult) {
    return NextResponse.json({ error: lineupResult.error }, { status: lineupResult.error === 'lineup_not_found' ? 404 : 500 })
  }

  const validationResult = await validateLineupPlayersForClub(admin, club.id, parsed.data.players)
  if ('error' in validationResult) {
    return NextResponse.json({ error: validationResult.error }, { status: 400 })
  }

  if (parsed.data.is_default) {
    const clearResult = await clearDefaultLineups(admin, club.id)
    if ('error' in clearResult) {
      return NextResponse.json({ error: clearResult.error }, { status: 500 })
    }
  }

  const { error: updateError } = await admin
    .from('lineups')
    .update({
      name: parsed.data.name,
      formation: parsed.data.formation,
      is_default: parsed.data.is_default ?? lineupResult.lineup.is_default,
    })
    .eq('id', params.data.id)

  if (updateError) {
    return NextResponse.json({ error: 'failed_to_update_lineup' }, { status: 500 })
  }

  const replaceResult = await replaceLineupPlayers(admin, params.data.id, parsed.data.players)
  if ('error' in replaceResult) {
    return NextResponse.json({ error: replaceResult.error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = paramsSchema.safeParse(await context.params)
  if (!params.success) {
    return NextResponse.json({ error: 'invalid_lineup_id' }, { status: 400 })
  }

  const managerContext = await requireManagerClub()
  if ('error' in managerContext) {
    const status = managerContext.error === 'unauthorized' ? 401 : managerContext.error === 'club_not_found' ? 404 : 500
    return NextResponse.json({ error: managerContext.error }, { status })
  }

  const { admin, club } = managerContext
  const lineupResult = await ensureLineupBelongsToClub(admin, params.data.id, club.id)
  if ('error' in lineupResult) {
    return NextResponse.json({ error: lineupResult.error }, { status: lineupResult.error === 'lineup_not_found' ? 404 : 500 })
  }

  const { error } = await admin.from('lineups').delete().eq('id', params.data.id)
  if (error) {
    return NextResponse.json({ error: 'failed_to_delete_lineup' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

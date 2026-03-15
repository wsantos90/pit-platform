import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { clearDefaultLineups, ensureLineupBelongsToClub, requireManagerClub } from '@/lib/lineup-route'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function POST(
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

  const clearResult = await clearDefaultLineups(admin, club.id)
  if ('error' in clearResult) {
    return NextResponse.json({ error: clearResult.error }, { status: 500 })
  }

  const { error } = await admin.from('lineups').update({ is_default: true }).eq('id', params.data.id)
  if (error) {
    return NextResponse.json({ error: 'failed_to_set_default_lineup' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

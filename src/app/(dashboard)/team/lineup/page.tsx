import { redirect } from 'next/navigation'
import { LineupPageClient, type ManagedLineup } from '@/components/team/LineupPageClient'
import { createClient } from '@/lib/supabase/server'
import { unwrapRelation, type LineupPlayerSummary } from '@/lib/lineups'

const lineupSelect = `
  id, club_id, match_id, name, formation, is_default, created_by, created_at, updated_at,
  lineup_players(
    id, lineup_id, player_id, position, slot_id, is_starter, sort_order,
    player:players(id, ea_gamertag, primary_position, secondary_position)
  )
`

export default async function TeamLineupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: club } = await supabase
    .from('clubs')
    .select('id, display_name')
    .eq('manager_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!club) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">
        <p>Nenhum clube ativo associado a esta conta de manager.</p>
      </div>
    )
  }

  const [{ data: rosterRows }, { data: lineupRows }] = await Promise.all([
    supabase
      .from('club_players')
      .select(`
        player:players(id, ea_gamertag, primary_position, secondary_position)
      `)
      .eq('club_id', club.id)
      .eq('is_active', true)
      .is('left_at', null),
    supabase
      .from('lineups')
      .select(lineupSelect)
      .eq('club_id', club.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true }),
  ])

  const rosterPlayers = ((rosterRows ?? []) as Array<{ player: LineupPlayerSummary | LineupPlayerSummary[] | null }>)
    .map((row) => unwrapRelation(row.player))
    .filter((player): player is LineupPlayerSummary => Boolean(player))
    .sort((a, b) => a.ea_gamertag.localeCompare(b.ea_gamertag, 'pt-BR'))

  const initialLineups = ((lineupRows ?? []) as unknown as ManagedLineup[]).map((lineup) => ({
    ...lineup,
    lineup_players: [...(lineup.lineup_players ?? [])]
      .map((lineupPlayer) => ({
        ...lineupPlayer,
        player: unwrapRelation(lineupPlayer.player),
      }))
      .sort((a, b) => a.sort_order - b.sort_order),
  }))

  return (
    <LineupPageClient
      clubName={club.display_name}
      rosterPlayers={rosterPlayers}
      initialLineups={initialLineups}
    />
  )
}

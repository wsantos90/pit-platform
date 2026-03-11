import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamManagementClient } from '@/components/team/TeamManagementClient'
import type { Club, PlayerPosition, MatchType, PlayerStatsView } from '@/types/database'

export type ClubPlayerRow = {
  id: string
  club_id: string
  player_id: string
  joined_at: string
  left_at: string | null
  is_active: boolean
  role_in_club: 'player' | 'captain' | 'manager'
  player: {
    id: string
    ea_gamertag: string
    primary_position: PlayerPosition
    secondary_position: PlayerPosition | null
    user_id: string
  } | null
}

export type MatchRow = {
  id: string
  match_timestamp: string
  home_club_id: string | null
  away_club_id: string | null
  home_club_name: string
  away_club_name: string
  home_score: number
  away_score: number
  match_type: MatchType
}

export type ClubStats = {
  activeCount: number
  pendingCount: number
  avgRating: number | null
  avgGoalsPerMatch: number | null
  totalMatches: number
}

export default async function TeamPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: club } = await supabase
    .from('clubs')
    .select('id, display_name, ea_club_id, ea_name_raw, manager_id, logo_url, status, subscription_plan, last_scanned_at, created_at, updated_at')
    .eq('manager_id', user.id)
    .eq('status', 'active')
    .single()

  if (!club) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">
        <p>Nenhum clube ativo associado a esta conta de manager.</p>
      </div>
    )
  }

  const { data: rawClubPlayers } = await supabase
    .from('club_players')
    .select(`
      id, club_id, player_id, joined_at, left_at, is_active, role_in_club,
      player:players(id, ea_gamertag, primary_position, secondary_position, user_id)
    `)
    .eq('club_id', club.id)
    .is('left_at', null)
    .order('is_active', { ascending: false })
    .order('joined_at', { ascending: true })

  const clubPlayers = (rawClubPlayers ?? []) as unknown as ClubPlayerRow[]

  const activePlayerIds = clubPlayers
    .filter(cp => cp.is_active && cp.player)
    .map(cp => cp.player!.id)

  let statsMap: Record<string, PlayerStatsView> = {}
  if (activePlayerIds.length > 0) {
    const { data: stats } = await supabase
      .from('v_player_stats')
      .select('player_id, avg_rating, total_goals, total_assists, total_matches, total_saves, total_tackles, total_clean_sheets, total_passes, ea_gamertag, primary_position, user_id, total_mom, total_reds, total_yellows, best_rating, total_minutes')
      .in('player_id', activePlayerIds)
    if (stats) {
      statsMap = stats.reduce(
        (acc, s) => ({ ...acc, [s.player_id]: s }),
        {} as Record<string, PlayerStatsView>
      )
    }
  }

  const { data: rawMatches } = await supabase
    .from('matches')
    .select('id, match_timestamp, home_club_id, away_club_id, home_club_name, away_club_name, home_score, away_score, match_type')
    .or(`home_club_id.eq.${club.id},away_club_id.eq.${club.id}`)
    .order('match_timestamp', { ascending: false })
    .limit(20)

  const matches = (rawMatches ?? []) as MatchRow[]

  const activeCount = clubPlayers.filter(cp => cp.is_active).length
  const pendingCount = clubPlayers.filter(cp => !cp.is_active).length

  const ratingValues = Object.values(statsMap)
    .map(s => s.avg_rating)
    .filter((r): r is number => r !== null)
  const avgRating = ratingValues.length > 0
    ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
    : null

  const totalGoalsScored = matches.reduce((sum, m) => {
    return sum + (m.home_club_id === club.id ? m.home_score : m.away_score)
  }, 0)
  const avgGoalsPerMatch = matches.length > 0 ? totalGoalsScored / matches.length : null

  return (
    <TeamManagementClient
      club={club as Club}
      clubPlayers={clubPlayers}
      statsMap={statsMap}
      matches={matches}
      clubStats={{ activeCount, pendingCount, avgRating, avgGoalsPerMatch, totalMatches: matches.length }}
      currentUserId={user.id}
    />
  )
}

import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PositionBadge } from "@/components/player/PositionBadge"
import { createClient } from "@/lib/supabase/server"

type PlayerPageProps = {
  params: Promise<{ id: string }>
}

function getRatingClass(rating: number | null) {
  if (!rating) return "text-foreground-secondary"
  if (rating >= 8) return "text-green-400"
  if (rating >= 6.5) return "text-yellow-400"
  return "text-red-400"
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-bold text-foreground">{value}</span>
    </div>
  )
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch player + stats
  const { data: player } = await supabase
    .from("v_player_stats")
    .select("*")
    .eq("player_id", id)
    .maybeSingle()

  // Fallback: fetch basic player info if no stats yet
  const { data: basicPlayer } = await supabase
    .from("players")
    .select("id, ea_gamertag, primary_position, secondary_position")
    .eq("id", id)
    .maybeSingle()

  if (!basicPlayer) {
    notFound()
  }

  const gamertag = player?.ea_gamertag ?? basicPlayer.ea_gamertag
  const primaryPos = player?.primary_position ?? basicPlayer.primary_position
  const secondaryPos = player?.secondary_position ?? basicPlayer.secondary_position

  // Fetch recent matches for this player
  const { data: matchRows } = await supabase
    .from("match_players")
    .select(`
      id, goals, assists, rating, man_of_match, resolved_position, ea_club_id,
      passes_completed, passes_attempted, tackles_made, tackles_attempted,
      shots, saves, clean_sheets, minutes_played, yellow_cards, red_cards,
      match_id,
      matches(id, match_timestamp, home_club_name, away_club_name, home_score, away_score, home_ea_club_id)
    `)
    .eq("player_id", id)
    .order("matches(match_timestamp)", { ascending: false })
    .limit(20)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/team">← Voltar ao elenco</Link>
        </Button>
      </div>

      {/* Player header */}
      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-black text-primary">
            {gamertag.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground">{gamertag}</h1>
            <div className="flex items-center gap-2">
              <PositionBadge position={primaryPos} />
              {secondaryPos && <PositionBadge position={secondaryPos} />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      {player ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Partidas" value={player.total_matches ?? 0} />
          <StatCard label="Rating médio" value={player.avg_rating != null ? Number(player.avg_rating).toFixed(1) : "—"} />
          <StatCard label="Melhor rating" value={player.best_rating != null ? Number(player.best_rating).toFixed(1) : "—"} />
          <StatCard label="Minutos" value={player.total_minutes ?? 0} />
          <StatCard label="Gols" value={player.total_goals ?? 0} />
          <StatCard label="Assistências" value={player.total_assists ?? 0} />
          <StatCard label="MoM" value={player.total_mom ?? 0} />
          <StatCard label="Passes" value={player.total_passes ?? 0} />
          <StatCard label="Desarmes" value={player.total_tackles ?? 0} />
          <StatCard label="Defesas (GK)" value={player.total_saves ?? 0} />
          <StatCard label="Cartões amarelos" value={player.total_yellows ?? 0} />
          <StatCard label="Cartões vermelhos" value={player.total_reds ?? 0} />
        </div>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Sem estatísticas registradas ainda.
          </CardContent>
        </Card>
      )}

      {/* Recent matches */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Últimas partidas</CardTitle>
        </CardHeader>
        <CardContent>
          {!matchRows || matchRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma partida encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Data</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Partida</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Pos</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Rat</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">G</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">A</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Passes</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Dsm</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Chutes</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Min</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">MoM</th>
                  </tr>
                </thead>
                <tbody>
                  {matchRows.map((row) => {
                    const match = Array.isArray(row.matches) ? row.matches[0] : row.matches
                    if (!match) return null
                    const isHome = row.ea_club_id === match.home_ea_club_id
                    const opponent = isHome ? match.away_club_name : match.home_club_name
                    const ownScore = isHome ? match.home_score : match.away_score
                    const oppScore = isHome ? match.away_score : match.home_score
                    const result = ownScore > oppScore ? "V" : ownScore === oppScore ? "E" : "D"
                    const resultClass = result === "V" ? "text-green-400" : result === "E" ? "text-yellow-400" : "text-red-400"
                    return (
                      <tr key={row.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(match.match_timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Link href={`/matches/${match.id}`} className="hover:text-primary transition-colors">
                            <span className={`font-semibold mr-1 ${resultClass}`}>{result}</span>
                            <span className="text-foreground">{opponent}</span>
                            <span className="ml-1 text-muted-foreground text-xs">{ownScore}–{oppScore}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.resolved_position ? <PositionBadge position={row.resolved_position} /> : "—"}
                        </td>
                        <td className={`px-3 py-2 text-center font-semibold ${getRatingClass(row.rating)}`}>
                          {row.rating != null ? Number(row.rating).toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">{row.goals ?? 0}</td>
                        <td className="px-3 py-2 text-center">{row.assists ?? 0}</td>
                        <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                          {row.passes_completed ?? 0}/{row.passes_attempted ?? 0}
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                          {row.tackles_made ?? 0}/{row.tackles_attempted ?? 0}
                        </td>
                        <td className="px-3 py-2 text-center">{row.shots ?? 0}</td>
                        <td className="px-3 py-2 text-center text-xs text-muted-foreground">{row.minutes_played ?? 0}</td>
                        <td className="px-3 py-2 text-center">
                          {row.man_of_match ? <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs">MoM</Badge> : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

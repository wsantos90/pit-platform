import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PositionBadge } from "@/components/player/PositionBadge"
import { createClient } from "@/lib/supabase/server"
import type { PlayerPosition } from "@/types/database"

type MatchDetailsPageProps = {
  params: Promise<{ id: string }>
}

type MatchPlayer = {
  ea_gamertag: string
  player_id: string | null
  players: { ea_gamertag: string; id: string } | null
  resolved_position: PlayerPosition | null
  goals: number
  assists: number
  rating: number | null
  man_of_match: boolean
  minutes_played: number | null
  ea_club_id: string
  passes_completed: number
  passes_attempted: number
  tackles_made: number
  tackles_attempted: number
  shots: number
  saves: number
  yellow_cards: number
  red_cards: number
  clean_sheets: number
  interceptions: number
}

const MATCH_TYPE_LABEL: Record<string, string> = {
  championship: "Campeonato",
  friendly_pit: "Amistoso PIT",
  friendly_external: "Amistoso",
}

function getRatingClass(rating: number | null) {
  if (!rating) return "text-muted-foreground"
  if (rating >= 8) return "text-green-400"
  if (rating >= 6.5) return "text-yellow-400"
  return "text-red-400"
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getDisplayName(p: MatchPlayer): string {
  // Prefer linked player's gamertag (real name), fallback to stored ea_gamertag
  return p.players?.ea_gamertag ?? p.ea_gamertag
}

function PlayerTable({ players, title }: { players: MatchPlayer[]; title: string }) {
  if (players.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">Nenhum jogador registrado</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Jogador</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Pos</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Rat</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">G</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">A</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Passes</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Dsm</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Chutes</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Saves</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Min</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">MoM</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const name = getDisplayName(p)
              const passStr = p.passes_attempted > 0
                ? `${p.passes_completed}/${p.passes_attempted}`
                : p.passes_completed > 0 ? `${p.passes_completed}` : "—"
              const tackleStr = p.tackles_attempted > 0
                ? `${p.tackles_made}/${p.tackles_attempted}`
                : p.tackles_made > 0 ? `${p.tackles_made}` : "—"

              return (
                <tr key={p.ea_gamertag} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium text-foreground">
                    <div className="flex items-center gap-1.5">
                      {p.players?.id ? (
                        <Link href={`/players/${p.players.id}`} className="hover:text-primary transition-colors">
                          {name}
                        </Link>
                      ) : (
                        <span>{name}</span>
                      )}
                      {p.yellow_cards > 0 && (
                        <span className="inline-block size-3 rounded-sm bg-yellow-400" title="Cartão amarelo" />
                      )}
                      {p.red_cards > 0 && (
                        <span className="inline-block size-3 rounded-sm bg-red-500" title="Cartão vermelho" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {p.resolved_position ? (
                      <PositionBadge position={p.resolved_position} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-center font-semibold ${getRatingClass(p.rating)}`}>
                    {p.rating != null ? Number(p.rating).toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">{p.goals ?? 0}</td>
                  <td className="px-3 py-2 text-center">{p.assists ?? 0}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground text-xs">{passStr}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground text-xs">{tackleStr}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{p.shots > 0 ? p.shots : "—"}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{p.saves > 0 ? p.saves : "—"}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">
                    {p.minutes_played ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {p.man_of_match ? (
                      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs">MoM</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default async function MatchDetailsPage({ params }: MatchDetailsPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: match }, { data: players }] = await Promise.all([
    supabase
      .from("matches")
      .select("home_club_name, away_club_name, home_score, away_score, match_timestamp, match_type, home_ea_club_id")
      .eq("id", id)
      .single(),
    supabase
      .from("match_players")
      .select(`
        ea_gamertag, player_id, resolved_position, goals, assists, rating,
        man_of_match, minutes_played, ea_club_id,
        passes_completed, passes_attempted, tackles_made, tackles_attempted,
        shots, saves, yellow_cards, red_cards, clean_sheets, interceptions,
        players(id, ea_gamertag)
      `)
      .eq("match_id", id)
      .order("rating", { ascending: false }),
  ])

  if (!match) {
    notFound()
  }

  const allPlayers = (players ?? []) as unknown as MatchPlayer[]
  const homePlayers = allPlayers.filter((p) => p.ea_club_id === match.home_ea_club_id)
  const awayPlayers = allPlayers.filter((p) => p.ea_club_id !== match.home_ea_club_id)
  const hasPlayers = allPlayers.length > 0
  const matchTypeLabel = MATCH_TYPE_LABEL[match.match_type] ?? match.match_type

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href="/team">← Voltar ao histórico</Link>
        </Button>
      </div>

      {/* Scoreboard */}
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center gap-2 py-6">
          <div className="flex items-center gap-6 text-center">
            <span className="text-lg font-semibold text-foreground w-40 text-right">{match.home_club_name}</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-foreground">{match.home_score}</span>
              <span className="text-2xl text-muted-foreground">—</span>
              <span className="text-4xl font-bold text-foreground">{match.away_score}</span>
            </div>
            <span className="text-lg font-semibold text-foreground w-40 text-left">{match.away_club_name}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(match.match_timestamp)} · {matchTypeLabel}
          </p>
        </CardContent>
      </Card>

      {/* Player stats */}
      {hasPlayers ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <PlayerTable players={homePlayers} title={`${match.home_club_name} (casa)`} />
          <PlayerTable players={awayPlayers} title={`${match.away_club_name} (fora)`} />
        </div>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estatísticas individuais não disponíveis para esta partida.
            </CardTitle>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

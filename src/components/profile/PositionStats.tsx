"use client"

import { useEffect, useMemo, useState } from "react"
import { PositionBadge } from "@/components/player/PositionBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
<<<<<<< HEAD
import { PROFILE_MATCH_TYPES, formatNumber, formatRating, parseNumeric } from "@/lib/profile/dashboard"
=======
import { PROFILE_MATCH_TYPES, formatNumber, formatRating } from "@/lib/profile/dashboard"
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
import type { PlayerPosition, PlayerStatsByPositionView } from "@/types/database"

type PositionStatsProps = {
  playerId: string
}

type PositionStatsRow = {
  resolved_position: PlayerPosition | null
  goals: number | string | null
  assists: number | string | null
  rating: number | string | null
  tackles_made: number | string | null
  saves: number | string | null
}

type AggregatedPositionStats = PlayerStatsByPositionView & {
  ratingTotal: number
  ratingCount: number
}

<<<<<<< HEAD
=======
function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
export default function PositionStats({ playerId }: PositionStatsProps) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<PlayerStatsByPositionView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadPositionStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: queryError } = await supabase
          .from("match_players")
          .select("resolved_position, goals, assists, rating, tackles_made, saves, matches!inner(match_type)")
          .eq("player_id", playerId)
          .in("matches.match_type", PROFILE_MATCH_TYPES)
          .not("resolved_position", "is", null)

        if (queryError) {
          throw queryError
        }

        const aggregated = new Map<PlayerPosition, AggregatedPositionStats>()

        for (const row of (data ?? []) as PositionStatsRow[]) {
          if (!row.resolved_position) {
            continue
          }

          const current = aggregated.get(row.resolved_position) ?? {
            player_id: playerId,
            resolved_position: row.resolved_position,
            matches_at_position: 0,
            goals: 0,
            assists: 0,
            avg_rating: null,
            tackles: 0,
            saves: 0,
            clean_sheets: 0,
            ratingTotal: 0,
            ratingCount: 0,
          }

          const nextMatchCount = current.matches_at_position + 1
<<<<<<< HEAD
          const nextRating = parseNumeric(row.rating)
=======
          const nextRating = typeof row.rating === "number" ? row.rating : typeof row.rating === "string" ? Number(row.rating) : null
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
          const nextRatingTotal = current.ratingTotal + (nextRating ?? 0)
          const nextRatingCount = current.ratingCount + (nextRating === null || Number.isNaN(nextRating) ? 0 : 1)

          aggregated.set(row.resolved_position, {
            ...current,
            matches_at_position: nextMatchCount,
<<<<<<< HEAD
            goals: current.goals + (parseNumeric(row.goals) ?? 0),
            assists: current.assists + (parseNumeric(row.assists) ?? 0),
            avg_rating: nextRatingCount ? Number((nextRatingTotal / nextRatingCount).toFixed(2)) : null,
            tackles: current.tackles + (parseNumeric(row.tackles_made) ?? 0),
            saves: current.saves + (parseNumeric(row.saves) ?? 0),
=======
            goals: current.goals + toNumber(row.goals),
            assists: current.assists + toNumber(row.assists),
            avg_rating: nextRatingCount ? Number((nextRatingTotal / nextRatingCount).toFixed(2)) : null,
            tackles: current.tackles + toNumber(row.tackles_made),
            saves: current.saves + toNumber(row.saves),
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
            ratingTotal: nextRatingTotal,
            ratingCount: nextRatingCount,
          })
        }

        if (isMounted) {
          setRows(
            Array.from(aggregated.values())
              .map(({ ratingTotal: _ratingTotal, ratingCount: _ratingCount, ...row }) => row)
              .sort((first, second) => second.matches_at_position - first.matches_at_position)
          )
        }
      } catch {
        if (isMounted) {
<<<<<<< HEAD
          setError("Não foi possível carregar as stats por posição.")
=======
          setError("Nao foi possivel carregar as stats por posicao.")
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
          setRows([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadPositionStats()

    return () => {
      isMounted = false
    }
  }, [playerId, supabase])

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-1">
<<<<<<< HEAD
        <CardTitle className="text-base font-semibold">Stats por posição</CardTitle>
        <p className="text-sm text-muted-foreground">Agrupamento por resolved_position nas partidas competitivas.</p>
=======
        <CardTitle className="text-base font-semibold">Stats por posicao</CardTitle>
        <p className="text-sm text-foreground-secondary">Agrupamento por resolved_position nas partidas competitivas.</p>
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
<<<<<<< HEAD
                <TableHead>Posição</TableHead>
                <TableHead>Partidas</TableHead>
                <TableHead>Gols</TableHead>
                <TableHead>Assistências</TableHead>
                <TableHead>Rating médio</TableHead>
=======
                <TableHead>Posicao</TableHead>
                <TableHead>Partidas</TableHead>
                <TableHead>Gols</TableHead>
                <TableHead>Assistencias</TableHead>
                <TableHead>Rating medio</TableHead>
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
                <TableHead>Tackles</TableHead>
                <TableHead>Saves</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
<<<<<<< HEAD
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    Carregando stats por posição...
=======
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-foreground-secondary">
                    Carregando stats por posicao...
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
                  </TableCell>
                </TableRow>
              ) : rows.length ? (
                rows.map((row) => (
                  <TableRow key={`${row.player_id}-${row.resolved_position}`}>
                    <TableCell><PositionBadge position={row.resolved_position} /></TableCell>
                    <TableCell>{formatNumber(row.matches_at_position)}</TableCell>
                    <TableCell>{formatNumber(row.goals)}</TableCell>
                    <TableCell>{formatNumber(row.assists)}</TableCell>
                    <TableCell>{formatRating(row.avg_rating)}</TableCell>
                    <TableCell>{formatNumber(row.tackles)}</TableCell>
                    <TableCell>{formatNumber(row.saves)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
<<<<<<< HEAD
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma estatística por posição encontrada.
=======
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-foreground-secondary">
                    Nenhuma estatistica por posicao encontrada.
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

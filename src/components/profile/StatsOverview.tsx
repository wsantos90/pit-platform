"use client"

import { useEffect, useMemo, useState } from "react"
import { StatsCard } from "@/components/player/StatsCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import {
  PROFILE_MATCH_TYPES,
  PROFILE_PERIOD_OPTIONS,
  formatNumber,
  formatRating,
  getPeriodCutoff,
  type ProfilePeriod,
} from "@/lib/profile/dashboard"

type StatsOverviewProps = {
  playerId: string
}

type OverviewStats = {
  goals: number
  assists: number
  avgRating: number | null
  passesCompleted: number
  tacklesMade: number
  matchCount: number
}

type MatchPlayerAggregateRow = {
  goals: number | string | null
  assists: number | string | null
  rating: number | string | null
  passes_completed: number | string | null
  tackles_made: number | string | null
}

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

const EMPTY_STATS: OverviewStats = {
  goals: 0,
  assists: 0,
  avgRating: null,
  passesCompleted: 0,
  tacklesMade: 0,
  matchCount: 0,
}

export default function StatsOverview({ playerId }: StatsOverviewProps) {
  const supabase = useMemo(() => createClient(), [])
  const [period, setPeriod] = useState<ProfilePeriod>("30d")
  const [stats, setStats] = useState<OverviewStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const cutoff = getPeriodCutoff(period)
        let query = supabase
          .from("match_players")
          .select("goals, assists, rating, passes_completed, tackles_made, matches!inner(match_type, match_timestamp)")
          .eq("player_id", playerId)
          .in("matches.match_type", PROFILE_MATCH_TYPES)

        if (cutoff) {
          query = query.gte("matches.match_timestamp", cutoff)
        }

        const { data, error: queryError } = await query

        if (queryError) {
          throw queryError
        }

        const rows = (data ?? []) as MatchPlayerAggregateRow[]
<<<<<<< HEAD
        const ratings = rows.map((row) => parseNumeric(row.rating)).filter((value): value is number => value !== null && value > 0)
        const nextStats = rows.reduce<OverviewStats>(
          (accumulator, row) => ({
            goals: accumulator.goals + (parseNumeric(row.goals) ?? 0),
            assists: accumulator.assists + (parseNumeric(row.assists) ?? 0),
            avgRating: accumulator.avgRating,
            passesCompleted: accumulator.passesCompleted + (parseNumeric(row.passes_completed) ?? 0),
            tacklesMade: accumulator.tacklesMade + (parseNumeric(row.tackles_made) ?? 0),
=======
        const ratings = rows.map((row) => toNumber(row.rating)).filter((value) => value > 0)
        const nextStats = rows.reduce<OverviewStats>(
          (accumulator, row) => ({
            goals: accumulator.goals + toNumber(row.goals),
            assists: accumulator.assists + toNumber(row.assists),
            avgRating: accumulator.avgRating,
            passesCompleted: accumulator.passesCompleted + toNumber(row.passes_completed),
            tacklesMade: accumulator.tacklesMade + toNumber(row.tackles_made),
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
            matchCount: accumulator.matchCount + 1,
          }),
          { ...EMPTY_STATS }
        )

        nextStats.avgRating = ratings.length
          ? ratings.reduce((total, value) => total + value, 0) / ratings.length
          : null

        if (isMounted) {
          setStats(nextStats)
        }
      } catch {
        if (isMounted) {
<<<<<<< HEAD
          setError("Não foi possível carregar o resumo do jogador.")
=======
          setError("Nao foi possivel carregar o resumo do jogador.")
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
          setStats(EMPTY_STATS)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadStats()

    return () => {
      isMounted = false
    }
  }, [period, playerId, supabase])

  const helper = loading
    ? "Carregando..."
    : `${formatNumber(stats.matchCount)} ${stats.matchCount === 1 ? "partida" : "partidas"}`

  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-4 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Resumo de performance</CardTitle>
<<<<<<< HEAD
          <p className="text-sm text-muted-foreground">
            Estatísticas filtradas apenas por championship e friendly_pit.
=======
          <p className="text-sm text-foreground-secondary">
            Estatisticas filtradas apenas por championship e friendly_pit.
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
          </p>
        </div>

        <div className="w-full md:max-w-[180px]">
<<<<<<< HEAD
          <Select value={period} onChange={(event) => setPeriod(event.target.value as ProfilePeriod)} aria-label="Período">
=======
          <Select value={period} onChange={(event) => setPeriod(event.target.value as ProfilePeriod)} aria-label="Periodo">
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
            {PROFILE_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatsCard label="Gols" value={loading ? "..." : formatNumber(stats.goals)} helper={helper} />
<<<<<<< HEAD
          <StatsCard label="Assistências" value={loading ? "..." : formatNumber(stats.assists)} helper={helper} />
          <StatsCard label="Nota média" value={loading ? "..." : formatRating(stats.avgRating)} helper={helper} />
=======
          <StatsCard label="Assistencias" value={loading ? "..." : formatNumber(stats.assists)} helper={helper} />
          <StatsCard label="Nota media" value={loading ? "..." : formatRating(stats.avgRating)} helper={helper} />
>>>>>>> 11f87daa2b3f8be0a1abef3cd95e37277078e423
          <StatsCard label="Passes" value={loading ? "..." : formatNumber(stats.passesCompleted)} helper={helper} />
          <StatsCard label="Desarmes" value={loading ? "..." : formatNumber(stats.tacklesMade)} helper={helper} />
        </div>
      </CardContent>
    </Card>
  )
}

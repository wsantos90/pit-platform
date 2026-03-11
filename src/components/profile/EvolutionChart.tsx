"use client"

import { useEffect, useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import {
  PROFILE_MATCH_TYPES,
  PROFILE_PERIOD_OPTIONS,
  formatDateTime,
  formatRating,
  getPeriodCutoff,
  parseNumeric,
  type ProfilePeriod,
} from "@/lib/profile/dashboard"

type EvolutionChartProps = {
  playerId: string
}

type EvolutionRow = {
  rating: number | string | null
  matches:
    | {
        match_timestamp: string
        match_type: string
      }
    | Array<{
        match_timestamp: string
        match_type: string
      }>
    | null
}

type ChartPoint = {
  timestamp: string
  date: string
  fullDate: string
  rating: number
}

export default function EvolutionChart({ playerId }: EvolutionChartProps) {
  const supabase = useMemo(() => createClient(), [])
  const [period, setPeriod] = useState<ProfilePeriod>("90d")
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadChart = async () => {
      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from("match_players")
          .select("rating, matches!inner(match_timestamp, match_type)")
          .eq("player_id", playerId)
          .in("matches.match_type", PROFILE_MATCH_TYPES)
          .not("rating", "is", null)
          .order("match_timestamp", { ascending: true, referencedTable: "matches" })

        const cutoff = getPeriodCutoff(period)
        if (cutoff) {
          query = query.gte("matches.match_timestamp", cutoff)
        }

        const { data, error: queryError } = await query

        if (queryError) {
          throw queryError
        }

        const nextPoints = ((data ?? []) as EvolutionRow[])
          .map((row) => {
            const match = Array.isArray(row.matches) ? row.matches[0] : row.matches
            const rating = parseNumeric(row.rating)

            if (!match || rating === null) {
              return null
            }

            return {
              timestamp: match.match_timestamp,
              date: formatDateTime(match.match_timestamp, { day: "2-digit", month: "2-digit" }),
              fullDate: formatDateTime(match.match_timestamp, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              rating,
            }
          })
          .filter((point): point is ChartPoint => Boolean(point))
          .sort((first, second) => new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime())

        if (isMounted) {
          setData(nextPoints)
        }
      } catch {
        if (isMounted) {
          setError("Não foi possível carregar a evolução de notas.")
          setData([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadChart()

    return () => {
      isMounted = false
    }
  }, [period, playerId, supabase])

  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Evolução de rating</CardTitle>
          <p className="text-sm text-muted-foreground">Linha cronológica das notas nas partidas válidas.</p>
        </div>

        <div className="w-full md:max-w-[180px]">
          <Select value={period} onChange={(event) => setPeriod(event.target.value as ProfilePeriod)} aria-label="Período do gráfico">
            {PROFILE_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Carregando gráfico...</div>
        ) : data.length ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="date" stroke="currentColor" tick={{ fill: "currentColor", fontSize: 12 }} />
                <YAxis domain={[5, 10]} stroke="currentColor" tick={{ fill: "currentColor", fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [formatRating(typeof value === "number" ? value : Number(value)), "Rating"]}
                  labelFormatter={(label, payload) => {
                    const firstPoint = payload?.[0]?.payload as ChartPoint | undefined
                    return firstPoint?.fullDate ?? String(label)
                  }}
                />
                <Line type="monotone" dataKey="rating" stroke="#22c55e" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Ainda não há ratings suficientes para montar o gráfico.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { PositionBadge } from "@/components/player/PositionBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import {
  PLAYER_POSITION_OPTIONS,
  PROFILE_MATCH_TYPES,
  PROFILE_PERIOD_OPTIONS,
  formatDateTime,
  formatRating,
  getMatchResult,
  getOpponentName,
  getPeriodCutoff,
  getRatingClass,
  getResultBadgeClass,
  getScoreline,
  normalizeProfileMatchRow,
  type NormalizedProfileMatchRow,
  type ProfileClubRelation,
  type ProfileMatchRow,
  type ProfilePeriod,
} from "@/lib/profile/dashboard"

type MatchHistoryProps = {
  playerId: string
  limit?: number
  title?: string
  description?: string
  showViewAll?: boolean
}

type ClubFilterOption = {
  value: string
  label: string
}

type ClubOptionRow = {
  club_id: string | null
  ea_club_id: string
  clubs?: ProfileClubRelation | ProfileClubRelation[] | null
}

function getClubOptionValue(row: ClubOptionRow) {
  if (row.club_id) {
    return `club:${row.club_id}`
  }

  return `ea:${row.ea_club_id}`
}

function getClubOptionLabel(row: ClubOptionRow) {
  const club = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs
  return club?.display_name?.trim() || row.ea_club_id
}

export default function MatchHistory({
  playerId,
  limit = 20,
  title = "Historico de partidas",
  description = "Ultimos jogos do jogador com filtros por periodo, clube e posicao.",
  showViewAll = false,
}: MatchHistoryProps) {
  const supabase = useMemo(() => createClient(), [])
  const [period, setPeriod] = useState<ProfilePeriod>("30d")
  const [clubFilter, setClubFilter] = useState("all")
  const [positionFilter, setPositionFilter] = useState<"all" | string>("all")
  const [rows, setRows] = useState<NormalizedProfileMatchRow[]>([])
  const [clubOptions, setClubOptions] = useState<ClubFilterOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadClubOptions = async () => {
      const { data, error: queryError } = await supabase
        .from("match_players")
        .select("club_id, ea_club_id, clubs(display_name), matches!inner(match_type)")
        .eq("player_id", playerId)
        .in("matches.match_type", PROFILE_MATCH_TYPES)

      if (queryError || !isMounted) {
        return
      }

      const uniqueOptions = new Map<string, ClubFilterOption>()

      for (const row of (data ?? []) as ClubOptionRow[]) {
        const value = getClubOptionValue(row)
        if (!uniqueOptions.has(value)) {
          uniqueOptions.set(value, {
            value,
            label: getClubOptionLabel(row),
          })
        }
      }

      setClubOptions(Array.from(uniqueOptions.values()).sort((first, second) => first.label.localeCompare(second.label)))
    }

    void loadClubOptions()

    return () => {
      isMounted = false
    }
  }, [playerId, supabase])

  useEffect(() => {
    let isMounted = true

    const loadMatches = async () => {
      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from("match_players")
          .select(`
            id,
            club_id,
            ea_club_id,
            goals,
            assists,
            rating,
            passes_completed,
            tackles_made,
            resolved_position,
            man_of_match,
            matches!inner(
              id,
              match_timestamp,
              match_type,
              home_score,
              away_score,
              home_club_name,
              away_club_name,
              home_club_id,
              away_club_id,
              home_ea_club_id,
              away_ea_club_id
            ),
            clubs(display_name)
          `)
          .eq("player_id", playerId)
          .in("matches.match_type", PROFILE_MATCH_TYPES)
          .order("match_timestamp", { ascending: false, referencedTable: "matches" })
          .limit(limit)

        const cutoff = getPeriodCutoff(period)
        if (cutoff) {
          query = query.gte("matches.match_timestamp", cutoff)
        }

        if (clubFilter.startsWith("club:")) {
          query = query.eq("club_id", clubFilter.replace("club:", ""))
        } else if (clubFilter.startsWith("ea:")) {
          query = query.eq("ea_club_id", clubFilter.replace("ea:", ""))
        }

        if (positionFilter !== "all") {
          query = query.eq("resolved_position", positionFilter)
        }

        const { data, error: queryError } = await query

        if (queryError) {
          throw queryError
        }

        const nextRows = ((data ?? []) as ProfileMatchRow[])
          .map((row) => normalizeProfileMatchRow(row))
          .filter((row): row is NormalizedProfileMatchRow => Boolean(row))

        if (isMounted) {
          setRows(nextRows)
        }
      } catch {
        if (isMounted) {
          setError("Nao foi possivel carregar o historico de partidas.")
          setRows([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadMatches()

    return () => {
      isMounted = false
    }
  }, [clubFilter, limit, period, playerId, positionFilter, supabase])

  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <p className="text-sm text-foreground-secondary">{description}</p>
          </div>

          {showViewAll ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile/matches">Ver tudo</Link>
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Select value={period} onChange={(event) => setPeriod(event.target.value as ProfilePeriod)} aria-label="Periodo de partidas">
            {PROFILE_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select value={clubFilter} onChange={(event) => setClubFilter(event.target.value)} aria-label="Filtro de clube">
            <option value="all">Todos clubes</option>
            {clubOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} aria-label="Filtro de posicao">
            {PLAYER_POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Adversario</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Placar</TableHead>
                <TableHead>Posicao</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>MoM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-foreground-secondary">
                    Carregando partidas...
                  </TableCell>
                </TableRow>
              ) : rows.length ? (
                rows.map((row) => {
                  const result = getMatchResult(row)
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{formatDateTime(row.matches.match_timestamp, { day: "2-digit", month: "2-digit", year: "2-digit" })}</TableCell>
                      <TableCell>
                        <Link href={`/matches/${row.matches.id}`} className="font-medium text-foreground transition-colors hover:text-primary">
                          {getOpponentName(row)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border ${getResultBadgeClass(result)}`}>{result}</Badge>
                      </TableCell>
                      <TableCell>{getScoreline(row)}</TableCell>
                      <TableCell>{row.resolved_position ? <PositionBadge position={row.resolved_position} /> : <span className="text-foreground-secondary">-</span>}</TableCell>
                      <TableCell className={`font-semibold ${getRatingClass(row.rating)}`}>{formatRating(row.rating)}</TableCell>
                      <TableCell>
                        {row.man_of_match ? (
                          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700">MoM</Badge>
                        ) : (
                          <span className="text-foreground-secondary">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-foreground-secondary">
                    Nenhuma partida encontrada para os filtros atuais.
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

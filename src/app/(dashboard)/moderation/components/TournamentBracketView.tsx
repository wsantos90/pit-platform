'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type BracketItem = {
  id: string
  round: string
  round_order: number
  match_order: number
  home_entry_id: string | null
  away_entry_id: string | null
  home_club_id: string | null
  away_club_id: string | null
  home_score: number | null
  away_score: number | null
  winner_entry_id: string | null
  status: string
  completed_at: string | null
  next_bracket_id: string | null
  home_club_name: string | null
  away_club_name: string | null
  winner_club_name: string | null
}

interface TournamentBracketViewProps {
  tournamentId: string
}

function statusClass(status: string) {
  if (status === "completed") return "bg-green-500/10 text-green-400 border-green-500/30"
  if (status === "live") return "bg-blue-500/10 text-blue-400 border-blue-500/30"
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
}

function formatRoundLabel(round: string) {
  return round
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ")
}

export default function TournamentBracketView({ tournamentId }: TournamentBracketViewProps) {
  const [brackets, setBrackets] = useState<BracketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})

  const loadBrackets = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/moderation/tournaments/${tournamentId}/bracket`, {
        method: "GET",
      })
      const payload = (await response.json()) as { brackets?: BracketItem[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load brackets")
      }
      const nextBrackets = payload.brackets ?? []
      setBrackets(nextBrackets)
      setScores((current) => {
        const merged: Record<string, { home: string; away: string }> = { ...current }
        for (const bracket of nextBrackets) {
          merged[bracket.id] = {
            home: bracket.home_score?.toString() ?? current[bracket.id]?.home ?? "0",
            away: bracket.away_score?.toString() ?? current[bracket.id]?.away ?? "0",
          }
        }
        return merged
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load brackets")
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    void loadBrackets()
  }, [loadBrackets])

  async function submitScore(bracket: BracketItem) {
    const currentScore = scores[bracket.id] ?? { home: "0", away: "0" }
    setSavingId(bracket.id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(
        `/api/moderation/tournaments/${tournamentId}/bracket/${bracket.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            homeScore: Number(currentScore.home),
            awayScore: Number(currentScore.away),
          }),
        }
      )
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save result")
      }
      setSuccess("Resultado salvo com sucesso.")
      await loadBrackets()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save result")
    } finally {
      setSavingId(null)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, BracketItem[]>()
    for (const bracket of brackets) {
      const key = `${bracket.round_order}-${bracket.round}`
      const current = map.get(key) ?? []
      current.push(bracket)
      map.set(key, current)
    }
    return Array.from(map.entries())
      .sort((a, b) => Number(a[0].split("-")[0]) - Number(b[0].split("-")[0]))
      .map(([, value]) => value.sort((a, b) => a.match_order - b.match_order))
  }, [brackets])

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Chaveamento</p>
        <Button type="button" variant="outline" onClick={() => void loadBrackets()} disabled={loading}>
          {loading ? "Carregando..." : "Atualizar"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          {success}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <div className="h-14 animate-pulse rounded-lg bg-muted" />
          <div className="h-14 animate-pulse rounded-lg bg-muted" />
          <div className="h-14 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : null}

      {!loading && grouped.length === 0 ? (
        <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Nenhum confronto gerado para este torneio.
        </p>
      ) : null}

      {grouped.map((roundBrackets) => (
        <div key={`${roundBrackets[0].round_order}-${roundBrackets[0].round}`} className="space-y-2">
          <h4 className="text-sm font-semibold">{formatRoundLabel(roundBrackets[0].round)}</h4>
          {roundBrackets.map((bracket) => {
            const canSubmit =
              bracket.status !== "completed" && Boolean(bracket.home_entry_id && bracket.away_entry_id)
            return (
              <div key={bracket.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Jogo {bracket.match_order}</p>
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusClass(bracket.status)}`}>
                    {bracket.status}
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <p>{bracket.home_club_name ?? "TBD"}</p>
                  <p>{bracket.away_club_name ?? "TBD"}</p>
                </div>

                {canSubmit ? (
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={scores[bracket.id]?.home ?? "0"}
                      onChange={(event) =>
                        setScores((current) => ({
                          ...current,
                          [bracket.id]: {
                            home: event.target.value,
                            away: current[bracket.id]?.away ?? "0",
                          },
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">x</span>
                    <Input
                      type="number"
                      min={0}
                      value={scores[bracket.id]?.away ?? "0"}
                      onChange={(event) =>
                        setScores((current) => ({
                          ...current,
                          [bracket.id]: {
                            home: current[bracket.id]?.home ?? "0",
                            away: event.target.value,
                          },
                        }))
                      }
                      className="w-20"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void submitScore(bracket)}
                      disabled={savingId === bracket.id}
                      aria-busy={savingId === bracket.id}
                    >
                      {savingId === bracket.id ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {bracket.status === "completed"
                      ? `Resultado: ${bracket.home_score ?? 0} x ${bracket.away_score ?? 0}`
                      : "Aguardando definicao dos times."}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

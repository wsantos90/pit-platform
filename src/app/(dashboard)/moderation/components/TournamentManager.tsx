'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import TournamentCreateForm, { type TournamentSummary } from "./TournamentCreateForm"
import TournamentBracketView from "./TournamentBracketView"

type TournamentStatus = "draft" | "open" | "confirmed" | "in_progress" | "finished" | "cancelled"

interface TournamentItem extends TournamentSummary {
  entries_count: number
  paid_entries_count: number
  entries?: Array<{
    club_id: string
    club_name: string | null
    payment_status: string
    seed: number | null
  }>
}

const statusLabels: Record<TournamentStatus, string> = {
  draft: "Draft",
  open: "Open",
  confirmed: "Confirmed",
  in_progress: "In progress",
  finished: "Finished",
  cancelled: "Cancelled",
}

function statusClass(status: TournamentStatus) {
  if (status === "finished") return "bg-green-500/10 text-green-400 border-green-500/30"
  if (status === "cancelled") return "bg-destructive/10 text-destructive border-destructive/30"
  if (status === "in_progress") return "bg-blue-500/10 text-blue-400 border-blue-500/30"
  if (status === "confirmed") return "bg-primary/15 text-primary border-primary/30"
  if (status === "open") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
  return "bg-muted text-muted-foreground border-border"
}

function formatDate(date: string, time: string) {
  const raw = `${date}T${time}`
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return `${date} ${time}`
  return parsed.toLocaleString("pt-BR")
}

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | "all">("all")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [workingTournamentId, setWorkingTournamentId] = useState<string | null>(null)
  const [openBracketTournamentId, setOpenBracketTournamentId] = useState<string | null>(null)

  const loadTournaments = useCallback(async (filter: TournamentStatus | "all") => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/moderation/tournaments?status=${filter}`, {
        method: "GET",
      })
      const payload = (await response.json()) as { tournaments?: TournamentItem[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load tournaments")
      }
      setTournaments(payload.tournaments ?? [])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load tournaments")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTournaments("all")
  }, [loadTournaments])

  async function updateStatus(tournament: TournamentItem, status: TournamentStatus) {
    setWorkingTournamentId(tournament.id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/moderation/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update tournament status")
      }
      await loadTournaments(statusFilter)
      setSuccess(`Status do torneio atualizado para ${statusLabels[status]}.`)
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Failed to update tournament status"
      )
    } finally {
      setWorkingTournamentId(null)
    }
  }

  async function generateBracket(tournament: TournamentItem) {
    setWorkingTournamentId(tournament.id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/moderation/tournaments/${tournament.id}/bracket`, {
        method: "POST",
      })
      const payload = (await response.json()) as { error?: string; created_brackets?: number }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate bracket")
      }
      await loadTournaments(statusFilter)
      setOpenBracketTournamentId(tournament.id)
      setSuccess(
        `Chaveamento gerado com sucesso (${payload.created_brackets ?? 0} confrontos criados).`
      )
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to generate bracket")
    } finally {
      setWorkingTournamentId(null)
    }
  }

  const sortedTournaments = useMemo(
    () =>
      [...tournaments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [tournaments]
  )

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Gestao de torneios</CardTitle>
            <CardDescription>
              Crie torneios, altere status, gere chaveamento e registre resultados.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateForm((current) => !current)
                setError(null)
                setSuccess(null)
              }}
            >
              {showCreateForm ? "Fechar formulario" : "Criar torneio"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void loadTournaments(statusFilter)}>
              {loading ? "Carregando..." : "Atualizar"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="tournament-status-filter" className="text-sm text-muted-foreground">
            Filtro:
          </label>
          <select
            id="tournament-status-filter"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(event) => {
              const next = event.target.value as TournamentStatus | "all"
              setStatusFilter(next)
              void loadTournaments(next)
            }}
          >
            <option value="all">Todos</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In progress</option>
            <option value="finished">Finished</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showCreateForm ? (
          <TournamentCreateForm
            onCreated={(tournament) => {
              setShowCreateForm(false)
              setTournaments((current) => [
                {
                  ...tournament,
                  entries_count: 0,
                  paid_entries_count: 0,
                },
                ...current,
              ])
              setSuccess("Torneio criado com sucesso.")
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : null}

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
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : null}

        {!loading && sortedTournaments.length === 0 ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Nenhum torneio encontrado para o filtro selecionado.
          </p>
        ) : null}

        {sortedTournaments.map((tournament) => (
          <div key={tournament.id} className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold">{tournament.name}</p>
                <p className="text-xs text-muted-foreground">
                  {tournament.format} · {tournament.type}
                </p>
                <p className="text-xs text-muted-foreground">
                  Inicio: {formatDate(tournament.scheduled_date, tournament.start_time)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Times: {tournament.entries_count} (pagos: {tournament.paid_entries_count})
                </p>
                {tournament.entries && tournament.entries.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tournament.entries.map((entry) => (
                      <span
                        key={`${tournament.id}-${entry.club_id}`}
                        className="rounded-md border border-border bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {entry.club_name ?? "Time sem nome"}
                        {entry.seed ? ` (seed ${entry.seed})` : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <span
                className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusClass(
                  tournament.status as TournamentStatus
                )}`}
              >
                {statusLabels[tournament.status as TournamentStatus] ?? tournament.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tournament.status === "draft" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void updateStatus(tournament, "open")}
                  disabled={workingTournamentId === tournament.id}
                >
                  Abrir inscricoes
                </Button>
              ) : null}

              {tournament.status === "open" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void generateBracket(tournament)}
                  disabled={workingTournamentId === tournament.id}
                >
                  Gerar chaveamento
                </Button>
              ) : null}

              {tournament.status === "confirmed" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void updateStatus(tournament, "in_progress")}
                  disabled={workingTournamentId === tournament.id}
                >
                  Iniciar torneio
                </Button>
              ) : null}

              {tournament.status === "in_progress" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void updateStatus(tournament, "finished")}
                  disabled={workingTournamentId === tournament.id}
                >
                  Finalizar torneio
                </Button>
              ) : null}

              {tournament.status !== "cancelled" && tournament.status !== "finished" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void updateStatus(tournament, "cancelled")}
                  disabled={workingTournamentId === tournament.id}
                >
                  Cancelar
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setOpenBracketTournamentId((current) =>
                    current === tournament.id ? null : tournament.id
                  )
                }
              >
                {openBracketTournamentId === tournament.id ? "Ocultar chaveamento" : "Ver chaveamento"}
              </Button>
            </div>

            {openBracketTournamentId === tournament.id ? (
              <TournamentBracketView tournamentId={tournament.id} />
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Radar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type DiscoveryRunStatus = "running" | "completed" | "failed" | "cancelled" | "success"

type DiscoveryRun = {
  id: string
  started_at: string
  finished_at: string | null
  status: DiscoveryRunStatus
  clubs_scanned: number
  clubs_new: number
  players_found: number
  error_message: string | null
}

type DiscoveryRunsPayload = {
  runs: DiscoveryRun[]
}

const integerFormatter = new Intl.NumberFormat("pt-BR")

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("pt-BR")
}

function formatDuration(startedAt: string, finishedAt: string | null) {
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return "-"

  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  if (Number.isNaN(end)) return "-"

  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function statusBadgeClass(status: DiscoveryRunStatus) {
  if (status === "running") return "border-blue-500/30 bg-blue-500/10 text-blue-700"
  if (status === "completed" || status === "success") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
  if (status === "failed") return "border-destructive/30 bg-destructive/10 text-destructive"
  return "border-slate-500/30 bg-slate-500/10 text-slate-700"
}

export default function DiscoveryControl() {
  const [runs, setRuns] = useState<DiscoveryRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isStartingScan, setIsStartingScan] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchRuns = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false
      if (!silent) {
        setIsRefreshing(true)
      }

      try {
        const response = await fetch("/api/admin/discovery-runs", {
          method: "GET",
          cache: "no-store",
        })

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error ?? "failed_to_load_discovery_runs")
        }

        const payload = (await response.json()) as DiscoveryRunsPayload
        setRuns(payload.runs ?? [])
        setError(null)
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "failed_to_load_discovery_runs"
        setError(message)
      } finally {
        setIsLoading(false)
        if (!silent) {
          setIsRefreshing(false)
        }
      }
    },
    []
  )

  const startScan = useCallback(async () => {
    setIsStartingScan(true)
    setFeedback(null)

    try {
      const response = await fetch("/api/discovery/scan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      })

      const body = (await response.json().catch(() => null)) as
        | { processed?: number; failed?: number; error?: string }
        | null

      if (!response.ok) {
        throw new Error(body?.error ?? "failed_to_execute_discovery_scan")
      }

      const processed = body?.processed ?? 0
      const failed = body?.failed ?? 0
      setFeedback(`Varredura concluida. Processados: ${processed}. Falhas: ${failed}.`)
      await fetchRuns({ silent: true })
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : "failed_to_execute_discovery_scan"
      setError(message)
    } finally {
      setIsStartingScan(false)
    }
  }, [fetchRuns])

  useEffect(() => {
    void fetchRuns()
  }, [fetchRuns])

  useEffect(() => {
    const channel = supabase
      .channel("admin:discovery-runs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discovery_runs",
        },
        () => {
          void fetchRuns({ silent: true })
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED")
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchRuns, supabase])

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Controle de Discovery</CardTitle>
            <p className="text-sm text-foreground-secondary">
              Dispare uma varredura manual e acompanhe o historico das ultimas execucoes.
            </p>
          </div>
          <Button onClick={() => void startScan()} disabled={isStartingScan}>
            {isStartingScan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            Iniciar Varredura
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={isRealtimeConnected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-amber-500/30 bg-amber-500/10 text-amber-700"}>
              Realtime: {isRealtimeConnected ? "conectado" : "desconectado"}
            </Badge>
            <Button variant="outline" size="sm" disabled={isRefreshing} onClick={() => void fetchRuns()}>
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>

          {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
          {error ? <p className="text-sm text-destructive">Erro: {error}</p> : null}
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Historico de discovery_runs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-foreground-secondary">Carregando...</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-foreground-secondary">Nenhuma execucao encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Times Escaneados</TableHead>
                    <TableHead>Novos Times</TableHead>
                    <TableHead>Duracao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(run.started_at)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={statusBadgeClass(run.status)}>{run.status}</Badge>
                          {run.status === "failed" && run.error_message ? (
                            <p className="max-w-xs truncate text-xs text-foreground-muted" title={run.error_message}>
                              {run.error_message}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{integerFormatter.format(run.clubs_scanned)}</TableCell>
                      <TableCell>{integerFormatter.format(run.clubs_new)}</TableCell>
                      <TableCell>{formatDuration(run.started_at, run.finished_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

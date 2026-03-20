"use client"

import { AlertTriangle, Loader2, Radar, Server } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  useDiscoveryTab,
  type DiscoveryHealthPayload,
  type DiscoveryRunStatus,
} from "@/hooks/admin/useDiscoveryTab"

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

function diagnosticBadgeClass(payload: DiscoveryHealthPayload | null) {
  if (!payload) return "border-slate-500/30 bg-slate-500/10 text-slate-700"
  if (!payload.cookie_service_configured) return "border-amber-500/30 bg-amber-500/10 text-amber-700"
  if (!payload.service_health.ok || payload.service_health.status === "degraded") {
    return "border-destructive/30 bg-destructive/10 text-destructive"
  }
  if (!payload.ea_fetch_health.ok) {
    return "border-destructive/30 bg-destructive/10 text-destructive"
  }
  if (payload.service_health.cache.has_cookie === false || payload.ea_fetch_health.cache.has_cookie === false) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700"
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
}

function diagnosticLabel(payload: DiscoveryHealthPayload | null) {
  if (!payload) return "Diagnostico indisponivel"
  if (!payload.cookie_service_configured) return "Cookie service não configurado"
  if (!payload.service_health.ok) return "Cookie service indisponivel"
  if (payload.service_health.status === "degraded") return "Cookie service degradado"
  if (!payload.ea_fetch_health.ok) return "Fetch EA falhando no proxy"
  if (payload.service_health.cache.has_cookie === false || payload.ea_fetch_health.cache.has_cookie === false) {
    return "Sem cookies validos no proxy"
  }
  return "Proxy browser operacional"
}

function formatFetchFailure(payload: DiscoveryHealthPayload | null) {
  if (!payload) return "-"
  const error = payload.ea_fetch_health.last_error || payload.ea_fetch_health.error
  if (!error) return "-"

  const parts = [
    payload.ea_fetch_health.stage ? `stage=${payload.ea_fetch_health.stage}` : null,
    payload.ea_fetch_health.resolved_by ? `resolvedBy=${payload.ea_fetch_health.resolved_by}` : null,
    payload.ea_fetch_health.upstream_status ? `upstream=${payload.ea_fetch_health.upstream_status}` : null,
    payload.ea_fetch_health.content_type ? `contentType=${payload.ea_fetch_health.content_type}` : null,
    payload.ea_fetch_health.body_snippet ? `body=${payload.ea_fetch_health.body_snippet}` : null,
  ]
    .filter(Boolean)
    .join(" | ")

  return parts ? `${error} (${parts})` : error
}

export default function DiscoveryControl() {
  const {
    error,
    feedback,
    health,
    healthError,
    isLoading,
    isRealtimeConnected,
    isRefreshing,
    isStartingScan,
    needsCookieSyncHelp,
    refreshAll,
    runs,
    startScan,
  } = useDiscoveryTab()

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
            <Button variant="outline" size="sm" disabled={isRefreshing} onClick={() => void refreshAll()}>
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>

          {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
          {error ? <p className="text-sm text-destructive">Erro: {error}</p> : null}
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Diagnostico do Proxy EA</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={diagnosticBadgeClass(health)}>{diagnosticLabel(health)}</Badge>
            {health ? (
              <Badge className="border-border bg-background/50 text-foreground">Transporte: {health.ea_fetch_transport}</Badge>
            ) : null}
          </div>

          {healthError ? <p className="text-sm text-destructive">Erro ao carregar diagnostico: {healthError}</p> : null}

          {health ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
                <p className="text-foreground-secondary">Cookie service</p>
                <p className="font-medium text-foreground">
                  {health.cookie_service_configured ? "Configurado" : "Não configurado"}
                </p>
                <p className="mt-2 text-foreground-secondary">Status remoto</p>
                <p className="font-medium text-foreground">{health.service_health.status ?? "-"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
                <p className="text-foreground-secondary">Cookies no proxy</p>
                <p className="font-medium text-foreground">
                  {health.service_health.cache.has_cookie === null
                    ? "-"
                    : health.service_health.cache.has_cookie
                      ? "Disponiveis"
                      : "Ausentes"}
                </p>
                <p className="mt-2 text-foreground-secondary">Browserless fallback</p>
                <p className="font-medium text-foreground">
                  {health.service_health.fallback.browserless_configured === null
                    ? "-"
                    : health.service_health.fallback.browserless_configured
                      ? "Configurado"
                      : "Não configurado"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
                <p className="text-foreground-secondary">Ultima renovacao</p>
                <p className="font-medium text-foreground">{formatDateTime(health.service_health.last_execution)}</p>
                <p className="mt-2 text-foreground-secondary">Proxima renovacao</p>
                <p className="font-medium text-foreground">{formatDateTime(health.service_health.next_execution)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
                <p className="text-foreground-secondary">Fetch EA real</p>
                <p className="font-medium text-foreground">{health.ea_fetch_health.ok ? "Operacional" : "Falhando"}</p>
                <p className="mt-2 text-foreground-secondary">Stage</p>
                <p className="font-medium text-foreground">{health.ea_fetch_health.stage ?? "-"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
                <p className="text-foreground-secondary">Resolvido por</p>
                <p className="font-medium text-foreground">{health.ea_fetch_health.resolved_by ?? "-"}</p>
                <p className="mt-2 text-foreground-secondary">Usou cookie em cache</p>
                <p className="font-medium text-foreground">
                  {health.ea_fetch_health.used_cached_cookie === null
                    ? "-"
                    : health.ea_fetch_health.used_cached_cookie
                      ? "Sim"
                      : "Não"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
                <p className="text-foreground-secondary">Ultimo erro do fetch EA</p>
                <p className="break-words font-medium text-foreground">{formatFetchFailure(health)}</p>
              </div>
            </div>
          ) : null}

          {needsCookieSyncHelp ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-foreground">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p>
                  O Discovery usa o proxy browser do cookie service. Carregue a build operacional em
                  <code className="mx-1 rounded bg-muted px-1">dist/browser-extension/</code>, confirme no popup que o build esta configurado,
                  clique em &quot;Sincronizar agora&quot; e depois atualize este diagnostico.
                </p>
              </div>
            </div>
          ) : null}
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
                          {run.error_message ? (
                            <p className="max-w-md whitespace-normal break-words text-xs text-foreground-muted">
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

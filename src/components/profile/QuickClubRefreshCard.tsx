"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, RefreshCw, Server, ShieldAlert, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const EXTENSION_ID = process.env.NEXT_PUBLIC_PIT_EXTENSION_ID ?? ""

type CollectResponse = {
  run_id: string
  mode: "server" | "local_extension"
  matches_new: number
  matches_skipped: number
  players_linked: number
}

type RuntimeResponse = {
  ok?: boolean
  rawData?: unknown
  error?: string
}

type ChromeRuntime = {
  lastError?: { message?: string }
  sendMessage: (extensionId: string, payload: unknown, callback: (response?: RuntimeResponse) => void) => void
}

type RefreshState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "done"; response: CollectResponse; completedAt: string }
  | { phase: "error"; message: string }

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("pt-BR")
}

function getChromeRuntime(): ChromeRuntime | null {
  const maybeChrome = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome
  return maybeChrome?.runtime ?? null
}

function sendExtensionMessage(payload: unknown): Promise<RuntimeResponse | null> {
  const runtime = getChromeRuntime()
  if (!runtime || !EXTENSION_ID) return Promise.resolve(null)

  return new Promise((resolve) => {
    runtime.sendMessage(EXTENSION_ID, payload, (response) => {
      if (runtime.lastError) {
        resolve(null)
        return
      }
      resolve(response ?? null)
    })
  })
}

async function pingExtension() {
  const response = await sendExtensionMessage({ type: "PING" })
  return response?.ok === true
}

type Props = {
  clubName: string
  eaClubId: string
  lastScannedAt: string | null
}

export default function QuickClubRefreshCard({ clubName, eaClubId, lastScannedAt }: Props) {
  const [extensionReady, setExtensionReady] = useState<boolean | null>(null)
  const [isCheckingExtension, setIsCheckingExtension] = useState(false)
  const [state, setState] = useState<RefreshState>({ phase: "idle" })
  const [lastSuccessfulScanAt, setLastSuccessfulScanAt] = useState<string | null>(lastScannedAt)

  const refreshExtensionStatus = useCallback(async () => {
    setIsCheckingExtension(true)
    setExtensionReady(await pingExtension())
    setIsCheckingExtension(false)
  }, [])

  useEffect(() => {
    void refreshExtensionStatus()
  }, [refreshExtensionStatus])

  const runServerCollect = useCallback(async (): Promise<CollectResponse> => {
    const response = await fetch("/api/collect/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    })

    const body = (await response.json().catch(() => null)) as
      | (CollectResponse & { error?: string; retry_after_seconds?: number })
      | { error?: string; retry_after_seconds?: number }
      | null

    if (!response.ok) {
      if (response.status === 429) {
        const retrySeconds = typeof body?.retry_after_seconds === "number" ? body.retry_after_seconds : null
        throw new Error(
          retrySeconds
            ? `Aguarde ${retrySeconds}s antes de atualizar novamente.`
            : "Seu clube acabou de ser atualizado. Tente novamente em instantes."
        )
      }

      throw new Error(body && "error" in body && body.error ? body.error : "failed_to_collect_matches")
    }

    return body as CollectResponse
  }, [])

  const handleRefresh = useCallback(async () => {
    if (state.phase === "checking") return

    setState({ phase: "checking" })

    try {
      if (extensionReady) {
        const extensionResponse = await sendExtensionMessage({
          type: "FETCH_MATCHES_FOR_CLUB",
          eaClubId,
        })

        if (extensionResponse?.ok && extensionResponse.rawData !== undefined) {
          const persistResponse = await fetch("/api/collect/run", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              mode: "local_extension",
              ea_club_id: eaClubId,
              raw_data: extensionResponse.rawData,
            }),
          })

          const persistBody = (await persistResponse.json().catch(() => null)) as
            | (CollectResponse & { error?: string; retry_after_seconds?: number })
            | { error?: string; retry_after_seconds?: number }
            | null

          if (!persistResponse.ok) {
            if (persistResponse.status === 429) {
              const retrySeconds =
                persistBody && "retry_after_seconds" in persistBody && typeof persistBody.retry_after_seconds === "number"
                  ? persistBody.retry_after_seconds
                  : null
              throw new Error(
                retrySeconds
                  ? `Aguarde ${retrySeconds}s antes de atualizar novamente.`
                  : "Seu clube acabou de ser atualizado. Tente novamente em instantes."
              )
            }

            throw new Error(
              persistBody && "error" in persistBody && persistBody.error
                ? persistBody.error
                : "failed_to_collect_matches"
            )
          }

          const collectResponse = persistBody as CollectResponse
          const completedAt = new Date().toISOString()
          setLastSuccessfulScanAt(completedAt)
          setState({ phase: "done", response: collectResponse, completedAt })
          return
        }
      }

      const collectResponse = await runServerCollect()
      const completedAt = new Date().toISOString()
      setLastSuccessfulScanAt(completedAt)
      setState({ phase: "done", response: collectResponse, completedAt })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao atualizar clube."
      setState({ phase: "error", message })
    }
  }, [eaClubId, extensionReady, runServerCollect, state.phase])

  const modeBadge = useMemo(() => {
    if (extensionReady === null) return { label: "Detectando extensao", className: "border-border bg-background/50 text-foreground" }
    if (extensionReady) return { label: "Modo rapido local pronto", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" }
    return { label: "Fallback via servidor", className: "border-amber-500/30 bg-amber-500/10 text-amber-700" }
  }, [extensionReady])

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Atualizar meu time</CardTitle>
            <p className="text-sm text-foreground-secondary">
              Clube ativo: <span className="font-medium text-foreground">{clubName}</span> ({eaClubId})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={modeBadge.className}>{modeBadge.label}</Badge>
            <Button variant="outline" size="sm" disabled={isCheckingExtension} onClick={() => void refreshExtensionStatus()}>
              {isCheckingExtension ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Verificar extensao
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
            <p className="text-foreground-secondary">Ultima atualizacao</p>
            <p className="font-medium text-foreground">{formatDateTime(lastSuccessfulScanAt)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
            <p className="text-foreground-secondary">Modo preferido</p>
            <p className="font-medium text-foreground">{extensionReady ? "Local (extensao)" : "Servidor / VPS"}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
            <p className="text-foreground-secondary">Cooldown manual</p>
            <p className="font-medium text-foreground">2 minutos</p>
          </div>
        </div>

        <p className="text-sm text-foreground-secondary">
          Quando a PIT Collect estiver ativa, a atualizacao usa os cookies do seu navegador local. Sem extensao, o sistema cai automaticamente para o proxy da VPS.
        </p>

        <Button onClick={() => void handleRefresh()} disabled={state.phase === "checking"} className="gap-2">
          {state.phase === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {state.phase === "checking" ? "Atualizando..." : "Atualizar meu time agora"}
        </Button>

        {state.phase === "done" ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-foreground">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <div className="space-y-1">
                <p>
                  Atualizacao concluida em <strong>{state.response.mode === "local_extension" ? "modo local" : "modo servidor"}</strong>.
                </p>
                <p>
                  <strong>{state.response.matches_new}</strong> partidas novas, <strong>{state.response.matches_skipped}</strong> ignoradas, <strong>{state.response.players_linked}</strong> jogadores vinculados.
                </p>
                <p className="text-foreground-secondary">Finalizado em {formatDateTime(state.completedAt)}</p>
              </div>
            </div>
          </div>
        ) : null}

        {state.phase === "error" ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-foreground">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p>{state.message}</p>
            </div>
          </div>
        ) : null}

        {!extensionReady ? (
          <div className="rounded-lg border border-border bg-background/50 p-3 text-sm text-foreground-secondary">
            Sem extensao detectada, o botao continua funcionando via VPS. Para velocidade maxima, mantenha a PIT Collect ativa no navegador desta maquina.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

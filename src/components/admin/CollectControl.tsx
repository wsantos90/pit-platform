"use client"

import { useState, useEffect, useCallback } from "react"
import { Download, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const EXTENSION_ID = process.env.NEXT_PUBLIC_PIT_EXTENSION_ID ?? ""
const BACKEND_BASE =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://pit-platform.vercel.app"

type ClubProgress = {
  ea_club_id: string
  status: "pending" | "success" | "failed"
  matches_new?: number
  error?: string
}

type RunSummary = {
  success: number
  failed: number
  matches_new: number
}

type ExtensionResponse = { ok?: boolean } | undefined

type ExtensionMessage = {
  type: string
  runId: string
  eaClubId: string
  status?: string
  matches_new?: number
  error?: string
  results?: RunSummary
}

type ChromeRuntime = {
  lastError?: unknown
  sendMessage: (
    extensionId: string,
    payload: unknown,
    callback: (response: ExtensionResponse) => void
  ) => void
  onMessage: {
    addListener: (listener: (message: ExtensionMessage) => void) => void
    removeListener: (listener: (message: ExtensionMessage) => void) => void
  }
}

type CollectState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "running"; runId: string; clubs: ClubProgress[] }
  | { phase: "done"; summary: RunSummary; clubs: ClubProgress[] }
  | { phase: "error"; message: string }

function getChromeRuntime(): ChromeRuntime | null {
  const maybeChrome = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome
  return maybeChrome?.runtime ?? null
}

function isExtensionAvailable(): boolean {
  return Boolean(getChromeRuntime() && EXTENSION_ID)
}

async function pingExtension(): Promise<boolean> {
  const runtime = getChromeRuntime()
  if (!runtime || !EXTENSION_ID) return false
  return new Promise((resolve) => {
    runtime.sendMessage(EXTENSION_ID, { type: "PING" }, (response) => {
      if (runtime.lastError) {
        resolve(false)
        return
      }
      resolve(response?.ok === true)
    })
  })
}

export default function CollectControl() {
  const [state, setState] = useState<CollectState>({ phase: "idle" })
  const [extensionOk, setExtensionOk] = useState<boolean | null>(null)

  useEffect(() => {
    pingExtension().then(setExtensionOk)
  }, [])

  const handleCollect = useCallback(async () => {
    if (state.phase === "running" || state.phase === "starting") return

    setState({ phase: "starting" })

    try {
      const resp = await fetch("/api/collect/tournament-run/start", { method: "POST" })
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        const msg =
          body.error === "no_active_tournaments"
            ? "Nenhum campeonato ativo encontrado (confirmed ou in_progress)."
            : `Falha ao iniciar coleta: ${body.error ?? resp.status}`
        setState({ phase: "error", message: msg })
        return
      }

      const { run_id, token, targets } = (await resp.json()) as {
        run_id: string
        token: string
        targets: string[]
      }

      const clubs: ClubProgress[] = targets.map((id) => ({
        ea_club_id: id,
        status: "pending",
      }))

      setState({ phase: "running", runId: run_id, clubs })

      // Escuta progresso da extensão
      const progressListener = (message: ExtensionMessage) => {
        if (message.runId !== run_id) return

        if (message.type === "COLLECT_PROGRESS") {
          setState((prev) => {
            if (prev.phase !== "running") return prev
            return {
              ...prev,
              clubs: prev.clubs.map((c) =>
                c.ea_club_id === message.eaClubId
                  ? {
                      ...c,
                      status: message.status === "success" ? "success" : "failed",
                      matches_new: message.matches_new,
                      error: message.error,
                    }
                  : c
              ),
            }
          })
        }

        if (message.type === "COLLECT_DONE") {
          const runtime = getChromeRuntime()
          runtime?.onMessage.removeListener(progressListener)
          setState((prev) => ({
            phase: "done",
            summary: message.results ?? { success: 0, failed: 0, matches_new: 0 },
            clubs: prev.phase === "running" ? prev.clubs : clubs,
          }))
        }
      }

      const runtime = getChromeRuntime()
      if (isExtensionAvailable() && runtime) {
        runtime.onMessage.addListener(progressListener)
        runtime.sendMessage(
          EXTENSION_ID,
          { type: "START_COLLECT", runId: run_id, token, targets, backendBase: BACKEND_BASE },
          (response) => {
            if (runtime.lastError || !response?.ok) {
              runtime.onMessage.removeListener(progressListener)
              setState({
                phase: "error",
                message: "Extensão não respondeu. Verifique se está instalada e ativa.",
              })
            }
          }
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      setState({ phase: "error", message: msg })
    }
  }, [state.phase])

  const canCollect =
    extensionOk === true && state.phase !== "running" && state.phase !== "starting"

  return (
    <div className="space-y-4">
      {/* Status da extensão */}
      {extensionOk === false && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">Extensão PIT Collect não detectada</p>
                <p className="text-foreground-secondary">
                  Instale a extensão em{" "}
                  <code className="rounded bg-muted px-1">chrome://extensions</code> → &quot;Carregar
                  sem compactação&quot; → pasta{" "}
                  <code className="rounded bg-muted px-1">chrome-extension/</code>
                </p>
                <p className="text-foreground-secondary">
                  Após instalar, adicione o ID da extensão em{" "}
                  <code className="rounded bg-muted px-1">NEXT_PUBLIC_PIT_EXTENSION_ID</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão de coleta */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Campeonatos Ativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground-secondary">
            Coleta partidas recentes de todos os clubes em campeonatos com status{" "}
            <span className="font-mono text-xs">confirmed</span> ou{" "}
            <span className="font-mono text-xs">in_progress</span>, usando os cookies EA do seu
            browser.
          </p>

          <Button
            onClick={handleCollect}
            disabled={!canCollect}
            className="gap-2"
          >
            {state.phase === "starting" || state.phase === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {state.phase === "starting"
              ? "Iniciando..."
              : state.phase === "running"
                ? "Coletando..."
                : "Atualizar campeonatos ativos"}
          </Button>
        </CardContent>
      </Card>

      {/* Progresso por clube */}
      {(state.phase === "running" || state.phase === "done") && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {state.phase === "done" ? "Resultado" : "Progresso"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {state.clubs.map((club) => (
                <li
                  key={club.ea_club_id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {club.status === "pending" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    {club.status === "success" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                    {club.status === "failed" && (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className="font-mono text-xs text-foreground">{club.ea_club_id}</span>
                  </div>
                  <div className="text-xs text-foreground-secondary">
                    {club.status === "success" && `+${club.matches_new ?? 0} partidas`}
                    {club.status === "failed" && (
                      <span className="text-red-400" title={club.error}>
                        falhou
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {state.phase === "done" && (
              <div className="mt-4 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm">
                <p className="text-foreground-secondary">
                  <span className="font-medium text-green-500">{state.summary.success}</span>{" "}
                  clubes coletados ·{" "}
                  <span className="font-medium text-primary">{state.summary.matches_new}</span>{" "}
                  partidas novas ·{" "}
                  {state.summary.failed > 0 && (
                    <span className="font-medium text-red-500">{state.summary.failed} falhos</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Erro */}
      {state.phase === "error" && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-foreground">{state.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

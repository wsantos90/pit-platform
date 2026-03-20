import { useCallback, useEffect, useState } from "react"

const EXTENSION_ID = process.env.NEXT_PUBLIC_PIT_EXTENSION_ID ?? ""
const BACKEND_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://pit-platform.vercel.app"

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

export type CollectState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "running"; runId: string; clubs: ClubProgress[] }
  | { phase: "done"; summary: RunSummary; clubs: ClubProgress[] }
  | { phase: "error"; message: string }

function getChromeRuntime(): ChromeRuntime | null {
  const maybeChrome = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome
  return maybeChrome?.runtime ?? null
}

function isExtensionAvailable() {
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

export function useCollectTab() {
  const [state, setState] = useState<CollectState>({ phase: "idle" })
  const [extensionOk, setExtensionOk] = useState<boolean | null>(null)
  const [isCheckingExtension, setIsCheckingExtension] = useState(false)

  const refreshExtensionStatus = useCallback(async () => {
    setIsCheckingExtension(true)
    setExtensionOk(await pingExtension())
    setIsCheckingExtension(false)
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => void refreshExtensionStatus())
  }, [refreshExtensionStatus])

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

      const progressListener = (message: ExtensionMessage) => {
        if (message.runId !== run_id) return

        if (message.type === "COLLECT_PROGRESS") {
          setState((prev) => {
            if (prev.phase !== "running") return prev
            return {
              ...prev,
              clubs: prev.clubs.map((club) =>
                club.ea_club_id === message.eaClubId
                  ? {
                      ...club,
                      status: message.status === "success" ? "success" : "failed",
                      matches_new: message.matches_new,
                      error: message.error,
                    }
                  : club
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
                message: "Extensao nao respondeu. Verifique se a PIT Collect 1.1.0 esta instalada e ativa.",
              })
            }
          }
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido"
      setState({ phase: "error", message })
    }
  }, [state.phase])

  return {
    canCollect: extensionOk === true && state.phase !== "running" && state.phase !== "starting",
    extensionOk,
    handleCollect,
    isCheckingExtension,
    refreshExtensionStatus,
    state,
  }
}

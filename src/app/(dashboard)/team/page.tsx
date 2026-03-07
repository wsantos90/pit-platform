"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { RoleGuard } from "@/components/layout/RoleGuard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTeam } from "@/hooks/useTeam"

type CollectRunResponse = {
  run_id: string
  matches_new: number
  matches_skipped: number
  players_linked: number
}

type CollectErrorResponse = {
  error?: string
  retry_after_seconds?: number
}

type ToastState = {
  id: number
  variant: "success" | "error"
  message: string
}

const MANUAL_COOLDOWN_MS = 30 * 60 * 1000

function formatCountdown(remainingMs: number) {
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("pt-BR")
}

export default function TeamPage() {
  const { team, loading } = useTeam()
  const [isCollecting, setIsCollecting] = useState(false)
  const [lastClickAt, setLastClickAt] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const storageKey = useMemo(
    () => (team?.ea_club_id ? `pit_collect_${team.ea_club_id}_last` : null),
    [team?.ea_club_id]
  )

  const showToast = useCallback((variant: ToastState["variant"], message: string) => {
    setToast({
      id: Date.now(),
      variant,
      message,
    })

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 4500)
  }, [])

  useEffect(() => {
    if (!storageKey) {
      setLastClickAt(null)
      return
    }

    const rawValue = window.localStorage.getItem(storageKey)
    const parsed = rawValue ? Number(rawValue) : Number.NaN
    setLastClickAt(Number.isFinite(parsed) ? parsed : null)
  }, [storageKey])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const cooldownRemainingMs = useMemo(() => {
    if (!lastClickAt) return 0
    const elapsedMs = currentTime - lastClickAt
    return Math.max(0, MANUAL_COOLDOWN_MS - elapsedMs)
  }, [currentTime, lastClickAt])

  const isCooldownActive = cooldownRemainingMs > 0
  const isButtonDisabled = loading || !team || isCollecting || isCooldownActive

  const updateLocalCooldown = useCallback(
    (timestampMs: number) => {
      setLastClickAt(timestampMs)
      if (storageKey) {
        window.localStorage.setItem(storageKey, String(timestampMs))
      }
    },
    [storageKey]
  )

  const handleCollect = useCallback(async () => {
    if (!team?.ea_club_id || isCollecting) return

    const now = Date.now()
    updateLocalCooldown(now)
    setIsCollecting(true)

    try {
      const response = await fetch("/api/collect/run", {
        method: "POST",
        cache: "no-store",
      })

      const body = (await response.json().catch(() => null)) as
        | CollectRunResponse
        | CollectErrorResponse
        | null

      if (!response.ok) {
        const errorBody = (body ?? {}) as CollectErrorResponse
        const retryAfterSeconds =
          typeof errorBody.retry_after_seconds === "number"
            ? errorBody.retry_after_seconds
            : null

        if (response.status === 429 && retryAfterSeconds !== null) {
          const timestampFromRetry = Date.now() - MANUAL_COOLDOWN_MS + retryAfterSeconds * 1000
          updateLocalCooldown(timestampFromRetry)
        }

        if (errorBody.error === "rate_limited" && retryAfterSeconds !== null) {
          showToast(
            "error",
            `Limite de coleta atingido. Tente novamente em ${Math.ceil(retryAfterSeconds / 60)} min.`
          )
          return
        }

        showToast("error", "Nao foi possivel atualizar os dados do time.")
        return
      }

      const payload = body as CollectRunResponse
      showToast(
        "success",
        `Coleta concluida. Novas: ${payload.matches_new}. Ignoradas: ${payload.matches_skipped}.`
      )
    } catch {
      showToast("error", "Falha de rede ao executar a coleta manual.")
    } finally {
      setIsCollecting(false)
    }
  }, [isCollecting, showToast, team?.ea_club_id, updateLocalCooldown])

  return (
    <RoleGuard requiredRoles={["manager", "moderator", "admin"]}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-4 md:px-6 md:py-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Time</h1>
          <p className="text-sm text-foreground-secondary">
            Execute uma coleta manual para atualizar os dados de partidas.
          </p>
        </header>

        <Card className="rounded-xl border border-border bg-card">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-semibold">Coleta de Partidas</CardTitle>
            <p className="text-sm text-foreground-secondary">
              {team
                ? `Clube ativo: ${team.display_name} (EA ID ${team.ea_club_id})`
                : "Nenhum clube ativo encontrado para este usuario."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void handleCollect()} disabled={isButtonDisabled}>
                {isCollecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isCollecting
                  ? "Atualizando..."
                  : isCooldownActive
                    ? `Aguardar ${formatCountdown(cooldownRemainingMs)}`
                    : "Atualizar Dados"}
              </Button>
            </div>

            <div className="space-y-1 text-sm text-foreground-secondary">
              <p>Ultima coleta do clube: {formatDateTime(team?.last_scanned_at)}</p>
              <p>Cooldown local: {isCooldownActive ? formatCountdown(cooldownRemainingMs) : "disponivel"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {toast ? (
        <div className="pointer-events-none fixed right-4 top-4 z-50">
          <div
            className={`rounded-md border px-4 py-3 text-sm shadow-lg ${
              toast.variant === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
            key={toast.id}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </RoleGuard>
  )
}


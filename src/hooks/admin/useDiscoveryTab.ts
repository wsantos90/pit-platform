import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type DiscoveryRunStatus = "running" | "completed" | "failed" | "cancelled" | "success"

export type DiscoveryRun = {
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

export type DiscoveryHealthPayload = {
  ea_fetch_transport: "direct" | "browser_proxy"
  cookie_service_configured: boolean
  service_health: {
    ok: boolean
    error: string | null
    http_status: number | null
    status: string | null
    last_execution: string | null
    next_execution: string | null
    cache: {
      has_cookie: boolean | null
    }
    renewal: {
      last_error: string | null
    }
    fallback: {
      browserless_configured: boolean | null
    }
  }
  ea_fetch_health: {
    ok: boolean
    error: string | null
    http_status: number | null
    stage: string | null
    resolved_by: string | null
    used_cached_cookie: boolean | null
    upstream_status: number | null
    content_type: string | null
    body_snippet: string | null
    last_error: string | null
    cache: {
      has_cookie: boolean | null
    }
  }
}

export function useDiscoveryTab() {
  const [runs, setRuns] = useState<DiscoveryRun[]>([])
  const [health, setHealth] = useState<DiscoveryHealthPayload | null>(null)
  const [isLoadingRuns, setIsLoadingRuns] = useState(true)
  const [isLoadingHealth, setIsLoadingHealth] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isStartingScan, setIsStartingScan] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchRuns = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false

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
      if (!silent) {
        setIsLoadingRuns(false)
      }
    }
  }, [])

  const fetchHealth = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false

    try {
      const response = await fetch("/api/admin/discovery-health", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "failed_to_load_discovery_health")
      }

      const payload = (await response.json()) as DiscoveryHealthPayload
      setHealth(payload)
      setHealthError(null)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "failed_to_load_discovery_health"
      setHealthError(message)
    } finally {
      if (!silent) {
        setIsLoadingHealth(false)
      }
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([fetchRuns({ silent: true }), fetchHealth({ silent: true })])
    setIsRefreshing(false)
  }, [fetchHealth, fetchRuns])

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
        | { processed?: number; failed?: number; error?: string; message?: string }
        | null

      if (!response.ok) {
        throw new Error(body?.error ?? "failed_to_execute_discovery_scan")
      }

      const processed = body?.processed ?? 0
      const failed = body?.failed ?? 0
      setFeedback(
        body?.message ?? `Varredura concluida. Processados: ${processed}. Falhas: ${failed}.`
      )
      await Promise.all([fetchRuns({ silent: true }), fetchHealth({ silent: true })])
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : "failed_to_execute_discovery_scan"
      setError(message)
    } finally {
      setIsStartingScan(false)
    }
  }, [fetchHealth, fetchRuns])

  useEffect(() => {
    void Promise.all([fetchRuns(), fetchHealth()])
  }, [fetchHealth, fetchRuns])

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

  const needsCookieSyncHelp =
    health?.ea_fetch_transport === "browser_proxy" &&
    (!health.cookie_service_configured ||
      !health.service_health.ok ||
      health.service_health.status === "degraded" ||
      health.service_health.cache.has_cookie === false ||
      health.ea_fetch_health.cache.has_cookie === false ||
      !health.ea_fetch_health.ok)

  return {
    error,
    feedback,
    health,
    healthError,
    isLoading: isLoadingRuns || isLoadingHealth,
    isRealtimeConnected,
    isRefreshing,
    isStartingScan,
    needsCookieSyncHelp,
    refreshAll,
    runs,
    startScan,
  }
}

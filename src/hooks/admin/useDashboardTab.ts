import { useEffect, useMemo, useState } from "react"
import { DollarSign, ShieldUser, Trophy, Users, type LucideIcon } from "lucide-react"

export type RevenueMonthlyPoint = {
  month: string
  total: number
}

type DashboardMetricsResponse = {
  clubs: number
  players: number
  revenue: number
  tournaments: number
  revenueMonthly: RevenueMonthlyPoint[]
}

type DashboardCard = {
  title: string
  value: string
  icon: LucideIcon
}

const REFRESH_INTERVAL_MS = 30_000

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat("pt-BR")

function formatMonthLabel(monthKey: string) {
  const parsedDate = new Date(`${monthKey}-01T00:00:00Z`)
  if (Number.isNaN(parsedDate.getTime())) return monthKey
  return parsedDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
}

export function useDashboardTab() {
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/admin/metrics", {
          method: "GET",
          cache: "no-store",
        })

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error ?? "failed_to_load_admin_metrics")
        }

        const payload = (await response.json()) as DashboardMetricsResponse
        if (!cancelled) {
          setMetrics(payload)
          setError(null)
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "failed_to_load_admin_metrics"
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchMetrics()
    const intervalId = window.setInterval(() => {
      void fetchMetrics()
    }, REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  const chartData = useMemo(() => {
    const points = metrics?.revenueMonthly ?? []
    return points.slice(-12).map((point) => ({
      ...point,
      label: formatMonthLabel(point.month),
    }))
  }, [metrics?.revenueMonthly])

  const cards = useMemo<DashboardCard[]>(
    () => [
      {
        title: "Times Ativos",
        value: integerFormatter.format(metrics?.clubs ?? 0),
        icon: ShieldUser,
      },
      {
        title: "Jogadores Ativos",
        value: integerFormatter.format(metrics?.players ?? 0),
        icon: Users,
      },
      {
        title: "Receita Total",
        value: currencyFormatter.format(metrics?.revenue ?? 0),
        icon: DollarSign,
      },
      {
        title: "Torneios",
        value: integerFormatter.format(metrics?.tournaments ?? 0),
        icon: Trophy,
      },
    ],
    [metrics]
  )

  return {
    cards,
    chartData,
    error,
    isLoading,
    metrics,
  }
}

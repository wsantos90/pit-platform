import { NextResponse } from "next/server"
import { requireAdmin } from "@/app/api/admin/_auth"
import { createAdminClient } from "@/lib/supabase/admin"

type FinancialRow = {
  period: string
  total_revenue: string | number | null
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function monthKey(period: string) {
  const parsedDate = new Date(period)
  if (Number.isNaN(parsedDate.getTime())) return null
  const year = parsedDate.getUTCFullYear()
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const adminClient = createAdminClient()

  const [clubsResult, playersResult, tournamentsResult, financialResult] = await Promise.all([
    adminClient.from("clubs").select("*", { count: "exact", head: true }).eq("status", "active"),
    adminClient.from("players").select("*", { count: "exact", head: true }).eq("status", "active"),
    adminClient
      .from("tournaments")
      .select("*", { count: "exact", head: true })
      .in("status", ["confirmed", "in_progress", "finished"]),
    adminClient.from("v_financial_dashboard").select("period,total_revenue").order("period", { ascending: true }).limit(4000),
  ])

  if (clubsResult.error || playersResult.error || tournamentsResult.error || financialResult.error) {
    return NextResponse.json({ error: "failed_to_load_admin_metrics" }, { status: 500 })
  }

  const monthlyTotals = new Map<string, number>()
  const financialRows = (financialResult.data ?? []) as FinancialRow[]
  for (const row of financialRows) {
    const key = monthKey(row.period)
    if (!key) continue
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + toNumber(row.total_revenue))
  }

  const revenueMonthly = Array.from(monthlyTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month,
      total: Number(total.toFixed(2)),
    }))

  const revenue = Number(
    revenueMonthly.reduce((acc, item) => acc + item.total, 0).toFixed(2)
  )

  return NextResponse.json({
    clubs: clubsResult.count ?? 0,
    players: playersResult.count ?? 0,
    revenue,
    tournaments: tournamentsResult.count ?? 0,
    revenueMonthly,
  })
}

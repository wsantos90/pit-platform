import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/app/api/admin/_auth"
import { createAdminClient } from "@/lib/supabase/admin"

const periodSchema = z.enum(["30d", "90d", "12m"])
type FinancialPeriod = z.infer<typeof periodSchema>

const periodLimit: Record<FinancialPeriod, number> = {
  "30d": 30,
  "90d": 90,
  "12m": 365,
}

type FinancialRow = {
  period: string
  total_revenue: string | number | null
  total_refunded: string | number | null
  total_pending: string | number | null
  tournament_revenue: string | number | null
  subscription_revenue: string | number | null
  overdue_count: number | null
}

type OverduePaymentRow = {
  club_id: string
  amount: string | number
  created_at: string
}

type ClubRow = {
  id: string
  display_name: string
}

type TrustScoreRow = {
  club_id: string
  strikes: number
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const parsedPeriod = periodSchema.safeParse(request.nextUrl.searchParams.get("period") ?? "30d")
  if (!parsedPeriod.success) {
    return NextResponse.json({ error: "invalid_period" }, { status: 400 })
  }

  const period = parsedPeriod.data
  const limit = periodLimit[period]
  const adminClient = createAdminClient()

  const { data: rawFinancialRows, error: financialError } = await adminClient
    .from("v_financial_dashboard")
    .select("period,total_revenue,total_refunded,total_pending,tournament_revenue,subscription_revenue,overdue_count")
    .order("period", { ascending: false })
    .limit(limit)

  if (financialError) {
    return NextResponse.json({ error: "failed_to_load_financial_dashboard" }, { status: 500 })
  }

  const timeline = ((rawFinancialRows ?? []) as FinancialRow[])
    .map((row) => ({
      period: row.period,
      total_revenue: toNumber(row.total_revenue),
      total_refunded: toNumber(row.total_refunded),
      total_pending: toNumber(row.total_pending),
      tournament_revenue: toNumber(row.tournament_revenue),
      subscription_revenue: toNumber(row.subscription_revenue),
      overdue_count: row.overdue_count ?? 0,
    }))
    .reverse()

  const summary = {
    revenue_total: Number(timeline.reduce((acc, row) => acc + row.total_revenue, 0).toFixed(2)),
    refunded_total: Number(timeline.reduce((acc, row) => acc + row.total_refunded, 0).toFixed(2)),
    pending_total: Number(timeline.reduce((acc, row) => acc + row.total_pending, 0).toFixed(2)),
    overdue_count_total: timeline.reduce((acc, row) => acc + row.overdue_count, 0),
  }

  const recentWindow = timeline.slice(-30)
  const projection30d = Number(
    (average(recentWindow.map((row) => row.total_revenue)) * 30).toFixed(2)
  )

  const { data: overduePayments, error: overduePaymentsError } = await adminClient
    .from("payments")
    .select("club_id,amount,created_at")
    .eq("status", "overdue")
    .order("created_at", { ascending: true })
    .limit(5000)

  if (overduePaymentsError) {
    return NextResponse.json({ error: "failed_to_load_overdue_payments" }, { status: 500 })
  }

  const overdueRows = (overduePayments ?? []) as OverduePaymentRow[]
  const overdueByClub = new Map<string, { total: number; oldestAt: string }>()
  for (const payment of overdueRows) {
    const current = overdueByClub.get(payment.club_id)
    const amount = toNumber(payment.amount)
    if (!current) {
      overdueByClub.set(payment.club_id, {
        total: amount,
        oldestAt: payment.created_at,
      })
      continue
    }

    overdueByClub.set(payment.club_id, {
      total: current.total + amount,
      oldestAt: current.oldestAt < payment.created_at ? current.oldestAt : payment.created_at,
    })
  }

  const delinquentClubIds = Array.from(overdueByClub.keys())
  if (delinquentClubIds.length === 0) {
    return NextResponse.json({
      period,
      summary,
      projection_30d: projection30d,
      timeline,
      delinquent_clubs: [],
    })
  }

  const [{ data: clubs, error: clubsError }, { data: trustScores, error: trustScoresError }] = await Promise.all([
    adminClient.from("clubs").select("id,display_name").in("id", delinquentClubIds),
    adminClient.from("trust_scores").select("club_id,strikes").in("club_id", delinquentClubIds),
  ])

  if (clubsError || trustScoresError) {
    return NextResponse.json({ error: "failed_to_load_delinquent_clubs" }, { status: 500 })
  }

  const clubsMap = new Map(((clubs ?? []) as ClubRow[]).map((club) => [club.id, club]))
  const trustMap = new Map(((trustScores ?? []) as TrustScoreRow[]).map((row) => [row.club_id, row.strikes]))

  const now = Date.now()
  const delinquentClubs = delinquentClubIds
    .map((clubId) => {
      const overdueData = overdueByClub.get(clubId)
      if (!overdueData) return null

      const oldestTimestamp = new Date(overdueData.oldestAt).getTime()
      const daysOverdue = Number.isNaN(oldestTimestamp)
        ? 0
        : Math.max(0, Math.floor((now - oldestTimestamp) / (1000 * 60 * 60 * 24)))

      return {
        club_id: clubId,
        club_name: clubsMap.get(clubId)?.display_name ?? "Clube sem nome",
        days_overdue: daysOverdue,
        overdue_amount: Number(overdueData.total.toFixed(2)),
        strikes: trustMap.get(clubId) ?? 0,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.days_overdue - a.days_overdue)

  return NextResponse.json({
    period,
    summary,
    projection_30d: projection30d,
    timeline,
    delinquent_clubs: delinquentClubs,
  })
}

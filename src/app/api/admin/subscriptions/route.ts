import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/app/api/admin/_auth"
import { createAdminClient } from "@/lib/supabase/admin"

const subscriptionStatuses = ["active", "cancelled", "expired", "past_due"] as const
const subscriptionStatusSchema = z.enum(subscriptionStatuses)

type SubscriptionStatus = (typeof subscriptionStatuses)[number]

type SubscriptionRow = {
  id: string
  user_id: string | null
  club_id: string | null
  plan: string
  status: SubscriptionStatus
  gateway: string
  gateway_subscription_id: string | null
  amount: string | number
  current_period_start: string
  current_period_end: string
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

type UserRow = {
  id: string
  display_name: string | null
  email: string | null
}

type ClubRow = {
  id: string
  display_name: string
}

function asNumber(value: string | number) {
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const statusParam = request.nextUrl.searchParams.get("status")
  const parsedStatus = statusParam ? subscriptionStatusSchema.safeParse(statusParam) : null

  if (statusParam && (!parsedStatus || !parsedStatus.success)) {
    return NextResponse.json({ error: "invalid_status_filter" }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const baseQuery = adminClient
    .from("subscriptions")
    .select(
      "id,user_id,club_id,plan,status,gateway,gateway_subscription_id,amount,current_period_start,current_period_end,cancelled_at,created_at,updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(100)

  const { data: subscriptions, error: subscriptionsError, count } =
    parsedStatus && parsedStatus.success
      ? await baseQuery.eq("status", parsedStatus.data)
      : await baseQuery

  if (subscriptionsError) {
    return NextResponse.json({ error: "failed_to_load_subscriptions" }, { status: 500 })
  }

  const rows = ((subscriptions ?? []) as SubscriptionRow[]).map((subscription) => ({
    ...subscription,
    amount: asNumber(subscription.amount),
  }))

  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((value): value is string => Boolean(value))))
  const clubIds = Array.from(new Set(rows.map((row) => row.club_id).filter((value): value is string => Boolean(value))))

  let usersById = new Map<string, UserRow>()
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await adminClient
      .from("users")
      .select("id,display_name,email")
      .in("id", userIds)

    if (usersError) {
      return NextResponse.json({ error: "failed_to_load_subscription_users" }, { status: 500 })
    }

    usersById = new Map(((users ?? []) as UserRow[]).map((user) => [user.id, user]))
  }

  let clubsById = new Map<string, ClubRow>()
  if (clubIds.length > 0) {
    const { data: clubs, error: clubsError } = await adminClient
      .from("clubs")
      .select("id,display_name")
      .in("id", clubIds)

    if (clubsError) {
      return NextResponse.json({ error: "failed_to_load_subscription_clubs" }, { status: 500 })
    }

    clubsById = new Map(((clubs ?? []) as ClubRow[]).map((club) => [club.id, club]))
  }

  const enrichedSubscriptions = rows.map((subscription) => {
    const user = subscription.user_id ? usersById.get(subscription.user_id) : null
    const club = subscription.club_id ? clubsById.get(subscription.club_id) : null

    return {
      ...subscription,
      user_display_name: user?.display_name ?? null,
      user_email: user?.email ?? null,
      club_name: club?.display_name ?? null,
    }
  })

  return NextResponse.json({
    subscriptions: enrichedSubscriptions,
    meta: {
      total_count: count ?? enrichedSubscriptions.length,
      source: "subscriptions",
      warning: enrichedSubscriptions.length === 0 ? "subscriptions_table_empty" : null,
    },
  })
}

import { NextResponse } from "next/server"
import { requireAdmin } from "@/app/api/admin/_auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("discovery_runs")
    .select("id,started_at,finished_at,status,clubs_scanned,clubs_new,players_found,error_message")
    .order("started_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: "failed_to_load_discovery_runs" }, { status: 500 })
  }

  return NextResponse.json({
    runs: data ?? [],
  })
}

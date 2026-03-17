import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseMatches } from "@/lib/ea/parser"
import { persistMatchesForClub } from "@/lib/collect/persistMatches"
import { loadMatchClassificationContext } from "@/lib/collect/loadMatchClassificationContext"

const schema = z.object({
  ea_club_id: z.string().trim().min(1),
  raw_data: z.unknown(),
})

/**
 * POST /api/admin/ingest-raw
 * Ingere dados brutos da EA API para um clube sem precisar de sessão de browser.
 * Protegido por x-webhook-secret (mesmo segredo do n8n).
 *
 * Body: { ea_club_id: string, raw_data: <array de partidas da EA API> }
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret")
  if (!process.env.N8N_WEBHOOK_SECRET || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const { ea_club_id, raw_data } = parsed.data

  try {
    const adminClient = createAdminClient()
    const matches = parseMatches(raw_data, ea_club_id)
    const ctx = await loadMatchClassificationContext(adminClient)
    const result = await persistMatchesForClub(ea_club_id, matches, adminClient, ctx)

    return NextResponse.json({
      ea_club_id,
      matches_parsed: matches.length,
      matches_new: result.matchesNew,
      matches_skipped: result.matchesSkipped,
      players_linked: result.playersLinked,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

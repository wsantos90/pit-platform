import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/app/api/admin/_auth"
import { createAdminClient } from "@/lib/supabase/admin"

const adminConfigKeys = [
  "discovery_batch_size",
  "discovery_rate_limit_ms",
  "max_claims_per_club",
  "tournament_entry_fee_brl",
] as const

type AdminConfigKey = (typeof adminConfigKeys)[number]

const patchSettingsSchema = z.object({
  key: z.enum(adminConfigKeys),
  value: z.unknown(),
})

const integerSettingSchema = z.coerce.number().int().min(1).max(10000)
const entryFeeSchema = z.coerce.number().min(0).max(100000)

const settingsDescription: Record<AdminConfigKey, string> = {
  discovery_batch_size: "Clubes por batch no discovery",
  discovery_rate_limit_ms: "Delay entre batches (ms)",
  max_claims_per_club: "Max tentativas de claim por clube",
  tournament_entry_fee_brl: "Taxa default de entrada em torneios",
}

function parseSettingValue(key: AdminConfigKey, rawValue: unknown) {
  if (key === "tournament_entry_fee_brl") {
    const parsed = entryFeeSchema.safeParse(rawValue)
    if (!parsed.success) return parsed
    return {
      success: true as const,
      data: Number(parsed.data.toFixed(2)),
    }
  }

  return integerSettingSchema.safeParse(rawValue)
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("admin_config")
    .select("key,value,description,updated_at,updated_by")
    .order("key", { ascending: true })

  if (error) {
    return NextResponse.json({ error: "failed_to_load_admin_settings" }, { status: 500 })
  }

  return NextResponse.json({
    settings: data ?? [],
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const payload = await request.json().catch(() => null)
  const parsedPayload = patchSettingsSchema.safeParse(payload)

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: "invalid_payload",
        details: parsedPayload.error.flatten(),
      },
      { status: 400 }
    )
  }

  const { key, value } = parsedPayload.data
  const parsedValue = parseSettingValue(key, value)

  if (!parsedValue.success) {
    return NextResponse.json(
      {
        error: "invalid_value",
        details: parsedValue.error.flatten(),
      },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("admin_config")
    .upsert(
      {
        key,
        value: parsedValue.data,
        description: settingsDescription[key],
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      },
      { onConflict: "key" }
    )
    .select("key,value,description,updated_at,updated_by")
    .single()

  if (error) {
    return NextResponse.json({ error: "failed_to_save_admin_setting" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    setting: data,
  })
}

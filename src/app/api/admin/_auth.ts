import { NextResponse } from "next/server"
import { hasRole } from "@/lib/auth/roles"
import { createClient } from "@/lib/supabase/server"

export type AdminAuthSuccess = {
  ok: true
  user: {
    id: string
    email: string | null
  }
}

export type AdminAuthFailure = {
  ok: false
  response: NextResponse
}

type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure

type UserProfile = {
  id: string
  email: string | null
  roles: unknown
  is_active: boolean | null
}

async function loadProfileByIdOrEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string | null
) {
  const { data: byId } = await supabase
    .from("users")
    .select("id,email,roles,is_active")
    .eq("id", userId)
    .maybeSingle<UserProfile>()

  if (byId) return byId
  if (!email) return null

  const { data: byEmail } = await supabase
    .from("users")
    .select("id,email,roles,is_active")
    .eq("email", email)
    .maybeSingle<UserProfile>()

  return byEmail
}

export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  const profile = await loadProfileByIdOrEmail(supabase, user.id, user.email ?? null)
  const isActive = profile?.is_active ?? true

  if (!isActive || !hasRole(profile?.roles ?? [], "admin")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    }
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  }
}

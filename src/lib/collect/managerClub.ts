import { createClient } from "@/lib/supabase/server"
import { hasAnyRole } from "@/lib/auth/roles"
import type { UserRole } from "@/types"

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type ManagerCollectProfileRow = {
  id: string
  email: string | null
  roles: unknown
  is_active: boolean | null
}

export type ManagerCollectClubRow = {
  id: string
  display_name: string | null
  ea_club_id: string
  last_scanned_at: string | null
}

export async function loadProfileByIdOrEmail(supabase: ServerClient, userId: string, email: string | null) {
  const { data: byId } = await supabase
    .from("users")
    .select("id,email,roles,is_active")
    .eq("id", userId)
    .maybeSingle<ManagerCollectProfileRow>()

  if (byId) return byId
  if (!email) return null

  const { data: byEmail } = await supabase
    .from("users")
    .select("id,email,roles,is_active")
    .eq("email", email)
    .maybeSingle<ManagerCollectProfileRow>()

  return byEmail
}

export async function loadManagedClubForUser(supabase: ServerClient, userId: string) {
  const { data, error } = await supabase
    .from("clubs")
    .select("id,display_name,ea_club_id,last_scanned_at")
    .eq("manager_id", userId)
    .eq("status", "active")
    .maybeSingle<ManagerCollectClubRow>()

  return {
    data,
    error,
  }
}

export async function loadManagerCollectContext(
  supabase: ServerClient,
  userId: string,
  email: string | null
): Promise<{
  profile: ManagerCollectProfileRow | null
  roles: UserRole[]
  isActive: boolean
  canCollect: boolean
  managedClub: ManagerCollectClubRow | null
  managedClubError: { message?: string } | null
}> {
  const profile = await loadProfileByIdOrEmail(supabase, userId, email)
  const roles = (profile?.roles ?? []) as UserRole[]
  const isActive = profile?.is_active ?? true
  const { data: managedClub, error: managedClubError } = await loadManagedClubForUser(supabase, userId)

  return {
    profile,
    roles,
    isActive,
    canCollect: isActive && hasAnyRole(roles, ["manager", "admin"]),
    managedClub,
    managedClubError,
  }
}

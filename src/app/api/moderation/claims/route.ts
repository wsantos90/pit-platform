import { NextRequest, NextResponse } from "next/server"
import { hasAnyRole } from "@/lib/auth/roles"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { ClaimStatus, UserRole } from "@/types"

const allowedStatuses: ClaimStatus[] = ["pending", "approved", "rejected"]
type ClaimsListStatus = ClaimStatus | "all"

function parseStatusParam(raw: string | null): ClaimsListStatus | null {
  if (!raw) return "pending"
  if (raw === "all") return "all"
  if (allowedStatuses.includes(raw as ClaimStatus)) return raw as ClaimStatus
  return null
}

function parseStoredPhotoPath(photoUrl: string) {
  const normalized = photoUrl.trim()
  if (!normalized) return null

  const slashIndex = normalized.indexOf("/")
  if (slashIndex <= 0 || slashIndex >= normalized.length - 1) {
    return null
  }

  return {
    bucket: normalized.slice(0, slashIndex),
    path: normalized.slice(slashIndex + 1),
  }
}

async function signClaimPhoto(adminClient: ReturnType<typeof createAdminClient>, photoUrl: string | null) {
  if (!photoUrl) return null
  const parsed = parseStoredPhotoPath(photoUrl)
  if (!parsed) return null

  const { data, error } = await adminClient.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 60)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

async function loadCurrentUserRoles(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: byId } = await supabase.from("users").select("roles, is_active").eq("id", userId).maybeSingle()
  return {
    roles: (byId?.roles ?? []) as UserRole[],
    isActive: byId?.is_active ?? true,
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await loadCurrentUserRoles(supabase, user.id)
  if (!profile.isActive || !hasAnyRole(profile.roles, ["moderator", "admin"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const statusFilter = parseStatusParam(request.nextUrl.searchParams.get("status"))
  if (!statusFilter) {
    return NextResponse.json({ error: "status deve ser pending, approved, rejected ou all" }, { status: 400 })
  }

  let claimsQuery = supabase
    .from("claims")
    .select("id,user_id,discovered_club_id,status,photo_url,created_at,reviewed_at,reviewed_by,rejection_reason")

  if (statusFilter !== "all") {
    claimsQuery = claimsQuery.eq("status", statusFilter)
  }

  const { data: claims, error: claimsError } = await claimsQuery.order("created_at", { ascending: false }).limit(100)
  if (claimsError) {
    return NextResponse.json({ error: "Nao foi possivel carregar claims." }, { status: 500 })
  }

  if (!claims || claims.length === 0) {
    return NextResponse.json({ claims: [] })
  }

  const userIds = Array.from(new Set(claims.map((claim) => claim.user_id)))
  const discoveredClubIds = Array.from(new Set(claims.map((claim) => claim.discovered_club_id)))

  // adminClient bypasses RLS to allow cross-user lookups (moderator reading other users' data)
  const adminClient = createAdminClient()
  const [{ data: users }, { data: discoveredClubs }] = await Promise.all([
    adminClient.from("users").select("id,display_name,email").in("id", userIds),
    adminClient.from("discovered_clubs").select("id,display_name,ea_club_id,status").in("id", discoveredClubIds),
  ])

  const usersById = new Map((users ?? []).map((row) => [row.id, row]))
  const clubsById = new Map((discoveredClubs ?? []).map((row) => [row.id, row]))

  const signedUrls = await Promise.all(claims.map((claim) => signClaimPhoto(adminClient, claim.photo_url)))

  const payload = claims.map((claim, index) => {
    const claimant = usersById.get(claim.user_id)
    const club = clubsById.get(claim.discovered_club_id)
    return {
      id: claim.id,
      status: claim.status,
      photoUrl: claim.photo_url,
      photoSignedUrl: signedUrls[index] ?? null,
      createdAt: claim.created_at,
      reviewedAt: claim.reviewed_at,
      reviewedBy: claim.reviewed_by,
      rejectionReason: claim.rejection_reason,
      claimant: {
        id: claim.user_id,
        displayName: claimant?.display_name ?? null,
        email: claimant?.email ?? null,
      },
      club: {
        id: claim.discovered_club_id,
        displayName: club?.display_name ?? null,
        eaClubId: club?.ea_club_id ?? null,
        status: club?.status ?? null,
      },
    }
  })

  return NextResponse.json({ claims: payload })
}


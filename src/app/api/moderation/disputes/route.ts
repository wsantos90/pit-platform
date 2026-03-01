import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireModeratorOrAdmin } from "../_auth";

type DisputeRow = {
  id: string;
  bracket_id: string;
  tournament_id: string;
  filed_by_club: string;
  filed_by_user: string;
  against_club: string;
  reason: string;
  status: string;
  created_at: string;
};

export async function GET() {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { data: disputes, error: disputesError } = await supabase
    .from("disputes")
    .select("id,bracket_id,tournament_id,filed_by_club,filed_by_user,against_club,reason,status,created_at")
    .in("status", ["open", "under_review"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (disputesError) {
    return NextResponse.json({ error: "failed_to_load_disputes" }, { status: 500 });
  }

  const rows = (disputes ?? []) as DisputeRow[];
  if (rows.length === 0) {
    return NextResponse.json({ disputes: [] });
  }

  const tournamentIds = Array.from(new Set(rows.map((row) => row.tournament_id)));
  const clubIds = Array.from(
    new Set(rows.flatMap((row) => [row.filed_by_club, row.against_club]).filter(Boolean))
  );
  const userIds = Array.from(new Set(rows.map((row) => row.filed_by_user)));

  // adminClient for users: moderator reading other users' data bypasses RLS
  const adminClient = createAdminClient();
  const [{ data: tournaments }, { data: clubs }, { data: users }] = await Promise.all([
    supabase.from("tournaments").select("id,name").in("id", tournamentIds),
    supabase.from("clubs").select("id,display_name").in("id", clubIds),
    adminClient.from("users").select("id,display_name,email").in("id", userIds),
  ]);

  const tournamentById = new Map((tournaments ?? []).map((row) => [row.id, row.name]));
  const clubById = new Map((clubs ?? []).map((row) => [row.id, row.display_name]));
  const userById = new Map((users ?? []).map((row) => [row.id, row]));

  return NextResponse.json({
    disputes: rows.map((row) => {
      const filedByUser = userById.get(row.filed_by_user);
      return {
        id: row.id,
        bracketId: row.bracket_id,
        tournamentId: row.tournament_id,
        tournamentName: tournamentById.get(row.tournament_id) ?? null,
        filedByClubId: row.filed_by_club,
        filedByClubName: clubById.get(row.filed_by_club) ?? null,
        againstClubId: row.against_club,
        againstClubName: clubById.get(row.against_club) ?? null,
        filedByUserId: row.filed_by_user,
        filedByUserName: filedByUser?.display_name ?? null,
        filedByUserEmail: filedByUser?.email ?? null,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at,
      };
    }),
  });
}

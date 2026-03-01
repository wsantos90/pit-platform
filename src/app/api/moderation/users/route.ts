import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireModeratorOrAdmin } from "../_auth";

const querySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const parsedQuery = querySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "invalid_query", details: parsedQuery.error.flatten() },
      { status: 400 }
    );
  }

  const { q, limit } = parsedQuery.data;
  const supabase = await createClient();

  let query = supabase
    .from("users")
    .select("id,email,display_name,roles,is_active,created_at");

  if (q && q.length > 0) {
    const escaped = q.replace(/[%_]/g, "\\$&");
    query = query.or(`email.ilike.%${escaped}%,display_name.ilike.%${escaped}%`);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return NextResponse.json({ error: "failed_to_load_users" }, { status: 500 });
  }

  return NextResponse.json({
    users: (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      roles: row.roles ?? [],
      is_active: row.is_active,
      created_at: row.created_at,
    })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TournamentStatus } from "@/types";
import { requireModeratorOrAdmin } from "../_auth";

const statusValues = [
  "draft",
  "open",
  "confirmed",
  "in_progress",
  "finished",
  "cancelled",
 ] as const;

const formatValues = [
  "single_elimination",
  "group_stage_then_knockout",
  "round_robin",
 ] as const;

const typeValues = ["corujao", "league"] as const;

const createTournamentSchema = z
  .object({
    name: z.string().trim().min(3, "name must have at least 3 chars").max(80),
    type: z.enum(typeValues).default("corujao"),
    format: z.enum(formatValues).default("single_elimination"),
    capacity_min: z.coerce.number().int().min(2).max(128).default(8),
    capacity_max: z.coerce.number().int().min(2).max(128).default(32),
    group_count: z.coerce.number().int().min(2).max(32).optional().nullable(),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/),
    entry_fee: z.coerce.number().min(0).max(99999).default(3),
  })
  .superRefine((value, context) => {
    if (value.capacity_max < value.capacity_min) {
      context.addIssue({
        code: "custom",
        path: ["capacity_max"],
        message: "capacity_max must be >= capacity_min",
      });
    }

    if (value.format === "group_stage_then_knockout" && !value.group_count) {
      context.addIssue({
        code: "custom",
        path: ["group_count"],
        message: "group_count is required for group_stage_then_knockout",
      });
    }
  });

function parseStatusFilter(raw: string | null): TournamentStatus | "all" | null {
  if (!raw) return "all";
  if (raw === "all") return "all";
  if (statusValues.includes(raw as TournamentStatus)) return raw as TournamentStatus;
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const statusFilter = parseStatusFilter(request.nextUrl.searchParams.get("status"));
  if (!statusFilter) {
    return NextResponse.json(
      {
        error: "status must be one of draft, open, confirmed, in_progress, finished, cancelled or all",
      },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  let query = adminClient
    .from("tournaments")
    .select("id,name,type,format,status,capacity_min,capacity_max,group_count,scheduled_date,start_time,entry_fee,current_round,created_by,created_at,updated_at");

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: tournaments, error: tournamentsError } = await query
    .order("created_at", { ascending: false })
    .limit(100);
  if (tournamentsError) {
    return NextResponse.json({ error: "failed_to_load_tournaments" }, { status: 500 });
  }

  if (!tournaments || tournaments.length === 0) {
    return NextResponse.json({ tournaments: [] });
  }

  const tournamentIds = tournaments.map((row) => row.id);
  const { data: entries, error: entriesError } = await adminClient
    .from("tournament_entries")
    .select("tournament_id,club_id,payment_status,seed")
    .in("tournament_id", tournamentIds);

  if (entriesError) {
    return NextResponse.json({ error: "failed_to_load_entries" }, { status: 500 });
  }

  const counts = new Map<string, { total: number; paid: number }>();
  const clubIds = new Set<string>();
  for (const entry of entries ?? []) {
    const current = counts.get(entry.tournament_id) ?? { total: 0, paid: 0 };
    current.total += 1;
    if (entry.payment_status === "paid") current.paid += 1;
    counts.set(entry.tournament_id, current);
    if ((entry as { club_id?: string }).club_id) {
      clubIds.add((entry as { club_id: string }).club_id);
    }
  }

  let clubsById = new Map<string, string>();
  if (clubIds.size > 0) {
    const { data: clubs, error: clubsError } = await adminClient
      .from("clubs")
      .select("id,display_name")
      .in("id", Array.from(clubIds));

    if (clubsError) {
      return NextResponse.json({ error: "failed_to_load_clubs" }, { status: 500 });
    }

    clubsById = new Map((clubs ?? []).map((club) => [club.id, club.display_name]));
  }

  const entriesByTournament = new Map<
    string,
    Array<{ club_id: string; club_name: string | null; payment_status: string; seed: number | null }>
  >();
  for (const entry of entries ?? []) {
    const list = entriesByTournament.get(entry.tournament_id) ?? [];
    const clubId = (entry as { club_id?: string }).club_id;
    if (clubId) {
      list.push({
        club_id: clubId,
        club_name: clubsById.get(clubId) ?? null,
        payment_status: entry.payment_status,
        seed: (entry as { seed?: number | null }).seed ?? null,
      });
      entriesByTournament.set(entry.tournament_id, list);
    }
  }

  return NextResponse.json({
    tournaments: tournaments.map((row) => {
      const current = counts.get(row.id) ?? { total: 0, paid: 0 };
      return {
        ...row,
        entries_count: current.total,
        paid_entries_count: current.paid,
        entries: entriesByTournament.get(row.id) ?? [],
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const adminClient = createAdminClient();

  const groupCount = data.group_count ?? null;
  const teamsPerGroup =
    data.format === "group_stage_then_knockout" && groupCount
      ? Math.max(2, Math.floor(data.capacity_max / groupCount))
      : null;
  const advancePerGroup =
    data.format === "group_stage_then_knockout" && teamsPerGroup
      ? Math.max(1, Math.floor(teamsPerGroup / 2))
      : null;

  const { data: inserted, error } = await adminClient
    .from("tournaments")
    .insert({
      name: data.name,
      type: data.type,
      format: data.format,
      status: "draft",
      capacity_min: data.capacity_min,
      capacity_max: data.capacity_max,
      group_count: groupCount,
      teams_per_group: teamsPerGroup,
      advance_per_group: advancePerGroup,
      scheduled_date: data.scheduled_date,
      start_time: data.start_time,
      entry_fee: data.entry_fee,
      created_by: auth.user.id,
    })
    .select(
      "id,name,type,format,status,capacity_min,capacity_max,group_count,scheduled_date,start_time,entry_fee,current_round,created_by,created_at,updated_at"
    )
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: "failed_to_create_tournament" }, { status: 500 });
  }

  return NextResponse.json({ tournament: inserted }, { status: 201 });
}

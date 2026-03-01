import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TournamentStatus } from "@/types";
import { requireModeratorOrAdmin } from "../../_auth";

const statusUpdateSchema = z.object({
  status: z.enum(["draft", "open", "confirmed", "in_progress", "finished", "cancelled"]),
});

const statusTransitionMap: Record<TournamentStatus, TournamentStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["finished", "cancelled"],
  finished: [],
  cancelled: [],
};

type BracketProgress = {
  hasMatches: boolean;
  hasPending: boolean;
  nextRound: string | null;
  lastRound: string | null;
};

async function getBracketProgress(adminClient: ReturnType<typeof createAdminClient>, tournamentId: string): Promise<BracketProgress> {
  const { data: brackets, error } = await adminClient
    .from("tournament_brackets")
    .select("round,round_order,status")
    .eq("tournament_id", tournamentId)
    .order("round_order", { ascending: true })
    .order("match_order", { ascending: true });

  if (error || !brackets || brackets.length === 0) {
    return {
      hasMatches: false,
      hasPending: false,
      nextRound: null,
      lastRound: null,
    };
  }

  const firstPending = brackets.find((row) => row.status !== "completed") ?? null;
  const lastRound = brackets[brackets.length - 1]?.round ?? null;

  return {
    hasMatches: true,
    hasPending: Boolean(firstPending),
    nextRound: firstPending?.round ?? lastRound,
    lastRound,
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const idValidation = z.string().uuid().safeParse(id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "invalid_tournament_id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { data: currentTournament, error: currentError } = await adminClient
    .from("tournaments")
    .select("id,status,current_round")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: "failed_to_load_tournament" }, { status: 500 });
  }
  if (!currentTournament) {
    return NextResponse.json({ error: "tournament_not_found" }, { status: 404 });
  }

  const currentStatus = currentTournament.status as TournamentStatus;
  const targetStatus = parsed.data.status;

  if (targetStatus !== currentStatus) {
    const allowed = statusTransitionMap[currentStatus];
    if (!allowed.includes(targetStatus)) {
      return NextResponse.json(
        {
          error: "invalid_transition",
          currentStatus,
          targetStatus,
        },
        { status: 409 }
      );
    }
  }

  const updatePayload: Record<string, unknown> = {
    status: targetStatus,
  };

  if (targetStatus === "in_progress" || targetStatus === "finished") {
    const progress = await getBracketProgress(adminClient, id);

    if (targetStatus === "finished" && progress.hasMatches && progress.hasPending) {
      return NextResponse.json(
        {
          error: "tournament_has_pending_matches",
        },
        { status: 409 }
      );
    }

    if (targetStatus === "in_progress") {
      updatePayload.current_round = progress.nextRound ?? currentTournament.current_round ?? "round_1";
    }

    if (targetStatus === "finished") {
      updatePayload.current_round = progress.lastRound ?? progress.nextRound ?? currentTournament.current_round ?? "final";
    }
  }

  const { data: updated, error: updateError } = await adminClient
    .from("tournaments")
    .update(updatePayload)
    .eq("id", id)
    .select(
      "id,name,type,format,status,capacity_min,capacity_max,group_count,scheduled_date,start_time,entry_fee,current_round,created_by,created_at,updated_at"
    )
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "failed_to_update_tournament_status" }, { status: 500 });
  }

  return NextResponse.json({ tournament: updated });
}

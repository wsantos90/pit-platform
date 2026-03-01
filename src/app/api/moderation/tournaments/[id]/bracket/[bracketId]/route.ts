import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TournamentFormat } from "@/types";
import { requireModeratorOrAdmin } from "../../../../_auth";

const paramsSchema = z.object({
  id: z.string().uuid(),
  bracketId: z.string().uuid(),
});

const scoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0).max(99),
  awayScore: z.coerce.number().int().min(0).max(99),
});

async function syncTournamentCurrentRound(
  adminClient: ReturnType<typeof createAdminClient>,
  tournamentId: string
) {
  const { data: brackets, error } = await adminClient
    .from("tournament_brackets")
    .select("round,round_order,status")
    .eq("tournament_id", tournamentId)
    .order("round_order", { ascending: true })
    .order("match_order", { ascending: true });

  if (error || !brackets || brackets.length === 0) return;

  const firstPending = brackets.find((row) => row.status !== "completed") ?? null;
  const lastRound = brackets[brackets.length - 1]?.round ?? null;
  const nextRound = firstPending?.round ?? lastRound;
  if (!nextRound) return;

  await adminClient
    .from("tournaments")
    .update({ current_round: nextRound })
    .eq("id", tournamentId);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; bracketId: string }> }
) {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "invalid_route_params" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsedScores = scoreSchema.safeParse(body);
  if (!parsedScores.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsedScores.error.flatten() },
      { status: 400 }
    );
  }

  const { id: tournamentId, bracketId } = parsedParams.data;
  const { homeScore, awayScore } = parsedScores.data;

  const adminClient = createAdminClient();
  const { data: tournament, error: tournamentError } = await adminClient
    .from("tournaments")
    .select("id,format,status")
    .eq("id", tournamentId)
    .maybeSingle();
  if (tournamentError) {
    return NextResponse.json({ error: "failed_to_load_tournament" }, { status: 500 });
  }
  if (!tournament) {
    return NextResponse.json({ error: "tournament_not_found" }, { status: 404 });
  }

  const { data: bracket, error: bracketError } = await adminClient
    .from("tournament_brackets")
    .select(
      "id,tournament_id,round,match_order,status,home_entry_id,away_entry_id,home_club_id,away_club_id,next_bracket_id"
    )
    .eq("tournament_id", tournamentId)
    .eq("id", bracketId)
    .maybeSingle();

  if (bracketError) {
    return NextResponse.json({ error: "failed_to_load_bracket" }, { status: 500 });
  }
  if (!bracket) {
    return NextResponse.json({ error: "bracket_not_found" }, { status: 404 });
  }
  if (bracket.status === "completed") {
    return NextResponse.json({ error: "bracket_already_completed" }, { status: 409 });
  }
  if (!bracket.home_entry_id || !bracket.away_entry_id) {
    return NextResponse.json({ error: "bracket_missing_teams" }, { status: 409 });
  }

  const format = tournament.format as TournamentFormat;
  const tie = homeScore === awayScore;
  const tieAllowed = format === "round_robin" || format === "group_stage_then_knockout";
  if (tie && !tieAllowed) {
    return NextResponse.json({ error: "tie_not_allowed_for_format" }, { status: 400 });
  }

  let winnerEntryId: string | null = null;
  let winnerClubId: string | null = null;
  let loserEntryId: string | null = null;
  if (!tie) {
    const homeWins = homeScore > awayScore;
    winnerEntryId = homeWins ? bracket.home_entry_id : bracket.away_entry_id;
    winnerClubId = homeWins ? bracket.home_club_id : bracket.away_club_id;
    loserEntryId = homeWins ? bracket.away_entry_id : bracket.home_entry_id;
  }

  const { error: updateBracketError } = await adminClient
    .from("tournament_brackets")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      winner_entry_id: winnerEntryId,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", bracketId)
    .eq("tournament_id", tournamentId);

  if (updateBracketError) {
    return NextResponse.json({ error: "failed_to_update_bracket" }, { status: 500 });
  }

  if (winnerEntryId && bracket.next_bracket_id) {
    const { data: nextBracket, error: nextBracketError } = await adminClient
      .from("tournament_brackets")
      .select("id,home_entry_id,away_entry_id")
      .eq("id", bracket.next_bracket_id)
      .maybeSingle();

    if (nextBracketError) {
      return NextResponse.json({ error: "failed_to_load_next_bracket" }, { status: 500 });
    }
    if (nextBracket) {
      const targetSlot: "home" | "away" = bracket.match_order % 2 === 1 ? "home" : "away";
      if (targetSlot === "home" && nextBracket.home_entry_id && nextBracket.home_entry_id !== winnerEntryId) {
        return NextResponse.json({ error: "next_bracket_slot_conflict" }, { status: 409 });
      }
      if (targetSlot === "away" && nextBracket.away_entry_id && nextBracket.away_entry_id !== winnerEntryId) {
        return NextResponse.json({ error: "next_bracket_slot_conflict" }, { status: 409 });
      }

      const patch: Record<string, unknown> =
        targetSlot === "home"
          ? { home_entry_id: winnerEntryId, home_club_id: winnerClubId }
          : { away_entry_id: winnerEntryId, away_club_id: winnerClubId };

      const { error: advanceError } = await adminClient
        .from("tournament_brackets")
        .update(patch)
        .eq("id", nextBracket.id);
      if (advanceError) {
        return NextResponse.json({ error: "failed_to_advance_winner" }, { status: 500 });
      }
    }
  }

  if (loserEntryId && format !== "round_robin") {
    await adminClient
      .from("tournament_entries")
      .update({ eliminated_at: bracket.round })
      .eq("id", loserEntryId)
      .eq("tournament_id", tournamentId);
  }

  await syncTournamentCurrentRound(adminClient, tournamentId);

  return NextResponse.json({
    success: true,
    winner_entry_id: winnerEntryId,
    tie,
  });
}

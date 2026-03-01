import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TournamentFormat, TournamentStatus } from "@/types";
import { requireModeratorOrAdmin } from "../../../_auth";

type EntryRow = {
  id: string;
  club_id: string;
  seed: number | null;
  created_at: string;
  payment_status: string;
};

type BracketInsertRow = {
  id: string;
  tournament_id: string;
  round: string;
  round_order: number;
  match_order: number;
  home_entry_id: string | null;
  away_entry_id: string | null;
  home_club_id: string | null;
  away_club_id: string | null;
  winner_entry_id: string | null;
  status: "scheduled" | "completed";
  completed_at: string | null;
  next_bracket_id: string | null;
};

type GroupAssignment = {
  entryId: string;
  groupLetter: string;
};

type GeneratorResult = {
  rows: BracketInsertRow[];
  currentRound: string;
  groupAssignments: GroupAssignment[];
};

const idParamSchema = z.object({
  id: z.string().uuid(),
});

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function getRoundLabel(teamsInRound: number): string {
  if (teamsInRound <= 2) return "final";
  if (teamsInRound === 4) return "semi_final";
  if (teamsInRound === 8) return "quarter_final";
  return `round_of_${teamsInRound}`;
}

function generateSingleEliminationRows(tournamentId: string, entries: EntryRow[]): GeneratorResult {
  const now = new Date().toISOString();
  const orderedEntries = entries.every((entry) => entry.seed !== null)
    ? [...entries].sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
    : shuffle(entries);

  const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(2, orderedEntries.length)));
  const firstRoundMatchCount = Math.max(1, bracketSize / 2);

  const rounds: BracketInsertRow[][] = [];
  let currentMatchCount = firstRoundMatchCount;
  let roundOrder = 1;
  while (currentMatchCount >= 1) {
    const roundLabel = getRoundLabel(currentMatchCount * 2);
    const roundRows: BracketInsertRow[] = [];
    for (let matchOrder = 1; matchOrder <= currentMatchCount; matchOrder += 1) {
      roundRows.push({
        id: randomUUID(),
        tournament_id: tournamentId,
        round: roundLabel,
        round_order: roundOrder,
        match_order: matchOrder,
        home_entry_id: null,
        away_entry_id: null,
        home_club_id: null,
        away_club_id: null,
        winner_entry_id: null,
        status: "scheduled",
        completed_at: null,
        next_bracket_id: null,
      });
    }
    rounds.push(roundRows);
    currentMatchCount = Math.floor(currentMatchCount / 2);
    roundOrder += 1;
  }

  for (let r = 0; r < rounds.length - 1; r += 1) {
    for (let i = 0; i < rounds[r].length; i += 1) {
      rounds[r][i].next_bracket_id = rounds[r + 1][Math.floor(i / 2)].id;
    }
  }

  const paddedEntries: Array<EntryRow | null> = [
    ...orderedEntries,
    ...Array(Math.max(0, bracketSize - orderedEntries.length)).fill(null),
  ];

  for (let i = 0; i < rounds[0].length; i += 1) {
    const home = paddedEntries[i * 2];
    const away = paddedEntries[i * 2 + 1];
    rounds[0][i].home_entry_id = home?.id ?? null;
    rounds[0][i].away_entry_id = away?.id ?? null;
    rounds[0][i].home_club_id = home?.club_id ?? null;
    rounds[0][i].away_club_id = away?.club_id ?? null;
  }

  function assignWinnerToNext(roundIndex: number, matchIndex: number, winner: EntryRow) {
    const nextId = rounds[roundIndex][matchIndex].next_bracket_id;
    if (!nextId) return;
    const nextRound = rounds[roundIndex + 1];
    const nextMatch = nextRound[Math.floor(matchIndex / 2)];
    const targetIsHome = matchIndex % 2 === 0;
    if (targetIsHome) {
      if (!nextMatch.home_entry_id) {
        nextMatch.home_entry_id = winner.id;
        nextMatch.home_club_id = winner.club_id;
      }
      return;
    }
    if (!nextMatch.away_entry_id) {
      nextMatch.away_entry_id = winner.id;
      nextMatch.away_club_id = winner.club_id;
    }
  }

  function sourceCannotFeed(roundIndex: number, matchIndex: number, missingSlot: "home" | "away") {
    if (roundIndex === 0) return true;
    const previousRound = rounds[roundIndex - 1];
    const feederIndex = missingSlot === "home" ? matchIndex * 2 : matchIndex * 2 + 1;
    const feeder = previousRound[feederIndex];
    if (!feeder) return true;
    if (feeder.winner_entry_id) return false;
    return !feeder.home_entry_id && !feeder.away_entry_id;
  }

  function resolveAutoWinner(roundIndex: number, matchIndex: number): boolean {
    const match = rounds[roundIndex][matchIndex];
    if (match.status === "completed") return false;
    if (match.winner_entry_id) return false;

    const homeEntry = match.home_entry_id
      ? orderedEntries.find((entry) => entry.id === match.home_entry_id) ?? null
      : null;
    const awayEntry = match.away_entry_id
      ? orderedEntries.find((entry) => entry.id === match.away_entry_id) ?? null
      : null;

    if (!homeEntry && !awayEntry) return false;

    if (homeEntry && !awayEntry && sourceCannotFeed(roundIndex, matchIndex, "away")) {
      match.winner_entry_id = homeEntry.id;
      match.status = "completed";
      match.completed_at = now;
      assignWinnerToNext(roundIndex, matchIndex, homeEntry);
      return true;
    }

    if (awayEntry && !homeEntry && sourceCannotFeed(roundIndex, matchIndex, "home")) {
      match.winner_entry_id = awayEntry.id;
      match.status = "completed";
      match.completed_at = now;
      assignWinnerToNext(roundIndex, matchIndex, awayEntry);
      return true;
    }

    return false;
  }

  let changed = true;
  let safetyCounter = 0;
  while (changed && safetyCounter < 256) {
    changed = false;
    for (let r = 0; r < rounds.length; r += 1) {
      for (let i = 0; i < rounds[r].length; i += 1) {
        if (resolveAutoWinner(r, i)) changed = true;
      }
    }
    safetyCounter += 1;
  }

  for (const round of rounds) {
    for (const match of round) {
      if (match.status === "completed") continue;
      match.status = "scheduled";
    }
  }

  return {
    rows: rounds.flat(),
    currentRound: rounds[0][0]?.round ?? "round_1",
    groupAssignments: [],
  };
}

function generateRoundRobinRows(tournamentId: string, entries: EntryRow[]): GeneratorResult {
  const shuffledEntries = shuffle(entries);
  const rows: BracketInsertRow[] = [];
  let matchOrder = 1;

  for (let i = 0; i < shuffledEntries.length; i += 1) {
    for (let j = i + 1; j < shuffledEntries.length; j += 1) {
      const home = shuffledEntries[i];
      const away = shuffledEntries[j];
      rows.push({
        id: randomUUID(),
        tournament_id: tournamentId,
        round: "round_robin",
        round_order: 1,
        match_order: matchOrder,
        home_entry_id: home.id,
        away_entry_id: away.id,
        home_club_id: home.club_id,
        away_club_id: away.club_id,
        winner_entry_id: null,
        status: "scheduled",
        completed_at: null,
        next_bracket_id: null,
      });
      matchOrder += 1;
    }
  }

  return {
    rows,
    currentRound: "round_robin",
    groupAssignments: [],
  };
}

function generateGroupStageRows(
  tournamentId: string,
  entries: EntryRow[],
  configuredGroupCount: number | null
): GeneratorResult {
  const groupCount = Math.max(2, Math.min(configuredGroupCount ?? 2, entries.length));
  const shuffledEntries = shuffle(entries);
  const groups: EntryRow[][] = Array.from({ length: groupCount }, () => []);

  shuffledEntries.forEach((entry, index) => {
    groups[index % groupCount].push(entry);
  });

  const rows: BracketInsertRow[] = [];
  const assignments: GroupAssignment[] = [];
  let matchOrderGlobal = 1;

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const letter = String.fromCharCode(65 + groupIndex);
    const groupEntries = groups[groupIndex];
    for (const entry of groupEntries) {
      assignments.push({
        entryId: entry.id,
        groupLetter: letter,
      });
    }

    for (let i = 0; i < groupEntries.length; i += 1) {
      for (let j = i + 1; j < groupEntries.length; j += 1) {
        const home = groupEntries[i];
        const away = groupEntries[j];
        rows.push({
          id: randomUUID(),
          tournament_id: tournamentId,
          round: `group_${letter}_stage`,
          round_order: groupIndex + 1,
          match_order: matchOrderGlobal,
          home_entry_id: home.id,
          away_entry_id: away.id,
          home_club_id: home.club_id,
          away_club_id: away.club_id,
          winner_entry_id: null,
          status: "scheduled",
          completed_at: null,
          next_bracket_id: null,
        });
        matchOrderGlobal += 1;
      }
    }
  }

  return {
    rows,
    currentRound: "group_stage",
    groupAssignments: assignments,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const params = await context.params;
  const parsedId = idParamSchema.safeParse(params);
  if (!parsedId.success) {
    return NextResponse.json({ error: "invalid_tournament_id" }, { status: 400 });
  }

  const tournamentId = parsedId.data.id;
  const adminClient = createAdminClient();

  const { data: brackets, error: bracketsError } = await adminClient
    .from("tournament_brackets")
    .select(
      "id,round,round_order,match_order,home_entry_id,away_entry_id,home_club_id,away_club_id,home_score,away_score,winner_entry_id,status,completed_at,next_bracket_id"
    )
    .eq("tournament_id", tournamentId)
    .order("round_order", { ascending: true })
    .order("match_order", { ascending: true });

  if (bracketsError) {
    return NextResponse.json({ error: "failed_to_load_brackets" }, { status: 500 });
  }

  if (!brackets || brackets.length === 0) {
    return NextResponse.json({ brackets: [] });
  }

  const clubIds = new Set<string>();
  for (const row of brackets) {
    if (row.home_club_id) clubIds.add(row.home_club_id);
    if (row.away_club_id) clubIds.add(row.away_club_id);
  }

  const { data: clubs } = await adminClient
    .from("clubs")
    .select("id,display_name")
    .in("id", Array.from(clubIds));
  const clubsById = new Map((clubs ?? []).map((club) => [club.id, club.display_name]));

  return NextResponse.json({
    brackets: brackets.map((row) => ({
      ...row,
      home_club_name: row.home_club_id ? clubsById.get(row.home_club_id) ?? null : null,
      away_club_name: row.away_club_id ? clubsById.get(row.away_club_id) ?? null : null,
      winner_club_name: row.winner_entry_id
        ? (() => {
            if (row.winner_entry_id === row.home_entry_id) {
              return row.home_club_id ? clubsById.get(row.home_club_id) ?? null : null;
            }
            if (row.winner_entry_id === row.away_entry_id) {
              return row.away_club_id ? clubsById.get(row.away_club_id) ?? null : null;
            }
            return null;
          })()
        : null,
    })),
  });
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const params = await context.params;
  const parsedId = idParamSchema.safeParse(params);
  if (!parsedId.success) {
    return NextResponse.json({ error: "invalid_tournament_id" }, { status: 400 });
  }
  const tournamentId = parsedId.data.id;

  const adminClient = createAdminClient();
  const { data: tournament, error: tournamentError } = await adminClient
    .from("tournaments")
    .select("id,format,status,group_count")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) {
    return NextResponse.json({ error: "failed_to_load_tournament" }, { status: 500 });
  }
  if (!tournament) {
    return NextResponse.json({ error: "tournament_not_found" }, { status: 404 });
  }

  const tournamentStatus = tournament.status as TournamentStatus;
  if (!["open", "confirmed"].includes(tournamentStatus)) {
    return NextResponse.json(
      { error: "tournament_not_ready", status: tournamentStatus },
      { status: 409 }
    );
  }

  const { data: existingBrackets, error: existingBracketsError } = await adminClient
    .from("tournament_brackets")
    .select("id")
    .eq("tournament_id", tournamentId)
    .limit(1);
  if (existingBracketsError) {
    return NextResponse.json({ error: "failed_to_validate_existing_bracket" }, { status: 500 });
  }
  if (existingBrackets && existingBrackets.length > 0) {
    return NextResponse.json({ error: "bracket_already_exists" }, { status: 409 });
  }

  const { data: entries, error: entriesError } = await adminClient
    .from("tournament_entries")
    .select("id,club_id,seed,created_at,payment_status")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (entriesError) {
    return NextResponse.json({ error: "failed_to_load_entries" }, { status: 500 });
  }

  const allEntries = (entries ?? []) as EntryRow[];
  const paidEntries = allEntries.filter((entry) => entry.payment_status === "paid");
  const eligibleEntries = paidEntries.length > 0 ? paidEntries : allEntries;

  if (eligibleEntries.length < 2) {
    return NextResponse.json(
      { error: "not_enough_entries", minimum: 2, current: eligibleEntries.length },
      { status: 400 }
    );
  }

  const format = tournament.format as TournamentFormat;
  let generated: GeneratorResult;
  if (format === "single_elimination") {
    generated = generateSingleEliminationRows(tournamentId, eligibleEntries);
  } else if (format === "round_robin") {
    generated = generateRoundRobinRows(tournamentId, eligibleEntries);
  } else {
    generated = generateGroupStageRows(tournamentId, eligibleEntries, tournament.group_count);
  }

  if (generated.rows.length === 0) {
    return NextResponse.json({ error: "failed_to_generate_bracket_rows" }, { status: 500 });
  }

  const { error: insertError } = await adminClient.from("tournament_brackets").insert(generated.rows);
  if (insertError) {
    return NextResponse.json({ error: "failed_to_insert_brackets" }, { status: 500 });
  }

  if (generated.groupAssignments.length > 0) {
    const updates = generated.groupAssignments.map((assignment) =>
      adminClient
        .from("tournament_entries")
        .update({ group_letter: assignment.groupLetter })
        .eq("id", assignment.entryId)
        .eq("tournament_id", tournamentId)
    );
    await Promise.all(updates);
  }

  const { error: tournamentUpdateError } = await adminClient
    .from("tournaments")
    .update({
      status: "confirmed",
      current_round: generated.currentRound,
    })
    .eq("id", tournamentId);

  if (tournamentUpdateError) {
    return NextResponse.json({ error: "failed_to_update_tournament_status" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    created_brackets: generated.rows.length,
    current_round: generated.currentRound,
  });
}

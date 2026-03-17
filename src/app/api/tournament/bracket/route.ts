import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tournament_id = request.nextUrl.searchParams.get('tournament_id');
  if (!tournament_id) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });

  const admin = createAdminClient();

  const { data: tournament } = await admin
    .from('tournaments')
    .select('id, name, status, current_round, format')
    .eq('id', tournament_id)
    .maybeSingle();

  if (!tournament) return NextResponse.json({ error: 'tournament_not_found' }, { status: 404 });

  const validStatuses = ['confirmed', 'in_progress', 'finished'];
  if (!validStatuses.includes(tournament.status)) {
    return NextResponse.json({ brackets: [], currentRound: null });
  }

  const { data: brackets, error } = await admin
    .from('tournament_brackets')
    .select('id, round, round_order, match_order, home_entry_id, away_entry_id, home_club_id, away_club_id, home_score, away_score, winner_entry_id, next_bracket_id, status, completed_at, match_id')
    .eq('tournament_id', tournament_id)
    .order('round_order', { ascending: true })
    .order('match_order', { ascending: true });

  if (error) return NextResponse.json({ error: 'failed_to_load_brackets' }, { status: 500 });

  // Resolve winner club from winner_entry_id via tournament_entries
  const entryIds = (brackets ?? []).map((b) => b.winner_entry_id).filter(Boolean) as string[];
  let entryToClub = new Map<string, string>();
  if (entryIds.length > 0) {
    const { data: entries } = await admin
      .from('tournament_entries')
      .select('id, club_id')
      .in('id', entryIds);
    for (const e of entries ?? []) {
      if (e.club_id) entryToClub.set(e.id, e.club_id);
    }
  }

  // Enrich with club names
  const clubIds = new Set<string>();
  for (const b of brackets ?? []) {
    if (b.home_club_id) clubIds.add(b.home_club_id);
    if (b.away_club_id) clubIds.add(b.away_club_id);
    const winnerClub = b.winner_entry_id ? entryToClub.get(b.winner_entry_id) : null;
    if (winnerClub) clubIds.add(winnerClub);
  }

  let clubNames = new Map<string, string>();
  if (clubIds.size > 0) {
    const { data: clubs } = await admin
      .from('clubs')
      .select('id, display_name')
      .in('id', Array.from(clubIds));
    clubNames = new Map((clubs ?? []).map((c) => [c.id, c.display_name]));
  }

  const enriched = (brackets ?? []).map((b) => {
    const winnerClubId = b.winner_entry_id ? (entryToClub.get(b.winner_entry_id) ?? null) : null;
    return {
      ...b,
      winner_club_id: winnerClubId,
      home_club_name: b.home_club_id ? (clubNames.get(b.home_club_id) ?? null) : null,
      away_club_name: b.away_club_id ? (clubNames.get(b.away_club_id) ?? null) : null,
      winner_club_name: winnerClubId ? (clubNames.get(winnerClubId) ?? null) : null,
    };
  });

  return NextResponse.json({ brackets: enriched, currentRound: tournament.current_round });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: tournament } = await admin
    .from('tournaments')
    .select('id, name, type, format, status, capacity_min, capacity_max, scheduled_date, start_time, entry_fee, prize_pool, current_round, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!tournament) return NextResponse.json({ error: 'tournament_not_found' }, { status: 404 });

  const { data: entries } = await admin
    .from('tournament_entries')
    .select('id, club_id, payment_status, seed, final_position, eliminated_at')
    .eq('tournament_id', id);

  const clubIds = (entries ?? []).map((e) => e.club_id).filter(Boolean) as string[];
  let clubNames = new Map<string, string>();
  if (clubIds.length > 0) {
    const { data: clubs } = await admin
      .from('clubs')
      .select('id, display_name')
      .in('id', clubIds);
    clubNames = new Map((clubs ?? []).map((c) => [c.id, c.display_name]));
  }

  const enrichedEntries = (entries ?? []).map((e) => ({
    ...e,
    club_name: e.club_id ? (clubNames.get(e.club_id) ?? null) : null,
  }));

  const paidCount = enrichedEntries.filter((e) => e.payment_status === 'paid').length;

  return NextResponse.json({
    tournament: { ...tournament, paid_entries_count: paidCount },
    entries: enrichedEntries,
  });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: tournaments, error } = await admin
    .from('tournaments')
    .select('id, name, type, format, status, capacity_min, capacity_max, scheduled_date, start_time, entry_fee, prize_pool, current_round, created_at')
    .in('status', ['open', 'confirmed', 'in_progress', 'finished'])
    .order('scheduled_date', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: 'failed_to_load_tournaments' }, { status: 500 });

  if (!tournaments || tournaments.length === 0) {
    return NextResponse.json({ tournaments: [] });
  }

  const ids = tournaments.map((t) => t.id);
  const { data: entries } = await admin
    .from('tournament_entries')
    .select('tournament_id, payment_status')
    .in('tournament_id', ids);

  const counts = new Map<string, number>();
  for (const entry of entries ?? []) {
    if (entry.payment_status === 'paid') {
      counts.set(entry.tournament_id, (counts.get(entry.tournament_id) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    tournaments: tournaments.map((t) => ({
      ...t,
      paid_entries_count: counts.get(t.id) ?? 0,
    })),
  });
}

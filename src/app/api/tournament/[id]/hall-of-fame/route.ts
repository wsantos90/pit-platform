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

  const { data: awards, error } = await admin
    .from('hall_of_fame')
    .select('award, club_id, player_id, ea_gamertag, stat_value, stat_detail')
    .eq('tournament_id', id)
    .order('award');

  if (error) return NextResponse.json({ error: 'failed_to_load_hof' }, { status: 500 });

  const clubIds = (awards ?? []).map((a) => a.club_id).filter(Boolean) as string[];
  let clubNames = new Map<string, string>();
  if (clubIds.length > 0) {
    const { data: clubs } = await admin
      .from('clubs')
      .select('id, display_name')
      .in('id', clubIds);
    clubNames = new Map((clubs ?? []).map((c) => [c.id, c.display_name]));
  }

  return NextResponse.json({
    awards: (awards ?? []).map((a) => ({
      ...a,
      club_name: a.club_id ? (clubNames.get(a.club_id) ?? null) : null,
    })),
  });
}

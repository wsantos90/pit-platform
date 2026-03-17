import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlayerPosition } from '@/types/database';

const schema = z.object({
  club_ea_id: z.string().min(1),
  gamertags: z.array(z.string().min(1)).min(1),
});

// Map EA position categories to PIT resolved positions
const EA_TO_PIT_POSITION: Record<string, PlayerPosition> = {
  goalkeeper: 'GK',
  defender: 'ZAG',
  midfielder: 'MC',
  forward: 'ATA',
};

// Protected by webhook secret — dev/admin use only
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { club_ea_id, gamertags } = parsed.data;
  const admin = createAdminClient();

  // Find the club
  const { data: club } = await admin
    .from('clubs')
    .select('id')
    .eq('ea_club_id', club_ea_id)
    .single();

  if (!club) {
    return NextResponse.json({ error: `Club with ea_club_id=${club_ea_id} not found` }, { status: 404 });
  }

  // Pre-fetch positions from match_players for all gamertags in this club
  const { data: matchPlayerRows } = await admin
    .from('match_players')
    .select('ea_gamertag, ea_position')
    .eq('ea_club_id', club_ea_id)
    .in('ea_gamertag', gamertags);

  // Build position map: gamertag → first known PIT position
  const positionMap: Record<string, PlayerPosition> = {};
  for (const row of matchPlayerRows ?? []) {
    if (row.ea_gamertag && row.ea_position && !positionMap[row.ea_gamertag]) {
      positionMap[row.ea_gamertag] = EA_TO_PIT_POSITION[row.ea_position] ?? 'MC';
    }
  }

  const results: { gamertag: string; status: string }[] = [];

  for (const gamertag of gamertags) {
    try {
      // Check if player with this gamertag already exists
      const { data: existingPlayer } = await admin
        .from('players')
        .select('id')
        .eq('ea_gamertag', gamertag)
        .maybeSingle();

      let playerId: string;

      if (existingPlayer) {
        playerId = existingPlayer.id;
        results.push({ gamertag, status: 'already_exists' });
      } else {
        // Create a fake auth user
        const safeTag = gamertag.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const email = `${safeTag}@pit.local`;

        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: { ea_gamertag: gamertag, is_seed: true },
        });

        if (authError || !authData.user) {
          results.push({ gamertag, status: `auth_error: ${authError?.message ?? 'unknown'}` });
          continue;
        }

        const authUserId = authData.user.id;

        // The trigger fn_handle_new_user auto-creates:
        //   1. public.users (from email + metadata.display_name)
        //   2. public.players (from metadata.ea_gamertag, default position MC)
        // Wait briefly for the trigger to complete
        await new Promise((r) => setTimeout(r, 800));

        // Update primary_position to correct value (trigger defaults to MC)
        const primaryPosition: PlayerPosition = positionMap[gamertag] ?? 'MC';
        await admin
          .from('players')
          .update({ primary_position: primaryPosition })
          .eq('user_id', authUserId);

        // Get the auto-created player id
        const { data: playerRow } = await admin
          .from('players')
          .select('id')
          .eq('user_id', authUserId)
          .single();

        if (!playerRow) {
          results.push({ gamertag, status: 'player_not_found_after_trigger' });
          continue;
        }

        playerId = playerRow.id;
        results.push({ gamertag, status: `created (${primaryPosition})` });
      }

      // Link to club
      await admin
        .from('club_players')
        .upsert(
          { club_id: club.id, player_id: playerId, is_active: true },
          { onConflict: 'player_id,club_id,is_active' }
        );

      // Link match_players rows
      await admin
        .from('match_players')
        .update({ player_id: playerId })
        .eq('ea_gamertag', gamertag)
        .eq('ea_club_id', club_ea_id)
        .is('player_id', null);

    } catch (err) {
      results.push({ gamertag, status: `error: ${String(err)}` });
    }
  }

  return NextResponse.json({ club_id: club.id, results });
}

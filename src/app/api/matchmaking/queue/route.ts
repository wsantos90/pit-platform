import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { runMatching } from '@/lib/matchmaking/match';
import { logger } from '@/lib/logger';

const postSchema = z.object({
  slot_time: z.string().min(1),
  custom_time: z.string().optional(),
});

const deleteSchema = z.object({
  queue_id: z.string().uuid(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id')
      .eq('manager_id', user.id)
      .single();

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const { data: entries, error } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('club_id', club.id)
      .in('status', ['waiting', 'matched', 'confirmed'])
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const baseEntries = entries ?? [];

    // For matched/confirmed entries, resolve opponent name from confrontation_chats
    const activeEntries = baseEntries.filter((e) => ['matched', 'confirmed'].includes(e.status));

    type EnrichedEntry = typeof baseEntries[0] & { opponent_name?: string; chat_id?: string };
    const enrichedEntries: EnrichedEntry[] = baseEntries.map((e) => ({ ...e }));

    if (activeEntries.length > 0) {
      const entryIds = activeEntries.map((e) => e.id);

      // Build OR filter for Supabase
      const orFilter = entryIds
        .flatMap((id) => [`queue_entry_a.eq.${id}`, `queue_entry_b.eq.${id}`])
        .join(',');

      const { data: chats } = await supabase
        .from('confrontation_chats')
        .select('id, queue_entry_a, queue_entry_b, club_a_id, club_b_id, status')
        .or(orFilter)
        .in('status', ['active', 'confirmed']);

      if (chats && chats.length > 0) {
        // Collect unique opponent club IDs
        const opponentClubIds = new Set<string>();
        for (const chat of chats) {
          const myEntry = activeEntries.find(
            (e) => e.id === chat.queue_entry_a || e.id === chat.queue_entry_b
          );
          if (!myEntry) continue;
          const isA = myEntry.id === chat.queue_entry_a;
          const opponentId = isA ? chat.club_b_id : chat.club_a_id;
          if (opponentId) opponentClubIds.add(opponentId);
        }

        // Fetch club display names in one query
        const clubMap: Record<string, string> = {};
        if (opponentClubIds.size > 0) {
          const { data: clubRows } = await supabase
            .from('clubs')
            .select('id, display_name')
            .in('id', Array.from(opponentClubIds));
          for (const c of clubRows ?? []) {
            clubMap[c.id] = c.display_name;
          }
        }

        for (const chat of chats) {
          const myEntry = activeEntries.find(
            (e) => e.id === chat.queue_entry_a || e.id === chat.queue_entry_b
          );
          if (!myEntry) continue;

          const isA = myEntry.id === chat.queue_entry_a;
          const opponentId = isA ? chat.club_b_id : chat.club_a_id;

          const idx = enrichedEntries.findIndex((e) => e.id === myEntry.id);
          if (idx !== -1) {
            enrichedEntries[idx].opponent_name = opponentId ? clubMap[opponentId] : undefined;
            enrichedEntries[idx].chat_id = chat.id;
          }
        }
      }
    }

    return NextResponse.json({ entries: enrichedEntries });
  } catch (err) {
    logger.error('[Matchmaking/Queue/GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { slot_time, custom_time } = parsed.data;

    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id')
      .eq('manager_id', user.id)
      .single();

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Check for duplicate active entry
    const { data: existing } = await supabase
      .from('matchmaking_queue')
      .select('id')
      .eq('club_id', club.id)
      .eq('slot_time', slot_time)
      .in('status', ['waiting', 'matched'])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Already in queue for this slot' }, { status: 409 });
    }

    // Calculate expires_at: parse slot_time as "HH:MM" UTC-3, add 30 min
    const now = new Date();
    let expiresAt: Date;

    if (slot_time === 'custom' && custom_time) {
      expiresAt = new Date(new Date(custom_time).getTime() + 30 * 60 * 1000);
    } else {
      const [hours, minutes] = slot_time.split(':').map(Number);
      // slot_time is BRT (UTC-3), convert to UTC by adding 3 hours
      const slotUtcHours = hours + 3;
      const slotDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        slotUtcHours,
        minutes,
        0,
        0
      ));
      // If slot is in the past today, try tomorrow
      if (slotDate.getTime() < now.getTime()) {
        slotDate.setUTCDate(slotDate.getUTCDate() + 1);
      }
      expiresAt = new Date(slotDate.getTime() + 30 * 60 * 1000);
    }

    const { data: entry, error: insertError } = await supabase
      .from('matchmaking_queue')
      .insert({
        club_id: club.id,
        queued_by: user.id,
        slot_time,
        custom_time: custom_time ?? null,
        status: 'waiting',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Tentar matching imediato para este slot
    await runMatching(slot_time);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    logger.error('[Matchmaking/Queue/POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { queue_id } = parsed.data;

    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id')
      .eq('manager_id', user.id)
      .single();

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const { data: updated, error } = await supabase
      .from('matchmaking_queue')
      .update({ status: 'cancelled' })
      .eq('id', queue_id)
      .eq('club_id', club.id)
      .in('status', ['waiting', 'matched'])
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Entry not found or already cancelled' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('[Matchmaking/Queue/DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


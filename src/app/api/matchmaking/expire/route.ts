import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const cronHeaderSchema = z.object({
  secret: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
  const parsed = cronHeaderSchema.safeParse({
    secret: request.headers.get('x-cron-secret') ?? '',
  });

  if (!expectedSecret || !parsed.success || parsed.data.secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();
    const now = new Date().toISOString();
    let expired = 0;

    // Find expired active chats (not yet confirmed by both sides)
    const { data: expiredActiveChats, error: fetchActiveError } = await adminClient
      .from('confrontation_chats')
      .select('id, queue_entry_a, queue_entry_b')
      .eq('status', 'active')
      .lt('expires_at', now);

    if (fetchActiveError) {
      return NextResponse.json({ error: fetchActiveError.message }, { status: 500 });
    }

    for (const chat of expiredActiveChats ?? []) {
      // Expire the chat first. If this succeeds, the queue revert is safe.
      // If queue revert fails, the stale-matched cleanup below catches it.
      const { data: expiredChat } = await adminClient
        .from('confrontation_chats')
        .update({ status: 'expired' })
        .eq('id', chat.id)
        .eq('status', 'active')
        .select('id')
        .maybeSingle();

      if (!expiredChat) continue; // already handled by another process

      // Revert queue entries back to waiting
      await adminClient
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_with: null })
        .in('id', [chat.queue_entry_a, chat.queue_entry_b])
        .eq('status', 'matched');

      expired += 1;
    }

    // Find confirmed chats that have expired without match_id
    const { data: expiredConfirmedChats, error: fetchConfirmedError } = await adminClient
      .from('confrontation_chats')
      .select('id')
      .eq('status', 'confirmed')
      .is('match_id', null)
      .lt('expires_at', now);

    if (fetchConfirmedError) {
      return NextResponse.json({ error: fetchConfirmedError.message }, { status: 500 });
    }

    if (expiredConfirmedChats && expiredConfirmedChats.length > 0) {
      const ids = expiredConfirmedChats.map((c) => c.id);
      await adminClient
        .from('confrontation_chats')
        .update({ status: 'expired' })
        .in('id', ids);

      expired += expiredConfirmedChats.length;
    }

    // Expire queue entries directly: waiting or confirmed entries past their expires_at
    const { data: expiredQueueEntries } = await adminClient
      .from('matchmaking_queue')
      .update({ status: 'expired' })
      .in('status', ['waiting', 'confirmed'])
      .lt('expires_at', now)
      .select('id');

    expired += expiredQueueEntries?.length ?? 0;

    // Also expire matched entries whose associated chat is already expired/cancelled
    const { data: staleMatchedEntries } = await adminClient
      .from('matchmaking_queue')
      .update({ status: 'expired', matched_with: null })
      .eq('status', 'matched')
      .lt('expires_at', now)
      .select('id');

    expired += staleMatchedEntries?.length ?? 0;

    return NextResponse.json({ expired });
  } catch (err) {
    console.error('[Matchmaking/Expire]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

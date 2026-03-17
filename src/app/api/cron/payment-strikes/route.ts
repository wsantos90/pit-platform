import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const cronHeaderSchema = z.object({
  secret: z.string().trim().min(1),
});

function getNextFifaDate(): string {
  const now = new Date();
  const year = now.getUTCMonth() >= 8 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return new Date(Date.UTC(year, 9, 1)).toISOString();
}

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const parsed = cronHeaderSchema.safeParse({
    secret: request.headers.get('x-cron-secret') ?? '',
  });

  if (!expectedSecret || !parsed.success || parsed.data.secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  try {
    const { data: expiredEntries, error: expiredEntriesError } = await admin
      .from('tournament_entries')
      .select('id, club_id')
      .eq('payment_status', 'pending')
      .lt('trust_deadline', nowIso);

    if (expiredEntriesError) {
      throw expiredEntriesError;
    }

    if (!expiredEntries || expiredEntries.length === 0) {
      return NextResponse.json({ processedEntries: 0, affectedClubs: 0, bannedClubs: 0 });
    }

    const entryIds = expiredEntries.map((entry) => entry.id);
    const clubStrikeCounts = expiredEntries.reduce<Map<string, number>>((acc, entry) => {
      acc.set(entry.club_id, (acc.get(entry.club_id) ?? 0) + 1);
      return acc;
    }, new Map());

    const clubIds = Array.from(clubStrikeCounts.keys());
    const { data: trustScores, error: trustScoresError } = await admin
      .from('trust_scores')
      .select('club_id, strikes, banned_until')
      .in('club_id', clubIds);

    if (trustScoresError) {
      throw trustScoresError;
    }

    const trustScoreMap = new Map((trustScores ?? []).map((row) => [row.club_id, row]));
    const nextFifaDate = getNextFifaDate();
    let bannedClubs = 0;

    for (const clubId of clubIds) {
      const currentTrustScore = trustScoreMap.get(clubId);
      const nextStrikes = Math.min((currentTrustScore?.strikes ?? 0) + (clubStrikeCounts.get(clubId) ?? 0), 3);
      const shouldBan = nextStrikes >= 3;

      if (shouldBan) {
        bannedClubs++;
      }

      const { error: trustUpdateError } = await admin
        .from('trust_scores')
        .upsert(
          {
            club_id: clubId,
            strikes: nextStrikes,
            is_trusted: false,
            last_strike_at: nowIso,
            banned_until: shouldBan ? nextFifaDate : currentTrustScore?.banned_until ?? null,
            updated_at: nowIso,
          },
          { onConflict: 'club_id', ignoreDuplicates: false }
        );

      if (trustUpdateError) {
        throw trustUpdateError;
      }
    }

    const { error: entryUpdateError } = await admin
      .from('tournament_entries')
      .update({ payment_status: 'cancelled' })
      .in('id', entryIds);

    if (entryUpdateError) {
      throw entryUpdateError;
    }

    return NextResponse.json({
      processedEntries: expiredEntries.length,
      affectedClubs: clubIds.length,
      bannedClubs,
    });
  } catch (err) {
    console.error('[Cron/PaymentStrikes]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

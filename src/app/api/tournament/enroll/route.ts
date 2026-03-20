import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPixPayment } from '@/lib/payment/mercadopago';
import { logger } from '@/lib/logger';

const schema = z.object({
  tournament_id: z.string().uuid(),
  club_id: z.string().uuid(),
});

function getBaseUrl(request: NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${protocol}://${host}`.replace(/\/$/, '');
  return '';
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { tournament_id, club_id } = parsed.data;
  const admin = createAdminClient();

  const { data: club } = await admin
    .from('clubs')
    .select('id, display_name, manager_id')
    .eq('id', club_id)
    .eq('manager_id', user.id)
    .maybeSingle();

  if (!club) {
    return NextResponse.json({ error: 'not_club_manager' }, { status: 403 });
  }

  const { data: tournament } = await admin
    .from('tournaments')
    .select('id, name, status, capacity_min, capacity_max, entry_fee')
    .eq('id', tournament_id)
    .maybeSingle();

  if (!tournament) return NextResponse.json({ error: 'tournament_not_found' }, { status: 404 });
  if (tournament.status !== 'open') return NextResponse.json({ error: 'tournament_not_open' }, { status: 409 });

  const { count: paidCount } = await admin
    .from('tournament_entries')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournament_id)
    .eq('payment_status', 'paid');

  if ((paidCount ?? 0) >= tournament.capacity_max) {
    return NextResponse.json({ error: 'tournament_full' }, { status: 409 });
  }

  const { data: existingEntry } = await admin
    .from('tournament_entries')
    .select('id, payment_status, trust_deadline')
    .eq('tournament_id', tournament_id)
    .eq('club_id', club_id)
    .maybeSingle();

  if (existingEntry?.payment_status === 'paid') {
    return NextResponse.json({ error: 'already_enrolled' }, { status: 409 });
  }

  const { data: trustScore } = await admin
    .from('trust_scores')
    .select('is_trusted, banned_until')
    .eq('club_id', club_id)
    .maybeSingle();

  if (trustScore?.banned_until) {
    const bannedUntil = new Date(trustScore.banned_until);
    if (!Number.isNaN(bannedUntil.getTime()) && bannedUntil > new Date()) {
      return NextResponse.json({ error: 'club_banned', until: trustScore.banned_until }, { status: 403 });
    }
  }

  const isTrusted = trustScore?.is_trusted ?? false;
  const trustDeadline = isTrusted
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: userProfile } = await admin
    .from('users')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();

  const payerEmail = userProfile?.email ?? user.email ?? 'noreply@pit.gg';
  const baseUrl = getBaseUrl(request);

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      club_id,
      tournament_id,
      user_id: user.id,
      amount: tournament.entry_fee,
      currency: 'BRL',
      description: `Inscricao - ${tournament.name}`,
      status: 'pending',
      gateway: 'mercadopago',
      is_recurring: false,
    })
    .select('id')
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: 'payment_creation_failed' }, { status: 500 });
  }

  let pixPayment;
  try {
    pixPayment = await createPixPayment({
      amount: tournament.entry_fee,
      description: `Inscricao - ${tournament.name}`,
      payerEmail,
      externalReference: payment.id,
      notificationUrl: `${baseUrl}/api/payment/webhook`,
    });
  } catch (err) {
    await admin.from('payments').delete().eq('id', payment.id);
    logger.error('[enroll] pix creation failed', err);
    return NextResponse.json({ error: 'mercadopago_error' }, { status: 502 });
  }

  const { error: paymentSyncError } = await admin
    .from('payments')
    .update({
      gateway_payment_id: pixPayment.id,
      gateway_status: pixPayment.status ?? 'pending',
      status: 'pending',
      pix_qr_code: pixPayment.qr_code_base64,
      pix_copy_paste: pixPayment.qr_code,
      pix_expiration: pixPayment.expiration,
    })
    .eq('id', payment.id);

  if (paymentSyncError) {
    logger.error('[enroll] failed to sync pix data on payment row', paymentSyncError);
  }

  const { data: entry, error: entryError } = await admin
    .from('tournament_entries')
    .upsert(
      {
        tournament_id,
        club_id,
        payment_status: 'pending',
        enrolled_by: user.id,
        trust_deadline: trustDeadline,
      },
      { onConflict: 'tournament_id,club_id' }
    )
    .select('id')
    .single();

  if (entryError || !entry) {
    return NextResponse.json({ error: 'entry_creation_failed' }, { status: 500 });
  }

  return NextResponse.json({
    entryId: entry.id,
    paymentId: payment.id,
    pixQrCode: pixPayment.qr_code_base64,
    pixCopyPaste: pixPayment.qr_code,
    pixExpiration: pixPayment.expiration,
  });
}


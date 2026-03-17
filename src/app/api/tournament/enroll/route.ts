import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPaymentPreference } from '@/lib/payment/mercadopago';

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { tournament_id, club_id } = parsed.data;
  const admin = createAdminClient();

  // Verify user is manager of this club
  const { data: club } = await admin
    .from('clubs')
    .select('id, display_name, manager_id')
    .eq('id', club_id)
    .eq('manager_id', user.id)
    .maybeSingle();

  if (!club) {
    return NextResponse.json({ error: 'not_club_manager' }, { status: 403 });
  }

  // Load tournament
  const { data: tournament } = await admin
    .from('tournaments')
    .select('id, name, status, capacity_min, capacity_max, entry_fee')
    .eq('id', tournament_id)
    .maybeSingle();

  if (!tournament) return NextResponse.json({ error: 'tournament_not_found' }, { status: 404 });
  if (tournament.status !== 'open') return NextResponse.json({ error: 'tournament_not_open' }, { status: 409 });

  // Check capacity
  const { count: paidCount } = await admin
    .from('tournament_entries')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournament_id)
    .eq('payment_status', 'paid');

  if ((paidCount ?? 0) >= tournament.capacity_max) {
    return NextResponse.json({ error: 'tournament_full' }, { status: 409 });
  }

  // Check for existing paid entry
  const { data: existingEntry } = await admin
    .from('tournament_entries')
    .select('id, payment_status')
    .eq('tournament_id', tournament_id)
    .eq('club_id', club_id)
    .maybeSingle();

  if (existingEntry?.payment_status === 'paid') {
    return NextResponse.json({ error: 'already_enrolled' }, { status: 409 });
  }

  // Get payer email
  const { data: userProfile } = await admin
    .from('users')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();

  const payerEmail = userProfile?.email ?? user.email ?? 'noreply@pit.gg';
  const baseUrl = getBaseUrl(request);

  // Create payment row
  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      club_id,
      tournament_id,
      user_id: user.id,
      amount: tournament.entry_fee,
      currency: 'BRL',
      description: `Inscrição — ${tournament.name}`,
      status: 'pending',
      gateway: 'mercadopago',
      is_recurring: false,
    })
    .select('id')
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: 'payment_creation_failed' }, { status: 500 });
  }

  // Create MercadoPago preference
  let preference;
  try {
    preference = await createPaymentPreference({
      amount: tournament.entry_fee,
      currency: 'BRL',
      description: `Inscrição — ${tournament.name}`,
      payerEmail,
      externalReference: payment.id,
      notificationUrl: `${baseUrl}/api/payment/webhook`,
      successUrl: `${baseUrl}/tournaments/${tournament_id}?payment=success`,
      failureUrl: `${baseUrl}/tournaments/${tournament_id}?payment=failure`,
      pendingUrl: `${baseUrl}/tournaments/${tournament_id}?payment=pending`,
    });
  } catch (err) {
    await admin.from('payments').delete().eq('id', payment.id);
    console.error('[enroll] preference creation failed', err);
    return NextResponse.json({ error: 'mercadopago_error' }, { status: 502 });
  }

  // Upsert tournament entry (enrolled_by is NOT NULL)
  const { data: entry, error: entryError } = await admin
    .from('tournament_entries')
    .upsert(
      { tournament_id, club_id, payment_status: 'pending', enrolled_by: user.id },
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
    preferenceId: preference.id,
    initPoint: preference.init_point,
    sandboxInitPoint: preference.sandbox_init_point,
  });
}

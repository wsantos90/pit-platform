import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPayment, verifyWebhookSignature } from '@/lib/payment/mercadopago';

type WebhookPayload = {
    type?: string;
    action?: string;
    data?: { id?: string };
    id?: string;
};

function mapPaymentStatus(status?: string): 'pending' | 'paid' | 'refunded' | 'overdue' | 'cancelled' {
    if (status === 'approved') return 'paid';
    if (status === 'refunded' || status === 'charged_back') return 'refunded';
    if (status === 'cancelled' || status === 'rejected') return 'cancelled';
    if (status === 'in_process' || status === 'pending') return 'pending';
    return 'pending';
}

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const payload = rawBody ? (JSON.parse(rawBody) as WebhookPayload) : {};
    const dataId = payload.data?.id || payload.id || null;
    const signatureHeader = request.headers.get('x-signature');
    const requestId = request.headers.get('x-request-id');
    const signatureValid = verifyWebhookSignature({
        signatureHeader,
        requestId,
        dataId,
    });

    console.info('mp.payment.webhook.received', {
        dataId,
        type: payload.type,
        action: payload.action,
        signatureValid,
    });

    if (!signatureValid) {
        return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 });
    }

    if (!dataId) {
        return NextResponse.json({ error: 'payload sem data.id' }, { status: 400 });
    }

    const payment = await getPayment(dataId);
    const admin = createAdminClient();
    const externalReference = payment.external_reference || null;
    const status = mapPaymentStatus(payment.status);

    console.info('mp.payment.webhook.payment', {
        dataId,
        externalReference,
        status: payment.status,
        statusDetail: payment.status_detail,
    });

    const updatePayload: Record<string, unknown> = {
        gateway_payment_id: payment.id,
        gateway_status: payment.status || null,
        status,
        currency: payment.currency_id || 'BRL',
        amount: payment.transaction_amount || 0,
        paid_at: payment.date_approved || null,
        pix_qr_code: payment.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        pix_copy_paste: payment.point_of_interaction?.transaction_data?.qr_code || null,
        pix_expiration: payment.date_of_expiration || null,
    };

    if (externalReference) {
        await admin
            .from('payments')
            .update(updatePayload)
            .eq('id', externalReference);
    } else {
        await admin
            .from('payments')
            .update(updatePayload)
            .eq('gateway_payment_id', payment.id);
    }

    // Sync tournament_entries when payment is tournament-related.
    if (externalReference) {
        const { data: paymentRow } = await admin
            .from('payments')
            .select('tournament_id, club_id')
            .eq('id', externalReference)
            .maybeSingle();

        if (paymentRow?.tournament_id && paymentRow.club_id) {
            const entryUpdate = admin
                .from('tournament_entries')
                .update({ payment_status: status })
                .eq('tournament_id', paymentRow.tournament_id)
                .eq('club_id', paymentRow.club_id);

            if (status === 'paid') {
                entryUpdate.neq('payment_status', 'cancelled');
            }

            await entryUpdate;

            // Auto-confirm tournament when paid entries >= capacity_min.
            if (status === 'paid') {
                const [{ count }, { data: tournament }] = await Promise.all([
                    admin
                        .from('tournament_entries')
                        .select('id', { count: 'exact', head: true })
                        .eq('tournament_id', paymentRow.tournament_id)
                        .eq('payment_status', 'paid'),
                    admin
                        .from('tournaments')
                        .select('status, capacity_min')
                        .eq('id', paymentRow.tournament_id)
                        .maybeSingle(),
                ]);

                if (tournament?.status === 'open' && (count ?? 0) >= tournament.capacity_min) {
                    await admin
                        .from('tournaments')
                        .update({ status: 'confirmed' })
                        .eq('id', paymentRow.tournament_id)
                        .eq('status', 'open');

                    console.info('mp.tournament.auto_confirmed', {
                        tournamentId: paymentRow.tournament_id,
                        paidCount: count,
                    });
                }

                await admin
                    .from('trust_scores')
                    .upsert(
                        {
                            club_id: paymentRow.club_id,
                            is_trusted: true,
                            strikes: 0,
                            suspended_until: null,
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'club_id', ignoreDuplicates: false }
                    );
            }
        }
    }

    return NextResponse.json({ received: true });
}

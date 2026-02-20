import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPayment, getSubscription, verifyRecurringWebhookSignature } from '@/lib/payment/mercadopago';

type WebhookPayload = {
    type?: string;
    action?: string;
    data?: { id?: string };
    id?: string;
};

function mapSubscriptionStatus(status?: string): 'pending' | 'paid' | 'refunded' | 'overdue' | 'cancelled' {
    if (status === 'authorized') return 'paid';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'paused') return 'overdue';
    if (status === 'pending') return 'pending';
    return 'pending';
}

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const payload = rawBody ? (JSON.parse(rawBody) as WebhookPayload) : {};
    const dataId = payload.data?.id || payload.id || null;
    const signatureHeader = request.headers.get('x-signature');
    const requestId = request.headers.get('x-request-id');
    const signatureValid = verifyRecurringWebhookSignature({
        signatureHeader,
        requestId,
        dataId,
    });

    console.info('mp.subscription.webhook.received', {
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

    const admin = createAdminClient();

    if (payload.type === 'subscription_authorized_payment') {
        const payment = await getPayment(dataId, 'recurring');
        const externalReference = payment.external_reference || null;
        const status = mapSubscriptionStatus(payment.status);

        console.info('mp.subscription.webhook.payment', {
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
        };

        if (externalReference) {
            await admin.from('payments').update(updatePayload).eq('id', externalReference);
        } else {
            await admin.from('payments').update(updatePayload).eq('gateway_payment_id', payment.id);
        }

        return NextResponse.json({ received: true });
    }

    const subscription = await getSubscription(dataId);
    const status = mapSubscriptionStatus(subscription.status);

    console.info('mp.subscription.webhook.subscription', {
        dataId,
        status: subscription.status,
        externalReference: subscription.external_reference,
    });

    await admin
        .from('payments')
        .update({
            subscription_id: subscription.id,
            gateway_status: subscription.status || null,
            status,
        })
        .eq('subscription_id', subscription.id);

    return NextResponse.json({ received: true });
}

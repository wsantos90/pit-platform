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

    return NextResponse.json({ received: true });
}

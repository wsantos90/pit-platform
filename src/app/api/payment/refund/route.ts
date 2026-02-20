import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { refundPayment, getPayment } from '@/lib/payment/mercadopago';

const schema = z.object({
    paymentId: z.string().min(1),
    amount: z.number().positive().optional(),
    reason: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
    const payload = await request.json().catch(() => null);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        return NextResponse.json({ error: 'payload inválido', details: parsed.error.flatten() }, { status: 400 });
    }

    const { paymentId, amount, reason } = parsed.data;
    console.info('mp.payment.refund.start', { paymentId, amount });

    await refundPayment(paymentId, amount);
    const payment = await getPayment(paymentId);

    const admin = createAdminClient();
    await admin
        .from('payments')
        .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
            refund_reason: reason || null,
            gateway_status: payment.status || null,
        })
        .eq('gateway_payment_id', paymentId);

    console.info('mp.payment.refund.success', { paymentId });
    return NextResponse.json({ refunded: true });
}

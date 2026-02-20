import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPaymentPreference, createSubscriptionPreapproval } from '@/lib/payment/mercadopago';

const schema = z.object({
    amount: z.number().positive(),
    currency: z.string().default('BRL'),
    description: z.string().min(1),
    payerEmail: z.string().email(),
    clubId: z.string().uuid(),
    userId: z.string().uuid(),
    tournamentId: z.string().uuid().optional().nullable(),
    referenceId: z.string().uuid().optional(),
    purchaseType: z.enum(['one_time', 'recurring']).default('one_time'),
    recurrenceFrequency: z.number().int().positive().optional(),
    recurrenceType: z.enum(['days', 'months']).optional(),
    successUrl: z.string().url().optional(),
    failureUrl: z.string().url().optional(),
    pendingUrl: z.string().url().optional(),
    notificationUrl: z.string().url().optional(),
});

function getBaseUrl(request: NextRequest) {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    const origin = request.headers.get('origin');
    if (origin) return origin.replace(/\/$/, '');
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    if (host) return `${protocol}://${host}`.replace(/\/$/, '');
    return '';
}

export async function POST(request: NextRequest) {
    const payload = await request.json().catch(() => null);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        return NextResponse.json({ error: 'payload inválido', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const isRecurring = data.purchaseType === 'recurring';
    const baseUrl = getBaseUrl(request);
    const notificationUrl =
        data.notificationUrl || `${baseUrl}${isRecurring ? '/api/subscription/webhook' : '/api/payment/webhook'}`;
    const successUrl = data.successUrl || `${baseUrl}/payment/success`;
    const failureUrl = data.failureUrl || `${baseUrl}/payment/failure`;
    const pendingUrl = data.pendingUrl || `${baseUrl}/payment/pending`;

    const admin = createAdminClient();
    const insertPayload: Record<string, unknown> = {
        club_id: data.clubId,
        tournament_id: data.tournamentId ?? null,
        user_id: data.userId,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        status: 'pending',
        gateway: 'mercadopago',
        is_recurring: isRecurring,
    };
    if (data.referenceId) {
        insertPayload.id = data.referenceId;
    }

    const paymentInsert = await admin
        .from('payments')
        .insert(insertPayload)
        .select('id')
        .single();

    if (paymentInsert.error || !paymentInsert.data?.id) {
        return NextResponse.json({ error: 'falha ao criar pagamento', details: paymentInsert.error }, { status: 500 });
    }

    const externalReference = paymentInsert.data.id;

    console.info('mp.payment.create.preference.start', {
        externalReference,
        amount: data.amount,
        currency: data.currency,
        purchaseType: data.purchaseType,
    });

    if (isRecurring) {
        const frequency = data.recurrenceFrequency ?? 1;
        const frequencyType = data.recurrenceType ?? 'months';
        const subscription = await createSubscriptionPreapproval({
            amount: data.amount,
            currency: data.currency,
            description: data.description,
            payerEmail: data.payerEmail,
            externalReference,
            notificationUrl,
            backUrl: successUrl,
            frequency,
            frequencyType,
        });

        await admin
            .from('payments')
            .update({ subscription_id: subscription.id })
            .eq('id', externalReference);

        console.info('mp.payment.create.subscription.success', {
            externalReference,
            subscriptionId: subscription.id,
        });

        return NextResponse.json({
            purchaseType: data.purchaseType,
            subscriptionId: subscription.id,
            initPoint: subscription.init_point,
            externalReference,
            notificationUrl,
            backUrl: successUrl,
        });
    }

    const preference = await createPaymentPreference({
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        payerEmail: data.payerEmail,
        externalReference,
        notificationUrl,
        successUrl,
        failureUrl,
        pendingUrl,
    });

    console.info('mp.payment.create.preference.success', {
        externalReference,
        preferenceId: preference.id,
    });

    return NextResponse.json({
        purchaseType: data.purchaseType,
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        externalReference,
        notificationUrl,
        backUrls: { successUrl, failureUrl, pendingUrl },
    });
}

import crypto from 'crypto';
import { MercadoPagoConfig, Preference, Payment as MPPayment, PaymentRefund, PreApproval } from 'mercadopago';

type PreferenceInput = {
    amount: number;
    currency: string;
    description: string;
    payerEmail: string;
    externalReference: string;
    notificationUrl: string;
    successUrl: string;
    failureUrl: string;
    pendingUrl: string;
};

type PreferenceResult = {
    id: string;
    init_point: string;
    sandbox_init_point?: string;
};

type PixPaymentInput = {
    amount: number;
    description: string;
    payerEmail: string;
    externalReference: string;
    notificationUrl: string;
};

type PixPaymentResult = {
    id: string;
    status?: string;
    qr_code: string;
    qr_code_base64: string;
    expiration: string;
};

type PurchaseType = 'one_time' | 'recurring';

type PaymentResult = {
    id: string;
    status?: string;
    status_detail?: string;
    transaction_amount?: number;
    currency_id?: string;
    date_approved?: string | null;
    date_of_expiration?: string | null;
    date_last_updated?: string | null;
    payment_method_id?: string;
    payment_type_id?: string;
    point_of_interaction?: {
        transaction_data?: {
            qr_code?: string;
            qr_code_base64?: string;
            ticket_url?: string;
        };
    };
    external_reference?: string | null;
};

type SubscriptionInput = {
    amount: number;
    currency: string;
    description: string;
    payerEmail: string;
    externalReference: string;
    notificationUrl: string;
    backUrl: string;
    frequency: number;
    frequencyType: 'days' | 'months';
};

type SubscriptionResult = {
    id: string;
    status?: string;
    init_point?: string;
    external_reference?: string | null;
    auto_recurring?: {
        frequency?: number;
        frequency_type?: string;
        transaction_amount?: number;
        currency_id?: string;
    };
};

const accessTokenOneTime = process.env.MP_ACCESS_TOKEN;
const accessTokenRecurring = process.env.MP_ACCESS_TOKEN_RECURRING;
const webhookSecretOneTime = process.env.MP_WEBHOOK_SECRET || '';
const webhookSecretRecurring = process.env.MP_WEBHOOK_SECRET_RECURRING || '';

function getClientByType(type: PurchaseType) {
    const token = type === 'recurring' ? accessTokenRecurring : accessTokenOneTime;
    if (!token) {
        const name = type === 'recurring' ? 'MP_ACCESS_TOKEN_RECURRING' : 'MP_ACCESS_TOKEN';
        throw new Error(`${name} is not set`);
    }
    return new MercadoPagoConfig({ accessToken: token });
}

function getOneTimeAccessToken() {
    if (!accessTokenOneTime) {
        throw new Error('MP_ACCESS_TOKEN is not set');
    }
    return accessTokenOneTime;
}

export async function createPaymentPreference(input: PreferenceInput): Promise<PreferenceResult> {
    const client = getClientByType('one_time');
    const preference = new Preference(client);
    const result = await preference.create({
        body: {
            items: [
                {
                    id: input.externalReference,
                    title: input.description,
                    quantity: 1,
                    unit_price: input.amount,
                    currency_id: input.currency,
                },
            ],
            payer: {
                email: input.payerEmail,
            },
            external_reference: input.externalReference,
            notification_url: input.notificationUrl,
            back_urls: {
                success: input.successUrl,
                failure: input.failureUrl,
                pending: input.pendingUrl,
            },
            auto_return: 'approved',
        },
    });

    return {
        id: result.id as string,
        init_point: result.init_point as string,
        sandbox_init_point: result.sandbox_init_point as string | undefined,
    };
}

export async function createPixPayment(input: PixPaymentInput): Promise<PixPaymentResult> {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getOneTimeAccessToken()}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': input.externalReference,
        },
        body: JSON.stringify({
            transaction_amount: input.amount,
            payment_method_id: 'pix',
            payer: {
                email: input.payerEmail,
            },
            external_reference: input.externalReference,
            notification_url: input.notificationUrl,
            description: input.description,
        }),
    });

    const payload = (await response.json().catch(() => null)) as (PaymentResult & {
        message?: string;
        error?: string;
    }) | null;

    if (!response.ok || !payload?.id) {
        const reason = payload?.message || payload?.error || `Mercado Pago request failed with status ${response.status}`;
        throw new Error(reason);
    }

    const qrCode = payload.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = payload.point_of_interaction?.transaction_data?.qr_code_base64;
    const expiration = payload.date_of_expiration;

    if (!qrCode || !qrCodeBase64 || !expiration) {
        throw new Error('Mercado Pago PIX response missing QR code data');
    }

    return {
        id: payload.id,
        status: payload.status,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        expiration,
    };
}

export async function createSubscriptionPreapproval(input: SubscriptionInput): Promise<SubscriptionResult> {
    const client = getClientByType('recurring');
    const preapproval = new PreApproval(client);
    const result = await preapproval.create({
        body: {
            reason: input.description,
            external_reference: input.externalReference,
            payer_email: input.payerEmail,
            back_url: input.backUrl,
            auto_recurring: {
                frequency: input.frequency,
                frequency_type: input.frequencyType,
                transaction_amount: input.amount,
                currency_id: input.currency,
            },
        },
    });

    return result as unknown as SubscriptionResult;
}

export async function getSubscription(preapprovalId: string): Promise<SubscriptionResult> {
    const client = getClientByType('recurring');
    const preapproval = new PreApproval(client);
    const result = await preapproval.get({ id: preapprovalId });
    return result as unknown as SubscriptionResult;
}

export async function getPayment(paymentId: string, purchaseType: PurchaseType = 'one_time'): Promise<PaymentResult> {
    const client = getClientByType(purchaseType);
    const payment = new MPPayment(client);
    const result = await payment.get({ id: paymentId });
    return result as unknown as PaymentResult;
}

export async function refundPayment(paymentId: string, amount?: number, purchaseType: PurchaseType = 'one_time'): Promise<unknown> {
    const client = getClientByType(purchaseType);
    const refund = new PaymentRefund(client);
    const numericId = parseInt(paymentId, 10);
    if (amount) {
        return refund.create({ payment_id: numericId, body: { amount } });
    }
    return refund.create({ payment_id: numericId });
}

type SignatureParts = { ts: string; v1: string };

function parseSignature(signatureHeader: string): SignatureParts | null {
    const parts = signatureHeader.split(',').flatMap((item) => item.split(';'));
    const values = parts.reduce<Record<string, string>>((acc, part) => {
        const [key, value] = part.split('=').map((item) => item.trim());
        if (key && value) acc[key] = value;
        return acc;
    }, {});
    if (!values.ts || !values.v1) return null;
    return { ts: values.ts, v1: values.v1 };
}

export function verifyWebhookSignatureWithSecret(params: {
    signatureHeader: string | null;
    requestId: string | null;
    dataId: string | null;
    secret: string;
}): boolean {
    if (!params.secret) return false;
    if (!params.signatureHeader || !params.requestId || !params.dataId) return false;
    const parsed = parseSignature(params.signatureHeader);
    if (!parsed) return false;
    const manifest = `id:${params.dataId};request-id:${params.requestId};ts:${parsed.ts};`;
    const hmac = crypto.createHmac('sha256', params.secret);
    hmac.update(manifest);
    const signature = hmac.digest('hex');
    return signature === parsed.v1;
}

export function verifyWebhookSignature(params: {
    signatureHeader: string | null;
    requestId: string | null;
    dataId: string | null;
}): boolean {
    return verifyWebhookSignatureWithSecret({
        ...params,
        secret: webhookSecretOneTime,
    });
}

export function verifyRecurringWebhookSignature(params: {
    signatureHeader: string | null;
    requestId: string | null;
    dataId: string | null;
}): boolean {
    return verifyWebhookSignatureWithSecret({
        ...params,
        secret: webhookSecretRecurring,
    });
}

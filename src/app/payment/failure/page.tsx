export default function PaymentFailure({
    searchParams,
}: {
    searchParams: Record<string, string | string[] | undefined>;
}) {
    const paymentId = searchParams.payment_id || searchParams.collection_id;
    const externalReference = searchParams.external_reference;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
            <div className="max-w-xl w-full p-6 rounded-xl border border-gray-800 bg-gray-900">
                <h1 className="text-2xl font-semibold text-red-400">Pagamento recusado</h1>
                <p className="mt-2 text-sm text-gray-300">
                    Não foi possível concluir o pagamento. Tente novamente ou use outro método.
                </p>
                <div className="mt-4 text-xs text-gray-400 space-y-1">
                    <div>payment_id: {Array.isArray(paymentId) ? paymentId[0] : paymentId || '-'}</div>
                    <div>reference_id: {Array.isArray(externalReference) ? externalReference[0] : externalReference || '-'}</div>
                </div>
            </div>
        </div>
    );
}

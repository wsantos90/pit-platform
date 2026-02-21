export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-gray-800 bg-gray-900 rounded-lg p-6 text-center">
        <h1 className="text-xl font-semibold text-orange-400">Acesso não autorizado</h1>
        <p className="mt-2 text-sm text-gray-300">
          Você não possui permissão para acessar esta área.
        </p>
      </div>
    </main>
  );
}


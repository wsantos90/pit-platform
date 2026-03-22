'use client';

import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

import { AuthCard } from '@/components/auth';
import { Button } from '@/components/ui/button';

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AuthCard
      title="Não foi possível carregar esta página"
      description="Ocorreu um erro inesperado ao preparar o fluxo de autenticação."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-error/20 bg-error-bg/70 p-4 text-body-sm text-foreground-secondary">
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-error" />
            <p className="leading-6">
              Atualize a página ou tente novamente em alguns instantes. Se o problema persistir,
              volte ao login e repita o acesso.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="h-11 flex-1 rounded-xl font-semibold" onClick={reset} type="button">
            <RotateCcw aria-hidden="true" className="size-4" />
            Tentar novamente
          </Button>
          <Button asChild className="h-11 flex-1 rounded-xl" variant="outline">
            <Link href="/login">Ir para o login</Link>
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}

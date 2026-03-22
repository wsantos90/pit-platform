import type { Metadata } from 'next';
import { BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'P.I.T - Autenticação',
  description:
    'Acesse a plataforma competitiva P.I.T para acompanhar performance, inteligência e tracking.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-bg-pattern relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div className="relative z-10 w-full max-w-[28rem]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="relative flex size-14 items-center justify-center rounded-[20px] border border-primary/20 bg-primary/12 text-primary shadow-[0_18px_48px_hsl(var(--primary)/0.18)]">
            <BarChart3 className="size-6" />
            <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-background bg-accent-brand" />
          </div>
          <div className="space-y-2">
            <h1 className="text-page-title font-black tracking-tight text-foreground">P.I.T</h1>
            <p className="mx-auto max-w-xs text-caption uppercase tracking-[0.22em] text-foreground-tertiary">
              Performance · Intelligence · Tracking
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

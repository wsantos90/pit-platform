'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type AuthFormAlertProps = {
  type: 'error' | 'success';
  message: string | null;
  className?: string;
};

export function AuthFormAlert({ type, message, className }: AuthFormAlertProps) {
  if (!message) return null;

  const isError = type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      aria-live={isError ? 'assertive' : 'polite'}
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-body-sm shadow-sm',
        isError
          ? 'border-error/20 bg-error-bg/70 text-error'
          : 'border-success/20 bg-success-bg/70 text-success',
        className
      )}
      role={isError ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p className="leading-5">{message}</p>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MailCheck } from 'lucide-react';

import { AuthCard, AuthFormAlert } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/supabase/auth-errors';
import { cn, isEmailValid } from '@/lib/utils';

const AUTH_INPUT_CLASSNAME =
  'h-11 rounded-xl border-border/20 bg-surface-raised/45 px-4 text-base shadow-none placeholder:text-foreground-tertiary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0';

function getInputClassName(hasError: boolean) {
  return cn(
    AUTH_INPUT_CLASSNAME,
    hasError && 'border-error/60 focus-visible:ring-error'
  );
}

export default function ForgotPasswordPage() {
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!emailError) {
      return;
    }

    const invalidField = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    invalidField?.focus();
  }, [emailError]);

  async function sendResetLink(targetEmail: string) {
    setIsSubmitting(true);
    setFormError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail);

    if (error) {
      setFormError(getAuthErrorMessage(error.message));
      setIsSubmitting(false);
      return false;
    }

    setSentEmail(targetEmail);
    setIsSubmitting(false);
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim();

    setEmailError(null);
    setFormError(null);

    if (!isEmailValid(cleanEmail)) {
      setEmailError('Informe um email válido.');
      return;
    }

    await sendResetLink(cleanEmail);
  }

  return (
    <AuthCard
      description="Informe o email da sua conta para receber um novo link de acesso."
      footer={
        <Link
          className="inline-flex items-center gap-2 text-body-sm font-semibold text-accent-brand transition-colors hover:text-accent-brand-hover"
          href="/login"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar ao login
        </Link>
      }
      title={sentEmail ? 'Link enviado' : 'Recuperar senha'}
    >
      {sentEmail ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
            <MailCheck aria-hidden="true" className="size-7" />
          </div>

          <div className="space-y-3">
            <p className="text-body-sm leading-6 text-foreground-secondary">
              Enviamos um link de recuperação para{' '}
              <span className="font-semibold text-foreground">{sentEmail}</span>.
            </p>
            <p className="text-body-sm leading-6 text-foreground-secondary">
              Abra o email recebido e siga as instruções para redefinir sua senha.
            </p>
          </div>

          <AuthFormAlert message={formError} type="error" />

          <Button
            className="h-11 w-full rounded-xl font-semibold"
            disabled={isSubmitting}
            onClick={() => {
              void sendResetLink(sentEmail);
            }}
            type="button"
            variant="outline"
          >
            {isSubmitting ? 'Reenviando...' : 'Reenviar link'}
          </Button>
        </div>
      ) : (
        <form
          ref={formRef}
          aria-busy={isSubmitting}
          aria-label="Formulário de recuperação de senha"
          className="space-y-5"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label className="text-body-sm font-semibold text-foreground" htmlFor="forgot-email">
              Email
            </Label>
            <Input
              aria-describedby={emailError ? 'forgot-email-error' : undefined}
              aria-invalid={Boolean(emailError)}
              autoComplete="email"
              className={getInputClassName(Boolean(emailError))}
              disabled={isSubmitting}
              id="forgot-email"
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) {
                  setEmailError(null);
                }
                if (formError) {
                  setFormError(null);
                }
              }}
              placeholder="voce@exemplo.com"
              required
              type="email"
              value={email}
            />
            {emailError ? (
              <p className="text-caption text-error" id="forgot-email-error">
                {emailError}
              </p>
            ) : null}
          </div>

          <AuthFormAlert message={formError} type="error" />

          <Button
            className="h-11 w-full rounded-xl font-semibold shadow-[0_18px_30px_hsl(var(--primary)/0.28)]"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';

import { AuthCard, AuthCardSkeleton, AuthFormAlert, PasswordField } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/supabase/auth-errors';
import { ensurePlayerProfile } from '@/lib/supabase/player-profile';
import { cn, isEmailValid } from '@/lib/utils';

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

const AUTH_INPUT_CLASSNAME =
  'h-11 rounded-xl border-border/20 bg-surface-raised/45 px-4 text-base shadow-none placeholder:text-foreground-tertiary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0';

function getInputClassName(hasError: boolean) {
  return cn(
    AUTH_INPUT_CLASSNAME,
    hasError && 'border-error/60 focus-visible:ring-error'
  );
}

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/profile';
  }

  return nextPath;
}

function LoginContent() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!fieldErrors.email && !fieldErrors.password) {
      return;
    }

    const invalidField = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    invalidField?.focus();
  }, [fieldErrors.email, fieldErrors.password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFieldErrors: LoginFieldErrors = {};
    setFormError(null);

    if (!isEmailValid(email.trim())) {
      nextFieldErrors.email = 'Informe um email válido.';
    }
    if (!password) {
      nextFieldErrors.password = 'Informe sua senha.';
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient({ sessionOnly: !rememberMe });
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setFormError(getAuthErrorMessage(signInError.message));
      setIsSubmitting(false);
      return;
    }

    try {
      const authUser = signInData.user ?? signInData.session?.user;
      const metadataGamertag = authUser?.user_metadata?.ea_gamertag;
      if (authUser?.id && typeof metadataGamertag === 'string') {
        await ensurePlayerProfile({
          supabase,
          userId: authUser.id,
          gamertag: metadataGamertag,
        });
      }
    } catch {
      // Login should still complete even if profile hydration fails.
    }

    const safeNextPath = getSafeNextPath(nextPath);
    router.push(safeNextPath);
    router.refresh();
  }

  return (
    <AuthCard
      description="Entre com suas credenciais para acessar seu ambiente competitivo."
      footer={
        <p className="text-body-sm text-foreground-secondary">
          Não tem uma conta?{' '}
          <Link
            className="font-semibold text-accent-brand transition-colors hover:text-accent-brand-hover"
            href="/register"
          >
            Criar conta
          </Link>
        </p>
      }
      title="Bem-vindo de volta"
    >
      <form
        ref={formRef}
        aria-busy={isSubmitting}
        aria-label="Formulário de login"
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label className="text-body-sm font-semibold text-foreground" htmlFor="login-email">
            Email
          </Label>
          <Input
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            className={getInputClassName(Boolean(fieldErrors.email))}
            disabled={isSubmitting}
            id="login-email"
            onChange={(event) => {
              setEmail(event.target.value);
              if (fieldErrors.email) {
                setFieldErrors((current) => ({ ...current, email: undefined }));
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
          {fieldErrors.email ? (
            <p className="text-caption text-error" id="login-email-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-body-sm font-semibold text-foreground" htmlFor="login-password">
              Senha
            </Label>
            <Link
              className="text-body-sm font-medium text-foreground-secondary transition-colors hover:text-accent-brand"
              href="/forgot-password"
            >
              Esqueceu sua senha?
            </Link>
          </div>
          <PasswordField
            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            aria-invalid={Boolean(fieldErrors.password)}
            autoComplete="current-password"
            className={getInputClassName(Boolean(fieldErrors.password))}
            disabled={isSubmitting}
            id="login-password"
            onChange={(event) => {
              setPassword(event.target.value);
              if (fieldErrors.password) {
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }
              if (formError) {
                setFormError(null);
              }
            }}
            placeholder="Digite sua senha"
            required
            value={password}
          />
          {fieldErrors.password ? (
            <p className="text-caption text-error" id="login-password-error">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={rememberMe}
              className="size-4 rounded-[5px] border-border/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              disabled={isSubmitting}
              id="remember-me"
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label
              className="cursor-pointer text-body-sm font-medium text-foreground-secondary"
              htmlFor="remember-me"
            >
              Lembrar de mim
            </Label>
          </div>
        </div>

        <AuthFormAlert message={formError} type="error" />

        <Button
          className="h-11 w-full rounded-xl font-semibold shadow-[0_18px_30px_hsl(var(--primary)/0.28)]"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthCardSkeleton
          description="Preparando a validação das suas credenciais..."
          title="Carregando login"
        />
      }
    >
      <LoginContent />
    </Suspense>
  );
}

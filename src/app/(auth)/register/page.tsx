'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { MailCheck } from 'lucide-react';

import { AuthCard, AuthFormAlert, PasswordField } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/supabase/auth-errors';
import { ensurePlayerProfile } from '@/lib/supabase/player-profile';
import { cn, isEmailValid } from '@/lib/utils';

type RegisterFieldErrors = {
  email?: string;
  gamertag?: string;
  password?: string;
  confirmPassword?: string;
};

const AUTH_INPUT_CLASSNAME =
  'h-11 rounded-xl border-border/20 bg-surface-raised/45 px-4 text-base shadow-none placeholder:text-foreground-tertiary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0';

function getInputClassName(hasError: boolean) {
  return cn(
    AUTH_INPUT_CLASSNAME,
    hasError && 'border-error/60 focus-visible:ring-error'
  );
}

export default function RegisterPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (
      !fieldErrors.email &&
      !fieldErrors.gamertag &&
      !fieldErrors.password &&
      !fieldErrors.confirmPassword
    ) {
      return;
    }

    const invalidField = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    invalidField?.focus();
  }, [
    fieldErrors.confirmPassword,
    fieldErrors.email,
    fieldErrors.gamertag,
    fieldErrors.password,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFieldErrors: RegisterFieldErrors = {};
    const cleanEmail = email.trim();
    const cleanGamertag = gamertag.trim();

    setFormError(null);

    if (!isEmailValid(cleanEmail)) {
      nextFieldErrors.email = 'Informe um email válido.';
    }
    if (cleanGamertag.length < 3) {
      nextFieldErrors.gamertag = 'Seu EA Gamertag precisa ter pelo menos 3 caracteres.';
    }
    if (password.length < 6) {
      nextFieldErrors.password = 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (password !== confirmPassword) {
      nextFieldErrors.confirmPassword = 'A confirmação precisa ser igual à senha.';
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          display_name: cleanGamertag,
          ea_gamertag: cleanGamertag,
        },
      },
    });

    if (signUpError) {
      setFormError(getAuthErrorMessage(signUpError.message));
      setIsSubmitting(false);
      return;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      setFormError('Não foi possível criar o seu acesso agora. Tente novamente.');
      setIsSubmitting(false);
      return;
    }

    if (!signUpData.session) {
      setConfirmationEmail(cleanEmail);
      setIsSubmitting(false);
      return;
    }

    try {
      await ensurePlayerProfile({
        supabase,
        userId,
        gamertag: cleanGamertag,
      });
    } catch {
      // Registration should still complete even if profile hydration fails.
    }

    router.push('/profile');
    router.refresh();
  }

  if (confirmationEmail) {
    return (
      <AuthCard
        description="Enviamos um link de confirmação para ativar seu acesso ao ambiente P.I.T."
        footer={
          <p className="text-body-sm text-foreground-secondary">
            Já confirmou o email?{' '}
            <Link
              className="font-semibold text-accent-brand transition-colors hover:text-accent-brand-hover"
              href="/login"
            >
              Entrar
            </Link>
          </p>
        }
        title="Confirme seu cadastro"
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
            <MailCheck aria-hidden="true" className="size-7" />
          </div>

          <div className="space-y-3">
            <p className="text-body-sm leading-6 text-foreground-secondary">
              Enviamos a confirmação para{' '}
              <span className="font-semibold text-foreground">{confirmationEmail}</span>. Abra o
              email, valide o link e volte para entrar.
            </p>
            <p className="text-body-sm leading-6 text-foreground-secondary">
              Se não encontrar a mensagem, confira também a caixa de spam ou promoções.
            </p>
          </div>

          <Button asChild className="h-11 w-full rounded-xl font-semibold" variant="outline">
            <Link href="/login">Ir para o login</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      description="Crie seu acesso com email, EA Gamertag e uma senha segura."
      footer={
        <p className="text-body-sm text-foreground-secondary">
          Já tem uma conta?{' '}
          <Link
            className="font-semibold text-accent-brand transition-colors hover:text-accent-brand-hover"
            href="/login"
          >
            Entrar
          </Link>
        </p>
      }
      title="Criar conta"
    >
      <form
        ref={formRef}
        aria-busy={isSubmitting}
        aria-label="Formulário de cadastro"
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label className="text-body-sm font-semibold text-foreground" htmlFor="register-gamertag">
            EA Gamertag
          </Label>
          <Input
            aria-describedby={
              fieldErrors.gamertag
                ? 'register-gamertag-help register-gamertag-error'
                : 'register-gamertag-help'
            }
            aria-invalid={Boolean(fieldErrors.gamertag)}
            autoComplete="nickname"
            className={getInputClassName(Boolean(fieldErrors.gamertag))}
            disabled={isSubmitting}
            id="register-gamertag"
            onChange={(event) => {
              setGamertag(event.target.value);
              if (fieldErrors.gamertag) {
                setFieldErrors((current) => ({ ...current, gamertag: undefined }));
              }
              if (formError) {
                setFormError(null);
              }
            }}
            placeholder="Seu EA ID público"
            required
            type="text"
            value={gamertag}
          />
          <p className="text-body-sm leading-6 text-foreground-secondary" id="register-gamertag-help">
            Esse nome será usado para identificar seu perfil competitivo na plataforma.
          </p>
          {fieldErrors.gamertag ? (
            <p className="text-caption text-error" id="register-gamertag-error">
              {fieldErrors.gamertag}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className="text-body-sm font-semibold text-foreground" htmlFor="register-email">
            Email
          </Label>
          <Input
            aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            className={getInputClassName(Boolean(fieldErrors.email))}
            disabled={isSubmitting}
            id="register-email"
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
            <p className="text-caption text-error" id="register-email-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className="text-body-sm font-semibold text-foreground" htmlFor="register-password">
            Senha
          </Label>
          <PasswordField
            aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
            aria-invalid={Boolean(fieldErrors.password)}
            autoComplete="new-password"
            className={getInputClassName(Boolean(fieldErrors.password))}
            disabled={isSubmitting}
            id="register-password"
            onChange={(event) => {
              setPassword(event.target.value);
              if (fieldErrors.password) {
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }
              if (formError) {
                setFormError(null);
              }
            }}
            placeholder="Crie uma senha forte"
            required
            value={password}
          />
          {fieldErrors.password ? (
            <p className="text-caption text-error" id="register-password-error">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label
            className="text-body-sm font-semibold text-foreground"
            htmlFor="register-confirm-password"
          >
            Confirmar senha
          </Label>
          <PasswordField
            aria-describedby={
              fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined
            }
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            autoComplete="new-password"
            className={getInputClassName(Boolean(fieldErrors.confirmPassword))}
            disabled={isSubmitting}
            id="register-confirm-password"
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
              }
              if (formError) {
                setFormError(null);
              }
            }}
            placeholder="Repita a senha"
            required
            value={confirmPassword}
          />
          {fieldErrors.confirmPassword ? (
            <p className="text-caption text-error" id="register-confirm-password-error">
              {fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>

        <AuthFormAlert message={formError} type="error" />

        <Button
          className="h-11 w-full rounded-xl font-semibold shadow-[0_18px_30px_hsl(var(--primary)/0.28)]"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>
    </AuthCard>
  );
}

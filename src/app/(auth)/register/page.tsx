"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/supabase/auth-errors";
import { ensurePlayerProfile } from "@/lib/supabase/player-profile";

function isEmailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [gamertag, setGamertag] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim();
    const cleanGamertag = gamertag.trim();

    if (!isEmailValid(cleanEmail)) {
      setError("Informe um email válido.");
      return;
    }
    if (cleanGamertag.length < 3) {
      setError("O EA Gamertag deve ter ao menos 3 caracteres.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("A confirmação de senha não confere.");
      return;
    }

    setIsSubmitting(true);

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
      setError(getAuthErrorMessage(signUpError.message));
      setIsSubmitting(false);
      return;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      setError("Não foi possível criar o usuário.");
      setIsSubmitting(false);
      return;
    }

    if (!signUpData.session) {
      setSuccess("Conta criada com sucesso. Verifique seu email para confirmar o cadastro.");
      setIsSubmitting(false);
      return;
    }

    try {
      await ensurePlayerProfile({
        supabase,
        userId,
        gamertag: cleanGamertag,
      });
    } catch (profileError) {
      console.error("Falha ao garantir perfil de jogador no cadastro:", profileError);
    }

    router.push("/profile");
    router.refresh();
  }

  return (
    <Card className="w-full border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create an account
        </CardTitle>
        <CardDescription>
          Enter your email below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gamertag">EA Gamertag (ID)</Label>
            <Input
              id="gamertag"
              type="text"
              placeholder="Your EA ID"
              value={gamertag}
              onChange={(event) => setGamertag(event.target.value)}
              autoComplete="nickname"
              required
            />
            <p className="text-[0.8rem] text-muted-foreground">
              This will be your public identity on the platform.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
              {success}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            {isSubmitting ? "Criando conta..." : "Create Account"}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button type="button" variant="outline" className="w-full" disabled>
              Google
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled>
              Discord
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border/50 pt-6">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

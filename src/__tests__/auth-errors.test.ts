import { describe, it, expect } from "vitest";
import { getAuthErrorMessage } from "@/lib/supabase/auth-errors";

describe("getAuthErrorMessage", () => {
  it('retorna mensagem PT para "invalid login credentials"', () => {
    expect(getAuthErrorMessage("Invalid login credentials")).toBe(
      "Email ou senha inválidos."
    );
  });

  it('retorna mensagem PT para "email not confirmed"', () => {
    expect(getAuthErrorMessage("Email not confirmed")).toBe(
      "Confirme seu email antes de entrar."
    );
  });

  it('retorna mensagem PT para "user already registered"', () => {
    expect(getAuthErrorMessage("User already registered")).toBe(
      "Este email já está cadastrado."
    );
  });

  it('retorna mensagem PT para "password should be at least"', () => {
    expect(getAuthErrorMessage("Password should be at least 6 characters")).toBe(
      "A senha precisa ter pelo menos 6 caracteres."
    );
  });

  it('retorna mensagem PT para "for security purposes"', () => {
    expect(getAuthErrorMessage("For security purposes, please wait before retrying")).toBe(
      "Aguarde alguns segundos antes de tentar novamente."
    );
  });

  it("retorna mensagem genérica de fallback para erros desconhecidos", () => {
    expect(getAuthErrorMessage("some completely unknown server error")).toBe(
      "Não foi possível concluir a operação. Tente novamente."
    );
  });

  it("é case-insensitive (entrada em maiúsculas ainda faz match)", () => {
    expect(getAuthErrorMessage("INVALID LOGIN CREDENTIALS")).toBe(
      "Email ou senha inválidos."
    );
  });

  it("detecta padrão no meio de uma mensagem mais longa", () => {
    expect(getAuthErrorMessage("Error occurred: invalid login credentials in auth module")).toBe(
      "Email ou senha inválidos."
    );
  });
});

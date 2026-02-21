export function getAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes("invalid login credentials")) {
    return "Email ou senha inválidos."
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirme seu email antes de entrar."
  }
  if (normalized.includes("user already registered")) {
    return "Este email já está cadastrado."
  }
  if (normalized.includes("password should be at least")) {
    return "A senha precisa ter pelo menos 6 caracteres."
  }
  if (normalized.includes("for security purposes")) {
    return "Aguarde alguns segundos antes de tentar novamente."
  }

  return "Não foi possível concluir a operação. Tente novamente."
}

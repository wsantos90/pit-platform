# Auth Pages — Design Spec

> Inherits: [MASTER.md](../MASTER.md)
> Routes: `/login`, `/register`, `/forgot-password`
> Task: 32 — Auth Pages

---

## Layout Structure

**Pattern:** Centered card on full-page background — no sidebar, no navbar.

```
┌─────────────────────────────────────┐
│         --background                │
│                                     │
│    ┌───────────────────────┐        │
│    │   Logo + Brand Name   │        │
│    │   ─────────────────   │        │
│    │   Form Content        │        │
│    │                       │        │
│    │   CTA Button          │        │
│    │   ─────────────────   │        │
│    │   Footer links        │        │
│    └───────────────────────┘        │
│                                     │
└─────────────────────────────────────┘
```

- Card: `max-w-sm` (384px), `rounded-lg`, `bg-card`, `p-8`
- Vertical centering: `min-h-screen flex items-center justify-center`
- Background: `bg-background` — dark navy, no pattern or image

---

## Components

### Logo/Brand
- P.I.T wordmark or logo icon centered above card
- `text-page-title` + `text-primary` for accent

### Form (Login)
- Email input (`type="email"`) + Password input (`type="password"`)
- "Remember me" checkbox (left) + "Forgot password?" link (right)
- Primary button full width: "Entrar"
- Divider: "ou" with `--border` lines (ghost)
- Footer: "Não tem conta? **Criar conta**" link

### Form (Register)
- Gamertag input + Email + Password + Confirm Password
- Platform select (PS5 / Xbox / PC)
- Primary button: "Criar conta"
- Footer: "Já tem conta? **Entrar**" link

### Form (Forgot Password)
- Email input only
- Primary button: "Enviar link de recuperação"
- Back link: "← Voltar ao login"

---

## Token Usage

| Element | Token | Class |
|---------|-------|-------|
| Page bg | `--background` | `bg-background` |
| Card | `--card` | `bg-card` |
| Input bg | `--input` | `bg-input` |
| Input border | `--border` / 15% | `border-border/15` |
| Primary btn | `--primary` | `bg-primary` |
| Link text | `--primary` | `text-primary` |
| Error msg | `--error` | `text-destructive` |

---

## States

### Loading (form submit)
- Button enters loading state (spinner + "Entrando...")
- Inputs disabled during request

### Error
- Field-level: Red border on input + error message below (`text-caption`, `--error`)
- Global: Toast (Sonner) with error message — `error` variant

### Success (Forgot Password)
- Replace form with: ✅ icon + "Link enviado! Verifique seu email." + "Reenviar" ghost link

---

## Responsive

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (375px) | Card takes `w-full mx-4`, padding `p-6` |
| Tablet+ (768px) | Centered `max-w-sm`, full padding |

---

## Accessibility

- `<form>` with `aria-label`
- Proper `<label for>` on all inputs
- Error messages linked via `aria-describedby`
- Focus visible ring on all interactive elements
- Password: toggle visibility button with `aria-label="Mostrar senha"`

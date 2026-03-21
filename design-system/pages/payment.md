# Payment Pages — Design Spec

> Inherits: [MASTER.md](../MASTER.md)
> Routes: `/payment/success`, `/payment/pending`, `/payment/failure`
> Task: 42 — Payment Flow Pages
> Provider: Mercado Pago (PIX)

---

## Layout Structure (all states)

**Pattern:** Centered card, same as auth pages — no sidebar, no navbar.

```
┌─────────────────────────────────────────────────┐
│              --background                        │
│                                                 │
│    ┌───────────────────────────────────┐        │
│    │   Status Icon (large)             │        │
│    │   Title                           │        │
│    │   Subtitle / next steps           │        │
│    │   ────────────────────────────    │        │
│    │   CTA Button(s)                   │        │
│    └───────────────────────────────────┘        │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Card: `max-w-sm`, `rounded-lg`, `bg-card`, `p-8`, `text-center`
- Vertical centering: `min-h-screen flex items-center justify-center`

---

## /payment/success

### Visual
- Icon: checkmark circle, 64px, `--result-win` (green)
- Title: "Pagamento confirmado!" (`text-section-title`)
- Subtitle: "Sua assinatura Championship está ativa. Aproveite todos os recursos do P.I.T." (`text-body-sm`, `--foreground-secondary`)
- Details row: Plano + Valor + Data (small, `text-caption`, `--foreground-secondary`)

### Actions
- Primary button: "Ir para meu clube" → `/team`
- Ghost link: "Ver detalhes do pagamento" → (future: receipt page or Mercado Pago link)

---

## /payment/pending

### Visual
- Icon: clock / hourglass, 64px, `--warning` (amber)
- Title: "Aguardando pagamento" (`text-section-title`)
- Subtitle: "Seu pagamento PIX está sendo processado. Isso pode levar alguns minutos." (`text-body-sm`, `--foreground-secondary`)

### PIX Info Block
- `--surface-raised` block, `rounded-md`, `p-4`
- QR Code display (if available from MP response)
- Copy PIX key button (copy icon + "Copiar chave") — copies to clipboard, shows "Copiado!" toast
- Expiration countdown: "Expira em 29:45" (`font-data`, `--accent-brand`)

### Actions
- Primary button: "Já paguei — verificar status" (polls MP status endpoint)
- Ghost link: "Voltar ao início" → `/team`

### Auto-poll behavior
- Page polls status every 10s for up to 5 minutes
- If confirmed → redirect to `/payment/success`
- If expired → redirect to `/payment/failure`

---

## /payment/failure

### Visual
- Icon: X circle, 64px, `--result-loss` (red)
- Title: "Pagamento não realizado" (`text-section-title`)
- Subtitle: "Ocorreu um problema com seu pagamento. Tente novamente ou entre em contato." (`text-body-sm`, `--foreground-secondary`)
- Error reason (if available from MP): small `text-caption` — "Motivo: [MP error code description]"

### Actions
- Primary button: "Tentar novamente" → re-initiates payment flow
- Ghost link: "Ir para meu clube" → `/team`

---

## Token Usage

| Element | Token |
|---------|-------|
| Success icon | `--result-win` |
| Pending icon | `--warning` |
| Failure icon | `--result-loss` |
| PIX block bg | `--surface-raised` |
| Countdown | `--accent-brand` |
| Card | `--card` |

---

## States

### Loading (status check)
- "Tentar novamente" button enters loading state (spinner + "Verificando...")
- Copy button: disabled during loading

### Success toast (copy PIX)
- Sonner toast: "Chave PIX copiada!" — `success` variant, 2s duration

---

## Responsive

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Card `w-full mx-4`, `p-6`, QR code scales to fit |
| Tablet+ | Centered `max-w-sm`, full padding |

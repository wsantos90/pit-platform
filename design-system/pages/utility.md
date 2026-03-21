# Utility Pages — Design Spec

> Inherits: [MASTER.md](../MASTER.md)
> Routes: `/not-found` (404), `/unauthorized` (403)
> Task: 43 — Utility Pages

---

## Layout Structure (both pages)

**Pattern:** Full-page centered, no sidebar, no navbar.

```
┌─────────────────────────────────────────────────┐
│              --background                        │
│                                                 │
│         [Large code/icon]                       │
│         Title                                   │
│         Subtitle                                │
│         CTA Button                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

- `min-h-screen flex flex-col items-center justify-center gap-4`
- No card wrapper — open layout on raw `--background`

---

## /not-found — 404

### Visual
- Error code: "404" — `text-[120px]`, `font-data`, `--border` color (very muted, almost ghost)
- Title: "Página não encontrada" (`text-section-title`, `--foreground`)
- Subtitle: "O endereço que você digitou não existe ou foi movido." (`text-body-sm`, `--foreground-secondary`)
- Decorative element: none — keep flat and clean (no illustrations, no glow)

### Actions
- Primary button: "Ir ao dashboard" → `/dashboard`
- Ghost link: "Voltar" (uses `router.back()`)

---

## /unauthorized — 403

### Visual
- Icon: shield with lock, 64px, `--muted-foreground` (Lucide `ShieldOff` or `Lock`)
- Title: "Acesso não autorizado" (`text-section-title`, `--foreground`)
- Subtitle: "Você não tem permissão para acessar esta página." (`text-body-sm`, `--foreground-secondary`)

### Actions
- Primary button: "Ir ao dashboard" → `/dashboard`
- Ghost link: "Sair" → triggers logout + redirect to `/login`

---

## Token Usage

| Element | Token |
|---------|-------|
| 404 code | `--border` |
| 403 icon | `--muted-foreground` |
| Page background | `--background` |
| Primary CTA | `--primary` |

---

## Notes

- Both pages use `export default function NotFound()` / `UnauthorizedPage()` — standard Next.js error conventions
- No loading state needed (purely static renders)
- No skeleton — instant render
- Accessible: `<h1>` for title, descriptive subtitle, focus on primary CTA on mount

---

## Responsive

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | 404 code scales to `text-[72px]`, icon smaller, buttons full-width |
| Tablet+ | Centered, full size |

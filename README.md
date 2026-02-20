# 🏆 P.I.T — Performance · Intelligence · Tracking

Plataforma de Gestão Competitiva para **FIFA Pro Clubs 11v11**.

> Versão: 1.0 | Autor: Wander — ThePitbullOne

---

## ⚡ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router, TypeScript) |
| Estilo | Tailwind CSS |
| Backend/BaaS | Supabase (PostgreSQL 15+) |
| Pagamento | Mercado Pago (PIX) |
| Automação | n8n (VPS) |
| Cookie Renewal | Puppeteer (VPS) |
| Deploy Frontend | Vercel |
| Deploy VPS | Ubuntu (n8n + Puppeteer) |

## 🚀 Setup Rápido

```bash
# 1. Instalar dependências
cd pit-platform
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais

# 3. Rodar em desenvolvimento
npm run dev
# → http://localhost:3000

# 4. (Opcional) Subir Supabase local
npx supabase start
npx supabase db push
```

## 📁 Estrutura do Projeto

```
pit-platform/
├── src/
│   ├── app/                    # Pages + API Routes (App Router)
│   │   ├── (auth)/             # Login, Register
│   │   ├── (dashboard)/        # Páginas autenticadas
│   │   ├── (public)/           # Perfis públicos, Rankings
│   │   └── api/                # Route Handlers
│   ├── components/             # Componentes React
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Lógica de negócio
│   ├── types/                  # TypeScript types
│   └── middleware.ts           # Supabase session
├── supabase/
│   ├── migrations/             # 17 SQL migrations
│   ├── seed.sql                # Dados iniciais
│   └── config.toml             # Config local
├── vps/
│   ├── cookie-service/         # Puppeteer + Express
│   └── n8n/workflows/          # Instruções n8n
├── .cursorrules                # Cursor AI
├── CLAUDE.md                   # Claude Code
├── AGENTS.md                   # OpenAI Codex
├── .github/copilot-instructions.md  # GitHub Copilot
└── .trae/rules                 # TRAE IDE
```

## 🏗️ Princípios de Arquitetura

| Princípio | Regra |
|-----------|-------|
| **SRP** | Cada módulo com um único motivo de mudança |
| **DRY** | Zero repetição — extraia helpers |
| **SSOT** | Dados: DB → API → UI |
| **KISS** | Solução mais simples possível |
| **YAGNI** | Só o necessário agora |
| **SOLID** | OCP/LSP/ISP/DIP quando relevante |

## 🔐 Variáveis de Ambiente

Veja `.env.example` para a lista completa. Credenciais necessárias:

- **Supabase:** URL + Anon Key + Service Role Key
- **Mercado Pago:** Access Token + Public Key + Webhook Secret
- **VPS:** Cookie Service URL + Secret
- **n8n:** Webhook Secret

## 📖 Docs de Referência

| Documento | Descrição |
|-----------|-----------|
| `Imput Manual/Schema prisma_P.I.T.md` | Arquitetura + Schema completo (2136 linhas) |
| `Imput Manual/FlowCharts_P.I.T.mermaid` | 12 flowcharts (FC01–FC12) |
| `Imput Manual/PRD_v1.5_P.I.T.docx` | Product Requirements Document |
| `Imput Manual/Design_System_v2_P.I.T.docx` | Design System |

## 🤖 AI Tool Configs

O projeto inclui configurações para 5 ferramentas de AI:

- **Cursor** → `.cursorrules`
- **Claude Code** → `CLAUDE.md`
- **GitHub Copilot / Codex** → `.github/copilot-instructions.md`
- **TRAE IDE** → `.trae/rules`
- **OpenAI Codex (multi-agent)** → `AGENTS.md`

---

Feito com ❤️ por Wander — ThePitbullOne 🐕

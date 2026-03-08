# PIT Collect — Extensão Chrome

Extensão que coleta partidas da EA Sports usando os cookies do browser local do admin, enviando os dados brutos ao backend PIT para parsing e persistência.

## Por que existe

A EA API usa Akamai para proteção anti-bot. Requests vindos de servidores (VPS/Vercel) são bloqueados com 403 quando os cookies Akamai expiram. A extensão faz as requests no contexto do browser do admin, onde os cookies são sempre frescos.

## Instalação (modo desenvolvedor)

1. Abra `chrome://extensions/`
2. Ative **"Modo do desenvolvedor"** (canto superior direito)
3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta `chrome-extension/` deste projeto
5. Anote o **ID da extensão** exibido (ex: `abcdefghijklmnopqrstuvwxyz123456`)

## Configuração no projeto

Após instalar, adicione o ID ao `.env.local`:

```env
NEXT_PUBLIC_PIT_EXTENSION_ID=<id_da_extensao>
```

E na Vercel (Settings → Environment Variables):
- `NEXT_PUBLIC_PIT_EXTENSION_ID` = mesmo valor

Após isso, faça redeploy na Vercel.

## Como usar

1. Acesse o jogo EA Sports FC no browser (para ter cookies Akamai válidos)
2. Abra o painel admin PIT: `https://pit-platform.vercel.app/admin#collect`
3. Clique em **"Atualizar campeonatos ativos"**
4. A extensão executa automaticamente e exibe progresso por clube

## Pré-requisitos

- Ter acessado `https://www.ea.com` ou o jogo EA FC recentemente (cookies frescos)
- Estar logado no PIT como admin

## Como o fluxo funciona

```
Admin clica no botão
  → POST /api/collect/tournament-run/start (sessão admin)
  → Retorna: { run_id, token, targets: [ea_club_id, ...] }

Admin page envia mensagem à extensão:
  chrome.runtime.sendMessage(EXT_ID, {
    type: 'START_COLLECT', runId, token, targets, backendBase
  })

Extensão (background.js):
  Para cada ea_club_id:
    1. Lê cookies Akamai do domínio .ea.com
    2. Faz GET na EA API com esses cookies
    3. POST /api/collect/tournament-run/{runId}/ingest (com x-collect-token)
    4. Backend parseia + persiste matches

  Envia progresso via chrome.runtime.sendMessage → página atualiza UI
```

## Permissões solicitadas

| Permissão | Motivo |
|-----------|--------|
| `cookies` | Ler cookies Akamai do domínio .ea.com |
| `host: *.ea.com` | Fazer requests para a EA API |
| `host: pit-platform.vercel.app` | Enviar dados coletados ao backend |
| `externally_connectable` | Receber mensagens da página admin do PIT |

## Troubleshooting

**"Extensão não encontrada"**: Verifique se está instalada e se `NEXT_PUBLIC_PIT_EXTENSION_ID` está correto.

**403 da EA API**: Acesse `https://www.ea.com` no browser para renovar os cookies Akamai e tente novamente.

**Token expirado**: Os tokens duram 30 minutos. Clique no botão novamente para gerar um novo run.

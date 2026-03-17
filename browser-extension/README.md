# PIT Collect 1.1.0

Extensao oficial do PIT para duas funcoes:
- coletar partidas de campeonatos direto do browser local;
- sincronizar os cookies EA/Akamai com o cookie service usado pelo Discovery.

## Estrutura oficial

- `browser-extension/`: fonte oficial unica da extensao.
- `dist/browser-extension/`: build operacional unica para carregar no navegador.
- `scripts/build-extension.js`: gera a build operacional a partir da mesma base oficial.

## Fluxo padrao recomendado

Use sempre a build gerada em `dist/browser-extension/`.
Assim voce evita diferenca entre ambientes e mantem o mesmo comportamento em local, preview e producao.

1. Garanta que `COOKIE_SERVICE_URL` e `COOKIE_SERVICE_SECRET` estejam no `.env.local`
2. Rode:

```bash
npm run build:extension
```

3. Abra `chrome://extensions/` ou `edge://extensions`
4. Ative o modo de desenvolvedor
5. Clique em `Carregar sem compactacao`
6. Selecione `dist/browser-extension/`
7. Copie o ID da extensao para `NEXT_PUBLIC_PIT_EXTENSION_ID`

Observacao: a extensao agora aceita `localhost`, `pit.gg` e subdominios `*.vercel.app`, incluindo URLs de preview/deploy da Vercel.

## Gerar build operacional

1. Garanta que `COOKIE_SERVICE_URL` e `COOKIE_SERVICE_SECRET` estejam no `.env.local`
2. Rode:

```bash
npm run build:extension
```

3. Abra `edge://extensions` ou `chrome://extensions`
4. Ative o modo de desenvolvedor
5. Clique em `Carregar sem compactacao`
6. Selecione `dist/browser-extension/`

Essa build injeta a configuracao do cookie service e habilita o sync automatico de cookies.
Ela e a build canonica para uso no PIT.

## Popup

Ao clicar na extensao, o popup mostra:
- `ak_bmsc`
- `bm_sv`
- quantidade de cookies `.ea.com`
- horario da ultima captura
- horario/status do ultimo sync
- erro do ultimo sync, se existir

Botoes:
- `Atualizar cookies`
- `Sincronizar agora`

## Fluxos suportados

### Collect

1. O painel admin inicia um `collect run`
2. A pagina envia `START_COLLECT` para a extensao
3. A extensao usa os cookies EA do browser para chamar a API da EA
4. Os dados brutos sao enviados ao backend PIT para ingestao

### Discovery / cookie service

1. A extensao le `ak_bmsc` e `bm_sv` do browser
2. Sincroniza esses cookies com o cookie service
3. O Discovery usa o `browser_proxy` do cookie service para buscar partidas

## Troubleshooting

- `Extensao nao detectada`: confirme o ID em `NEXT_PUBLIC_PIT_EXTENSION_ID`
- `Preview da Vercel nao detecta a extensao`: recarregue a extensao depois de atualizar o `manifest` e confirme que a URL atual termina em `.vercel.app`
- `Dois folders diferentes`: prefira sempre `dist/browser-extension/` e gere novamente com `npm run build:extension`
- `Sem cookies no popup`: visite `https://proclubs.ea.com` e recarregue o popup
- `Sync com erro`: confira se a build operacional foi gerada e carregada a partir de `dist/browser-extension/`
- `Discovery degradado`: abra o popup da extensao e clique em `Sincronizar agora`

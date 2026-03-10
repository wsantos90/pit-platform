# PIT Collect 1.1.0

Extensao oficial do PIT para duas funcoes:
- coletar partidas de campeonatos direto do browser local;
- sincronizar os cookies EA/Akamai com o cookie service usado pelo Discovery.

## Estrutura oficial

- `chrome-extension/`: fonte oficial da extensao para Chrome/dev.
- `dist/edge-extension/`: build gerada para o Edge.
- `scripts/create-edge-extension.js`: gera a build do Edge a partir da mesma base oficial.

## Instalar no Chrome ou em dev

1. Abra `chrome://extensions/`
2. Ative o modo de desenvolvedor
3. Clique em `Carregar sem compactacao`
4. Selecione a pasta `chrome-extension/`
5. Copie o ID da extensao para `NEXT_PUBLIC_PIT_EXTENSION_ID`

Observacao: nesta fonte, o popup de cookies funciona normalmente. O sync com o cookie service depende da build gerada para Edge ou de uma versao configurada com URL/secret.

## Gerar build do Edge

1. Garanta que `COOKIE_SERVICE_URL` e `COOKIE_SERVICE_SECRET` estejam no `.env.local`
2. Rode:

```bash
node scripts/create-edge-extension.js
```

3. Abra `edge://extensions`
4. Ative o modo de desenvolvedor
5. Clique em `Carregar sem compactacao`
6. Selecione `dist/edge-extension/`

Essa build injeta a configuracao do cookie service e habilita o sync automatico de cookies.

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
- `Sem cookies no popup`: visite `https://proclubs.ea.com` e recarregue o popup
- `Sync com erro`: confira se a build do Edge foi gerada e carregada a partir de `dist/edge-extension/`
- `Discovery degradado`: abra o popup da extensao e clique em `Sincronizar agora`

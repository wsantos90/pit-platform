# Cookie Service - Operacao (Task 9.5)

Este servico roda em Docker Swarm/Portainer (nao PM2), que e o equivalente operacional para manter processo ativo com restart automatico.

## 1) Deploy/Atualizacao

Pre-requisitos:
- Stack no Portainer usando `pit-platform/vps/cookie-service/stack.swarm.yml`
- Rede externa: `MenteEmBetaNet`
- Variaveis definidas no `.env.stack` da VPS

Passos (VPS):

```bash
cd /opt/pit-cookie-service
docker build -t pit-cookie-service:latest .
docker stack deploy -c stack.swarm.yml --with-registry-auth cookie-service
docker service ps cookie-service_cookie-service
```

## 2) Rollback

Opcao A (imagem versionada recomendada):

```bash
docker service update --image pit-cookie-service:<tag-anterior> cookie-service_cookie-service
```

Opcao B (forcar redeploy com compose anterior):

```bash
cd /opt/pit-cookie-service
docker stack deploy -c stack.swarm.yml --with-registry-auth cookie-service
```

## 3) Endpoints

- Health: `GET /health`
- Cookies: `GET /api/cookies` (exige header `x-secret`)
- Renovacao manual: `POST /renew` (exige header `x-secret`)

Exemplo:

```bash
curl -sS https://<COOKIE_SERVICE_DOMAIN>/health
curl -sS -H "x-secret: <COOKIE_SERVICE_SECRET>" https://<COOKIE_SERVICE_DOMAIN>/api/cookies
```

## 4) Logging Estruturado

Implementacao:
- Logger JSON com Winston
- Rotacao diaria (`cookie-service-YYYY-MM-DD.log`)
- Retencao padrao: 7 dias
- Diretorio: `/app/runtime/logs` (volume persistente da stack)

Variaveis:
- `LOG_LEVEL` (padrao `info`)
- `LOG_RETENTION_DAYS` (padrao `7`)
- `LOG_MAX_SIZE` (padrao `10m`)
- `LOG_DIR` e fixado na stack para `/app/runtime/logs`

Eventos principais:
- `renewal_start`
- `renewal_success`
- `renewal_failure`
- `fallback_browserless_success`
- `api_cookies_success`
- `api_cookies_failure`
- `service_started`

Observacao:
- Valores sensiveis de cookie nao sao logados. Apenas metadados (`source`, timestamps, presenca de cookies).

## 5) Como acessar logs

Portainer:
1. Abrir stack `cookie-service`
2. Abrir service `cookie-service`
3. Aba `Logs`

VPS (stream):

```bash
docker service logs -f cookie-service_cookie-service
```

VPS (arquivos rotacionados dentro do container em execucao):

```bash
CID=$(docker ps --filter name=cookie-service_cookie-service -q | head -n 1)
docker exec -it "$CID" ls -lah /app/runtime/logs
docker exec -it "$CID" tail -n 100 /app/runtime/logs/cookie-service-$(date +%F).log
```

## 6) Rotina operacional recomendada

Diario:
1. Verificar `GET /health` (`status`, `last_execution`, `next_execution`)
2. Conferir logs do service por erros de renovacao/fallback
3. Confirmar que `resolved_by` alterna corretamente (cache/puppeteer/browserless)

Semanal:
1. Conferir retencao de logs (max 7 dias)
2. Validar se cron esta com frequencia correta para a janela do Akamai
3. Revisar necessidade de ajustar `PUPPETEER_TIMEOUT_MS` e `COOKIE_RENEW_INTERVAL_MINUTES`

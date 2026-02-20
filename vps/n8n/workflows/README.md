# n8n Workflows — P.I.T

Workflows do n8n que orquestram processos automáticos do P.I.T.

## Workflows a criar no n8n:

1. **Discovery Cron** — Executa discovery snowball a cada 6h
   - Chama `POST /api/discovery/scan` com `N8N_WEBHOOK_SECRET`

2. **Coleta Periódica** — Coleta partidas a cada 1h
   - Chama `POST /api/cron/collect` com `N8N_WEBHOOK_SECRET`

3. **Expirar Matchmaking** — A cada 5min
   - Chama `POST /api/matchmaking/expire`

4. **Cookie Renewal** — A cada 4h
   - Chama `POST /cookie-service/renew`

5. **Payment Overdue Check** — A cada 1h
   - Verifica pagamentos pendentes e aplica strikes

## Exportar workflows

Para exportar um workflow do n8n:
```bash
# Via CLI
n8n export:workflow --id=<ID> --output=./workflows/<nome>.json

# Ou via UI: Settings → Export → Download JSON
```

## Importar workflows

```bash
n8n import:workflow --input=./workflows/<nome>.json
```

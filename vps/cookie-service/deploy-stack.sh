#!/usr/bin/env bash
set -euo pipefail

cd /opt/pit-cookie-service

if [[ ! -f .env.stack ]]; then
  echo "[deploy] arquivo .env.stack nao encontrado em /opt/pit-cookie-service"
  exit 1
fi

# Carrega .env.stack sem interpretar caracteres especiais do valor (ex: '&').
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ -z "$line" ]] && continue
  [[ "$line" == \#* ]] && continue
  export "$line"
done < .env.stack

echo "[deploy] COOKIE_SERVICE_DOMAIN=${COOKIE_SERVICE_DOMAIN:-<vazio>}"
echo "[deploy] EA_COOKIE_TARGET_URL=${EA_COOKIE_TARGET_URL:-<vazio>}"

docker build -t pit-cookie-service:latest .
docker stack deploy -c stack.swarm.yml --with-registry-auth cookie-service
docker service ps cookie-service_cookie-service --no-trunc | sed -n '1,30p'

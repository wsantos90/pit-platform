# VPS Contexto Operacional (local)

Este arquivo documenta contexto operacional para deploy/operacao.
Nao armazene senhas aqui.

- SSH host: 147.93.8.222
- SSH user: root
- Portainer: https://portainer.menteembeta.com.br/
- Rede Docker principal: MenteEmBetaNet
- TLS/HTTPS: Traefik

Stacks atuais informadas:
- browserless
- metabase
- n8n
- portainer
- postgres
- posts
- supabase (nao utilizar para PIT; usar Supabase oficial)
- traefik

Preferencia operacional:
- Novos servicos devem ser publicados como Stack no Portainer.

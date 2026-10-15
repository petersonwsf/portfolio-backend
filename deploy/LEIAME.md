# Deploy contínuo — backend

A cada push na branch `main`, o workflow `.github/workflows/deploy.yml` executa dois jobs:

1. **deploy_ghcr** — faz o build da imagem e envia para o GitHub Container Registry
   (`ghcr.io/<dono>/<repositorio>:main`).
2. **deploy_vps** — conecta na VPS por SSH, entra em `VPS_PROJECT_PATH`, faz o login temporário no GHCR,
   executa `docker compose pull backend` e `docker compose up -d backend` e limpa imagens antigas.

## Configuração no GitHub (Settings → Secrets and variables → Actions)

| Tipo | Nome | Descrição |
|---|---|---|
| Secret | `VPS_HOST` | IP ou domínio da VPS |
| Secret | `VPS_USERNAME` | usuário SSH (precisa usar o Docker) |
| Secret | `VPS_PORT` | porta SSH (ex.: `22`) |
| Secret | `VPS_SSH_KEY` | chave privada SSH usada no deploy |
| Secret | `SSH_PASSPHRASE` | senha da chave privada (deixe vazio se não tiver) |
| Secret | `VPS_PROJECT_PATH` | caminho absoluto, na VPS, do diretório com o `docker-compose.yml` |

O `GITHUB_TOKEN` é fornecido automaticamente pelo GitHub (usado no push para o GHCR e no login na VPS).

## Preparação da VPS (uma vez)

- Docker e Docker Compose instalados; o usuário SSH no grupo `docker`.
- Diretório de deploy com o `docker-compose.yml` (modelo em `deploy/docker-compose.yml`; o serviço precisa se chamar `backend`) e o `.env` do backend (veja `.env.example` na raiz do projeto).
- Chave pública correspondente a `VPS_SSH_KEY` em `~/.ssh/authorized_keys`.

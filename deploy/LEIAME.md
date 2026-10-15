# Deploy contínuo — backend

A cada push na branch `main` (ou manualmente, em *Actions → Deploy → Run workflow*), o workflow
`.github/workflows/deploy.yml`:

1. faz o build da imagem Docker (`Dockerfile`);
2. envia a imagem para o GitHub Container Registry (`ghcr.io/<dono>/<repositorio>`, tags `latest` e `sha-…`);
3. conecta na VPS por SSH, entra no diretório configurado;
4. faz `docker compose pull` e `docker compose up -d` para subir o container atualizado.

## Configuração no GitHub (Settings → Secrets and variables → Actions)

| Tipo | Nome | Descrição |
|---|---|---|
| Secret | `VPS_HOST` | IP ou domínio da VPS |
| Secret | `VPS_USER` | usuário SSH (precisa usar o Docker) |
| Secret | `VPS_PORT` | porta SSH (opcional, padrão 22) |
| Secret | `VPS_SSH_KEY` | chave privada SSH dedicada ao deploy |
| Secret | `VPS_KNOWN_HOSTS` | saída de `ssh-keyscan -p <porta> <host>` (confere a identidade da VPS) |
| Secret | `VPS_DIRETORIO` | caminho absoluto do diretório com o `docker-compose.yml` na VPS |

## Preparação da VPS (uma vez)

- Docker e Docker Compose instalados; o usuário SSH no grupo `docker`.
- Criar o diretório de deploy e colocar nele o `docker-compose.yml` (modelo em `deploy/docker-compose.yml`) e o arquivo `.env` com as variáveis do backend (veja `.env.example` na raiz do projeto).
- Adicionar a chave pública correspondente a `VPS_SSH_KEY` em `~/.ssh/authorized_keys`.
- Se o pacote no GHCR for privado, o workflow já faz `docker login` temporário com o `GITHUB_TOKEN` durante o deploy.

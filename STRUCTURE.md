# STRUCTURE.md — backend

API Node.js + TypeScript (Express 5, Mongoose, Zod, JWT) do portfólio. O MongoDB roda via Docker (`docker-compose.yml` na raiz).

## Comandos
- `npm run dev` — servidor com recarga automática (tsx).
- `npm run build` / `npm start` — compila para `dist/` e executa.
- `npm test` — testes (vitest). `npm run lint` — checagem de tipos (`tsc --noEmit`).
- `npm run gerar-hash -- "senha"` — gera o `ADMIN_SENHA_HASH` (bcrypt) para o `.env`.

## Estrutura
- `src/index.ts` — inicialização: valida ambiente, conecta ao banco, sobe o servidor.
- `src/app.ts` — monta o Express (middlewares globais e rotas); sem efeitos colaterais, usado nos testes.
- `src/config/env.ts` — leitura e validação (Zod) das variáveis de ambiente; o `.env` fica na raiz do repo.
- `src/config/banco.ts` — conexão com o MongoDB.
- `src/modelos/` — modelos Mongoose: `Projeto`, `Experiencia`, `Habilidade` (+ `comum.ts` com opções de serialização).
- `src/esquemas/` — esquemas Zod de entrada (`conteudo.ts`, `autenticacao.ts`).
- `src/rotas/` — `autenticacao.ts` (login), `uploads.ts` (envio de imagens), `criarRotasCrud.ts` (fábrica de CRUD: GET público, escrita protegida).
- `src/middlewares/` — `autenticar` (JWT), `validar` (corpo com Zod), `limitarTentativas` (login), `tratarErros`.
- `src/utils/` — `erros.ts` (`ErroHttp`), `imagem.ts` (detecção de PNG/JPEG/GIF/WebP pelos bytes), `tecnologias.ts` (valida tecnologias cadastradas).
- `src/servicos/armazenamento.ts` — cliente S3 (RustFS): envia imagens, cria o bucket e libera leitura pública dos objetos.
- `src/scripts/gerarHash.ts` — utilitário para gerar o hash da senha do admin.
- `tests/` — testes da API (autenticação, proteção das rotas, validação).

## Endpoints (`/api`)
| Método | Rota | Acesso |
|---|---|---|
| GET | `/saude` | público |
| POST | `/autenticacao/entrar` | público (limitado) — retorna `{ token }` |
| GET | `/projetos`, `/projetos/:id` | público |
| POST/PUT/DELETE | `/projetos`, `/projetos/:id` | admin (Bearer JWT) |
| GET/POST/PUT/DELETE | `/experiencias` | idem projetos |
| GET/POST/PUT/DELETE | `/habilidades` | idem projetos (campos: nome, categoria, nível Básico/Intermediário/Avançado, imagem) |
| POST | `/uploads` | admin — multipart (`arquivo`, `pasta`), retorna `{ url }` |

Projetos e experiências guardam `tecnologias` como referências a habilidades **cadastradas** (respostas trazem `{ id, nome, categoria, imagem }`).

## Deploy
- `Dockerfile` — build multi-stage (TypeScript → `dist`, dependências de produção) e execução como usuário não-root; as variáveis de ambiente são fornecidas pelo container.
- `.github/workflows/deploy.yml` — CD: build, push no GHCR e atualização do container na VPS por SSH.
- `deploy/` — `docker-compose.yml` de exemplo para a VPS e `LEIAME.md` com os secrets necessários.

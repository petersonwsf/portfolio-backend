# STRUCTURE.md — backend

API Node.js + TypeScript (Express 5, Mongoose, Zod, JWT) do portfólio. O MongoDB e o RustFS (S3) rodam via Docker (`docker-compose.yml` na raiz; copie `.env.example` para `.env`).

## Comandos
- `npm run dev` — servidor com recarga automática (tsx).
- `npm run build` / `npm start` — compila para `dist/` e executa.
- `npm test` — testes (vitest). `npm run lint` — checagem de tipos (`tsc --noEmit`).
- `npm run dados-teste` — insere dados fictícios (habilidades, projetos, experiências) no MongoDB **local**; `-- --limpar` remove só o que ele criou.
- `npm run gerar-hash -- "senha"` — gera o `ADMIN_SENHA_HASH` (bcrypt) para o `.env`.

## Estrutura
- `src/index.ts` — inicialização: valida ambiente, conecta ao banco, sobe o servidor.
- `src/app.ts` — monta o Express (middlewares globais e rotas); sem efeitos colaterais, usado nos testes.
- `src/config/env.ts` — leitura e validação (Zod) das variáveis de ambiente; o `.env` fica na raiz do projeto.
- `src/config/banco.ts` — conexão com o MongoDB.
- `src/modelos/` — modelos Mongoose: `Projeto` (inclui `codigoAplicacao`, o código do projeto no serviço de auditoria), `Experiencia`, `Habilidade`, `Mensagem` (contatos recebidos) (+ `comum.ts` com opções de serialização).
- `src/esquemas/` — esquemas Zod de entrada (`conteudo.ts`, `autenticacao.ts`, `contato.ts`, `auditoria.ts` — parâmetros da consulta de eventos).
- `src/rotas/` — `autenticacao.ts` (login), `uploads.ts` (envio de imagens), `criarRotasCrud.ts` (fábrica de CRUD: GET público, escrita protegida), `contato.ts` (formulário público: salva a mensagem e envia o e-mail), `mensagens.ts` (listar/marcar como lida/excluir — admin), `auditoria.ts` (consulta dos eventos de auditoria de um projeto — admin).
- `src/middlewares/` — `autenticar` (JWT), `validar` (corpo com Zod), `limitarTentativas` (login), `tratarErros`.
- `src/utils/` — `erros.ts` (`ErroHttp`), `imagem.ts` (detecção de PNG/JPEG/GIF/WebP pelos bytes), `tecnologias.ts` (valida tecnologias cadastradas).
- `src/servicos/armazenamento.ts` — cliente S3 (RustFS): envia imagens, cria o bucket e libera leitura pública dos objetos.
- `src/servicos/auditoria.ts` — cliente (somente leitura) do serviço central de auditoria: chama `GET /v1/events` com o token de leitura, valida a resposta com Zod e traduz os eventos para português. Erros viram `404` (aplicação não cadastrada), `400` (consulta inválida) ou `502` (serviço fora do ar/credencial errada); nunca registra URL nem token.
- `src/servicos/email/` — envio de e-mail com o padrão **Strategy**: `ProvedorEmail` (contrato), `ProvedorResend` (API do Resend via fetch, padrão) e `ProvedorSmtp` (nodemailer) e `criarProvedorEmail` (escolhe o provedor por `EMAIL_PROVEDOR`). Para trocar de provedor, crie outra classe que implemente `ProvedorEmail` e registre-a na fábrica.
- `src/scripts/dadosTeste.ts` — dados fictícios para testes locais (marcados com `seed-teste` na imagem; recusa bancos não locais).
- `src/scripts/gerarHash.ts` — utilitário para gerar o hash da senha do admin.
- `tests/` — testes da API (autenticação, proteção das rotas, validação) e da auditoria (`auditoria.test.ts`: rota e cliente, com o serviço simulado).

## Endpoints (`/api`)
| Método | Rota | Acesso |
|---|---|---|
| GET | `/saude` | público |
| POST | `/autenticacao/entrar` | público (limitado) — retorna `{ token }` |
| GET | `/projetos`, `/projetos/:id` | público |
| POST/PUT/DELETE | `/projetos`, `/projetos/:id` | admin (Bearer JWT) |
| GET/POST/PUT/DELETE | `/experiencias` | idem projetos |
| GET/POST/PUT/DELETE | `/habilidades` | idem projetos (campos: nome, categoria, nível Básico/Intermediário/Avançado, imagem) |
| POST | `/contato` | público (limitado a 5 por 10 min) — salva e envia por e-mail |
| GET | `/mensagens` | admin — lista as mensagens recebidas |
| PATCH/DELETE | `/mensagens/:id` | admin — marcar como lida (`{ lida }`) / excluir |
| POST | `/uploads` | admin — multipart (`arquivo`, `pasta`), retorna `{ url }` |
| GET | `/auditoria/eventos` | admin — eventos de auditoria de um projeto (veja abaixo) |

Projetos e experiências guardam `tecnologias` como referências a habilidades **cadastradas** (respostas trazem `{ id, nome, categoria, imagem }`).

## E-mail (Resend ou SMTP)
Provedor padrão: Resend (`EMAIL_PROVEDOR=resend`, com `RESEND_API_KEY` e `EMAIL_REMETENTE` de um domínio verificado); `smtp` continua disponível. Variáveis no `.env`: `EMAIL_DESTINO`, `EMAIL_REMETENTE`, `RESEND_API_KEY`, `SMTP_HOST`, `SMTP_PORTA`, `SMTP_SEGURO`, `SMTP_USUARIO`, `SMTP_SENHA`. A mensagem é sempre salva no banco antes do envio; se o SMTP estiver ausente ou falhar, ela continua visível no admin (`emailEnviado: false`).

## Auditoria
Os eventos ficam no **serviço central de auditoria** (repositório `audit-service`); o painel só lê. O navegador nunca fala com ele: esta API é o intermediário e guarda a credencial de leitura.
- O **código da aplicação** é um campo do projeto (`codigoAplicacao`, editado no admin): `[a-z0-9_-]`, 2 a 40 caracteres, igual ao cadastrado no serviço de auditoria. Vazio remove.
- `GET /api/auditoria/eventos?projetoId=` (obrigatório) e, opcionais, `servico`, `acao`, `resultado` (`SUCCESS`/`FAILURE`/`DENIED`), `ator` (UUID), `de`/`ate` (ISO-8601), `correlacao`, `limite` (1–100), `cursor`. Resposta: `{ itens, proximoCursor }`; cada item traz `id`, `idEvento`, `aplicacao`, `servico`, `acao`, `resultado`, `idAtor`, `tipoAtor`, `tipoAlvo`, `idAlvo`, `ip`, `agenteUsuario`, `idCorrelacao`, `versaoEsquema`, `detalhe`, `ocorridoEm`, `recebidoEm`.
- Erros: `404` projeto inexistente (ou código não cadastrado no serviço), `422` projeto sem código, `400` parâmetros inválidos, `502` serviço fora do ar, `503` auditoria não configurada.
- Variáveis (`.env`): `AUDITORIA_URL` (na VPS `http://audit-service:8090`, com o container na rede Docker `audit-net`) e `AUDITORIA_TOKEN_LEITURA` (o token de leitura do serviço, ≥ 32 caracteres). Ambas opcionais: sem elas a rota responde `503`.

## Deploy
- `Dockerfile` — build multi-stage (TypeScript → `dist`, dependências de produção) e execução como usuário não-root; as variáveis de ambiente são fornecidas pelo container.
- `.github/workflows/deploy.yml` — CD: build, push no GHCR e atualização do container na VPS por SSH.
- `deploy/` — `docker-compose.yml` de exemplo para a VPS e `LEIAME.md` com os secrets necessários.

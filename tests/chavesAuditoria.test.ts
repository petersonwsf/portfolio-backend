import bcrypt from 'bcryptjs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { criarApp } from '../src/app'
import { carregarAmbiente } from '../src/config/env'
import type { Armazenamento } from '../src/servicos/armazenamento'
import { type ClienteAdminAuditoria, criarClienteAdminAuditoria } from '../src/servicos/administracaoAuditoria'
import { ErroHttp } from '../src/utils/erros'

const SENHA = 'senha-de-teste-123'
const ID_CHAVE = '0191a6f0-0000-7000-8000-000000000001'
const VALOR_CHAVE = 'ak_valor-ficticio-somente-para-teste-0123456789'

const ambiente = carregarAmbiente({
    MONGODB_URI: 'mongodb://localhost:27017/teste',
    ADMIN_USUARIO: 'admin',
    ADMIN_SENHA_HASH: bcrypt.hashSync(SENHA, 4),
    JWT_SEGREDO: 'segredo-de-teste-com-mais-de-32-caracteres',
    S3_ENDPOINT: 'http://localhost:9000',
    S3_ACCESS_KEY: 'chave',
    S3_SECRET_KEY: 'segredo',
    S3_BUCKET: 'portfolio',
    S3_URL_PUBLICA: 'http://localhost:9000/portfolio',
})
const armazenamentoFalso: Armazenamento = {
    enviarImagem: async () => 'http://localhost:9000/portfolio/x.png',
    prepararBucket: async () => undefined,
}

const chamadas: string[] = []
const clienteFalso: ClienteAdminAuditoria = {
    listarAplicacoes: async () => [
        { codigo: 'social-flux', nome: 'Social Flux', ativa: true, retencaoDias: 365, criadaEm: '2026-11-26T10:00:00Z' },
    ],
    cadastrarAplicacao: async (dados) => {
        chamadas.push(`cadastrar:${dados.codigo}:${dados.nome}`)
        if (dados.codigo === 'repetida') throw new ErroHttp(409, 'Já existe uma aplicação com este código')
        return { codigo: dados.codigo, nome: dados.nome, ativa: true, retencaoDias: dados.retencaoDias ?? 365, criadaEm: '2026-11-26T10:00:00Z' }
    },
    listarChaves: async (codigo) => {
        if (codigo === 'inexistente') throw new ErroHttp(404, 'Aplicação não cadastrada')
        return [{ id: ID_CHAVE, prefixo: 'ak_abcd', ativa: true, criadaEm: '2026-11-26T10:00:00Z', ultimoUsoEm: null, revogadaEm: null }]
    },
    criarChave: async (codigo) => {
        if (codigo === 'cheia') throw new ErroHttp(409, 'A aplicação já tem 2 chaves ativas; revogue uma antes de criar outra')
        return { id: ID_CHAVE, aplicacao: codigo, prefixo: 'ak_abcd', valor: VALOR_CHAVE, criadaEm: '2026-11-26T10:00:00Z' }
    },
    revogarChave: async (codigo, id) => {
        chamadas.push(`revogar:${codigo}:${id}`)
    },
}

let servidor: Server
let servidorSemAdmin: Server
let base = ''
let baseSemAdmin = ''
let token = ''

const porta = (s: Server) => `http://127.0.0.1:${(s.address() as AddressInfo).port}`

const chamar = async (url: string, metodo: string, caminho: string, opcoes: { corpo?: unknown; comToken?: boolean } = {}) => {
    const { corpo, comToken = true } = opcoes
    const resposta = await fetch(`${url}${caminho}`, {
        method: metodo,
        headers: {
            ...(comToken ? { authorization: `Bearer ${token}` } : {}),
            ...(corpo === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
    const texto = await resposta.text()
    return {
        status: resposta.status,
        cache: resposta.headers.get('cache-control'),
        corpo: texto ? (JSON.parse(texto) as Record<string, unknown> | unknown[]) : null,
    }
}

beforeAll(async () => {
    servidor = criarApp(ambiente, armazenamentoFalso, null, { cliente: null, admin: clienteFalso }).listen(0)
    servidorSemAdmin = criarApp(ambiente, armazenamentoFalso, null, { cliente: null, admin: null }).listen(0)
    base = porta(servidor)
    baseSemAdmin = porta(servidorSemAdmin)
    const login = await fetch(`${base}/api/autenticacao/entrar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', senha: SENHA }),
    })
    token = String(((await login.json()) as Record<string, unknown>).token)
})

afterAll(() => {
    servidor.close()
    servidorSemAdmin.close()
})

describe('rotas /api/auditoria/aplicacoes', () => {
    it('exigem autenticação de admin em todas as rotas', async () => {
        const rotas: [string, string][] = [
            ['GET', '/api/auditoria/aplicacoes'],
            ['POST', '/api/auditoria/aplicacoes'],
            ['GET', '/api/auditoria/aplicacoes/social-flux/chaves'],
            ['POST', '/api/auditoria/aplicacoes/social-flux/chaves'],
            ['DELETE', `/api/auditoria/aplicacoes/social-flux/chaves/${ID_CHAVE}`],
        ]
        for (const [metodo, caminho] of rotas) {
            const { status } = await chamar(base, metodo, caminho, { comToken: false })
            expect(status, `${metodo} ${caminho}`).toBe(401)
        }
    })

    it('responde 503 quando a administração não está configurada', async () => {
        const { status } = await chamar(baseSemAdmin, 'GET', '/api/auditoria/aplicacoes')
        expect(status).toBe(503)
    })

    it('lista as aplicações', async () => {
        const { status, corpo } = await chamar(base, 'GET', '/api/auditoria/aplicacoes')
        expect(status).toBe(200)
        expect(corpo).toEqual([expect.objectContaining({ codigo: 'social-flux', ativa: true })])
    })

    it('cadastra uma aplicação e valida o código', async () => {
        const ok = await chamar(base, 'POST', '/api/auditoria/aplicacoes', { corpo: { codigo: 'social-flux', nome: ' Social Flux ' } })
        expect(ok.status).toBe(201)
        expect(chamadas).toContain('cadastrar:social-flux:Social Flux')

        for (const corpo of [{ codigo: 'Social Flux', nome: 'x' }, { codigo: 'a', nome: 'x' }, { codigo: 'ok', nome: '' }]) {
            const { status } = await chamar(base, 'POST', '/api/auditoria/aplicacoes', { corpo })
            expect(status).toBe(400)
        }
    })

    it('repassa o conflito de código repetido', async () => {
        const { status, corpo } = await chamar(base, 'POST', '/api/auditoria/aplicacoes', { corpo: { codigo: 'repetida', nome: 'x' } })
        expect(status).toBe(409)
        expect((corpo as Record<string, unknown>).mensagem).toContain('Já existe')
    })

    it('lista as chaves (só metadados) e repassa o 404', async () => {
        const lista = await chamar(base, 'GET', '/api/auditoria/aplicacoes/social-flux/chaves')
        expect(lista.status).toBe(200)
        expect(JSON.stringify(lista.corpo)).not.toContain('ak_valor')
        expect((await chamar(base, 'GET', '/api/auditoria/aplicacoes/inexistente/chaves')).status).toBe(404)
        expect((await chamar(base, 'GET', '/api/auditoria/aplicacoes/INVALIDO!/chaves')).status).toBe(400)
    })

    it('cria a chave devolvendo o valor sem cache', async () => {
        const { status, corpo, cache } = await chamar(base, 'POST', '/api/auditoria/aplicacoes/social-flux/chaves')
        expect(status).toBe(201)
        expect(cache).toBe('no-store')
        expect(corpo).toEqual(expect.objectContaining({ id: ID_CHAVE, valor: VALOR_CHAVE }))
    })

    it('repassa o limite de 2 chaves ativas como 409', async () => {
        const { status, corpo } = await chamar(base, 'POST', '/api/auditoria/aplicacoes/cheia/chaves')
        expect(status).toBe(409)
        expect((corpo as Record<string, unknown>).mensagem).toContain('2 chaves ativas')
    })

    it('revoga a chave e rejeita identificador inválido', async () => {
        const ok = await chamar(base, 'DELETE', `/api/auditoria/aplicacoes/social-flux/chaves/${ID_CHAVE}`)
        expect(ok.status).toBe(204)
        expect(chamadas).toContain(`revogar:social-flux:${ID_CHAVE}`)
        expect((await chamar(base, 'DELETE', '/api/auditoria/aplicacoes/social-flux/chaves/nao-e-uuid')).status).toBe(400)
    })
})

describe('criarClienteAdminAuditoria', () => {
    const TOKEN = 'token-de-admin-ficticio-com-mais-de-32-caracteres'
    const cliente = criarClienteAdminAuditoria('http://audit:8090/', TOKEN)

    const responder = (status: number, corpo?: unknown) =>
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(corpo === undefined ? null : JSON.stringify(corpo), { status }))

    afterEach(() => vi.restoreAllMocks())

    it('envia o token de admin só no cabeçalho e traduz a chave criada', async () => {
        const espiao = responder(201, {
            id: ID_CHAVE,
            application: 'social-flux',
            prefix: 'ak_abcd',
            key: VALOR_CHAVE,
            createdAt: '2026-11-26T10:00:00Z',
        })
        const criada = await cliente.criarChave('social-flux')

        expect(criada).toEqual({ id: ID_CHAVE, aplicacao: 'social-flux', prefixo: 'ak_abcd', valor: VALOR_CHAVE, criadaEm: '2026-11-26T10:00:00Z' })
        const [url, init] = espiao.mock.calls[0] as [string, RequestInit]
        expect(url).toBe('http://audit:8090/v1/admin/applications/social-flux/keys')
        expect(init.method).toBe('POST')
        expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${TOKEN}`)
    })

    it('traduz a lista de chaves', async () => {
        responder(200, [{ id: ID_CHAVE, prefix: 'ak_abcd', active: false, createdAt: 'a', lastUsedAt: 'b', revokedAt: 'c' }])
        expect(await cliente.listarChaves('social-flux')).toEqual([
            { id: ID_CHAVE, prefixo: 'ak_abcd', ativa: false, criadaEm: 'a', ultimoUsoEm: 'b', revogadaEm: 'c' },
        ])
    })

    it('cadastra a aplicação enviando os nomes do contrato do serviço', async () => {
        const espiao = responder(201, { code: 'social-flux', name: 'Social Flux', active: true, retentionDays: 90, createdAt: 'a' })
        await cliente.cadastrarAplicacao({ codigo: 'social-flux', nome: 'Social Flux', retencaoDias: 90 })
        const [, init] = espiao.mock.calls[0] as [string, RequestInit]
        expect(JSON.parse(String(init.body))).toEqual({ code: 'social-flux', name: 'Social Flux', retentionDays: 90 })
    })

    it('repassa a mensagem de 409 e esconde 401/5xx e falha de rede, sem vazar o token', async () => {
        responder(409, { mensagem: 'A aplicação já tem 2 chaves ativas; revogue uma antes de criar outra', codigo: 'limite_de_chaves' })
        await expect(cliente.criarChave('x')).rejects.toMatchObject({ status: 409, message: expect.stringContaining('2 chaves ativas') })

        const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        for (const status of [401, 403, 500]) {
            responder(status, { mensagem: 'interno' })
            await expect(cliente.listarAplicacoes()).rejects.toMatchObject({ status: 502, message: 'Serviço de auditoria indisponível' })
        }
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error(`falha com ${TOKEN}`))
        await expect(cliente.listarAplicacoes()).rejects.toMatchObject({ status: 502, message: 'Serviço de auditoria indisponível' })
        expect(JSON.stringify(erro.mock.calls)).not.toContain(TOKEN)
    })

    it('trata resposta inesperada como 502', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        responder(200, { qualquer: 'coisa' })
        await expect(cliente.criarChave('x')).rejects.toMatchObject({ status: 502 })
    })

    it('revoga com DELETE', async () => {
        const espiao = responder(204)
        await cliente.revogarChave('social-flux', ID_CHAVE)
        const [url, init] = espiao.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(`http://audit:8090/v1/admin/applications/social-flux/keys/${ID_CHAVE}`)
        expect(init.method).toBe('DELETE')
    })
})

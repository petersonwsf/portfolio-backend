import bcrypt from 'bcryptjs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { criarApp } from '../src/app'
import { carregarAmbiente } from '../src/config/env'
import type { BuscarProjeto } from '../src/rotas/auditoria'
import type { Armazenamento } from '../src/servicos/armazenamento'
import { type ClienteAuditoria, criarClienteAuditoria, type FiltrosEventos } from '../src/servicos/auditoria'

const SENHA = 'senha-de-teste-123'
const ID_COM_CODIGO = 'a'.repeat(24)
const ID_SEM_CODIGO = 'b'.repeat(24)
const ID_INEXISTENTE = 'c'.repeat(24)

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

const buscarProjeto: BuscarProjeto = async (id) => {
    if (id === ID_COM_CODIGO) return { codigoAplicacao: 'social-flux' }
    if (id === ID_SEM_CODIGO) return {}
    return null
}

const chamadas: FiltrosEventos[] = []
const clienteFalso: ClienteAuditoria = {
    listarEventos: async (filtros) => {
        chamadas.push(filtros)
        return { itens: [], proximoCursor: 'proxima' }
    },
}

let servidor: Server
let servidorSemAuditoria: Server
let base = ''
let baseSemAuditoria = ''
let token = ''

const porta = (servidor: Server) => `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`

const consultar = async (url: string, caminho: string, comToken = true) => {
    const resposta = await fetch(`${url}${caminho}`, { headers: comToken ? { authorization: `Bearer ${token}` } : {} })
    const texto = await resposta.text()
    return { status: resposta.status, corpo: texto ? (JSON.parse(texto) as Record<string, unknown>) : null }
}

beforeAll(async () => {
    servidor = criarApp(ambiente, armazenamentoFalso, null, { cliente: clienteFalso, buscarProjeto }).listen(0)
    servidorSemAuditoria = criarApp(ambiente, armazenamentoFalso, null, { cliente: null, buscarProjeto }).listen(0)
    base = porta(servidor)
    baseSemAuditoria = porta(servidorSemAuditoria)
    const login = await fetch(`${base}/api/autenticacao/entrar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', senha: SENHA }),
    })
    token = String(((await login.json()) as Record<string, unknown>).token)
})

afterAll(() => {
    servidor.close()
    servidorSemAuditoria.close()
})

describe('GET /api/auditoria/eventos', () => {
    it('exige autenticação de admin', async () => {
        const { status } = await consultar(base, `/api/auditoria/eventos?projetoId=${ID_COM_CODIGO}`, false)
        expect(status).toBe(401)
    })

    it('usa o código do projeto e repassa os filtros', async () => {
        chamadas.length = 0
        const consulta = new URLSearchParams({
            projetoId: ID_COM_CODIGO,
            acao: 'LOGIN_FAILURE',
            resultado: 'FAILURE',
            servico: 'auth',
            limite: '20',
            de: '2026-01-01T00:00:00Z',
        })

        const { status, corpo } = await consultar(base, `/api/auditoria/eventos?${consulta}`)

        expect(status).toBe(200)
        expect(corpo).toEqual({ itens: [], proximoCursor: 'proxima' })
        expect(chamadas).toEqual([
            {
                aplicacao: 'social-flux',
                acao: 'LOGIN_FAILURE',
                resultado: 'FAILURE',
                servico: 'auth',
                limite: 20,
                de: '2026-01-01T00:00:00Z',
            },
        ])
    })

    it('retorna 404 para projeto inexistente e 422 para projeto sem código', async () => {
        expect((await consultar(base, `/api/auditoria/eventos?projetoId=${ID_INEXISTENTE}`)).status).toBe(404)
        const semCodigo = await consultar(base, `/api/auditoria/eventos?projetoId=${ID_SEM_CODIGO}`)
        expect(semCodigo.status).toBe(422)
        expect(String(semCodigo.corpo?.mensagem)).toContain('código')
    })

    it('valida os parâmetros', async () => {
        for (const consulta of [
            '',
            'projetoId=123',
            `projetoId=${ID_COM_CODIGO}&resultado=TALVEZ`,
            `projetoId=${ID_COM_CODIGO}&ator=nao-e-uuid`,
            `projetoId=${ID_COM_CODIGO}&limite=1000`,
            `projetoId=${ID_COM_CODIGO}&de=ontem`,
        ]) {
            expect((await consultar(base, `/api/auditoria/eventos?${consulta}`)).status, consulta).toBe(400)
        }
    })

    it('responde 503 quando a auditoria não está configurada', async () => {
        const { status } = await consultar(baseSemAuditoria, `/api/auditoria/eventos?projetoId=${ID_COM_CODIGO}`)
        expect(status).toBe(503)
    })
})

describe('cliente do serviço de auditoria', () => {
    const cliente = criarClienteAuditoria('http://auditoria.interno:8090/', 'token-de-leitura-com-mais-de-32-caracteres')

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('chama /v1/events com o token e traduz o evento para português', async () => {
        const fetchFalso = vi.fn(async () =>
            Response.json({
                items: [
                    {
                        id: 7,
                        eventId: 'e-1',
                        application: 'social-flux',
                        service: 'auth',
                        action: 'LOGIN_FAILURE',
                        outcome: 'FAILURE',
                        actorId: null,
                        actorType: 'ANONYMOUS',
                        ip: '10.0.0.1',
                        correlationId: 'corr-1234567890',
                        schemaVersion: 1,
                        detail: { motivo: 'senha' },
                        occurredAt: '2026-11-26T10:00:00Z',
                        receivedAt: '2026-11-26T10:00:02Z',
                    },
                ],
                nextCursor: null,
            })
        )
        vi.stubGlobal('fetch', fetchFalso)

        const pagina = await cliente.listarEventos({ aplicacao: 'social-flux', acao: 'LOGIN_FAILURE', limite: 10 })

        const [url, opcoes] = fetchFalso.mock.calls[0] as unknown as [string, RequestInit]
        expect(url).toBe('http://auditoria.interno:8090/v1/events?application=social-flux&action=LOGIN_FAILURE&limit=10')
        expect((opcoes.headers as Record<string, string>).authorization).toBe(
            'Bearer token-de-leitura-com-mais-de-32-caracteres'
        )
        expect(pagina.proximoCursor).toBeNull()
        expect(pagina.itens[0]).toMatchObject({
            acao: 'LOGIN_FAILURE',
            resultado: 'FAILURE',
            tipoAtor: 'ANONYMOUS',
            idAtor: null,
            idCorrelacao: 'corr-1234567890',
            detalhe: { motivo: 'senha' },
            ocorridoEm: '2026-11-26T10:00:00Z',
        })
    })

    it('traduz os erros do serviço sem vazar detalhes internos', async () => {
        const responder = (status: number, corpo: unknown) =>
            vi.stubGlobal('fetch', vi.fn(async () => Response.json(corpo, { status })))
        vi.spyOn(console, 'error').mockImplementation(() => undefined)

        responder(404, { codigo: 'aplicacao_nao_encontrada' })
        await expect(cliente.listarEventos({ aplicacao: 'x' })).rejects.toMatchObject({ status: 404 })

        responder(400, { mensagem: 'Cursor inválido' })
        await expect(cliente.listarEventos({ aplicacao: 'x' })).rejects.toMatchObject({ status: 400, message: 'Cursor inválido' })

        responder(401, { codigo: 'nao_autenticado' })
        await expect(cliente.listarEventos({ aplicacao: 'x' })).rejects.toMatchObject({
            status: 502,
            message: 'Serviço de auditoria indisponível',
        })

        responder(200, { formato: 'inesperado' })
        await expect(cliente.listarEventos({ aplicacao: 'x' })).rejects.toMatchObject({ status: 502 })

        vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('ECONNREFUSED'))))
        await expect(cliente.listarEventos({ aplicacao: 'x' })).rejects.toMatchObject({ status: 502 })
    })
})

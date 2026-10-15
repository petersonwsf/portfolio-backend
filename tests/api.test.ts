import bcrypt from 'bcryptjs'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { criarApp } from '../src/app'
import { carregarAmbiente } from '../src/config/env'

const SENHA = 'senha-de-teste-123'

let servidor: Server
let base = ''

const requisitar = async (caminho: string, opcoes: RequestInit & { token?: string } = {}) => {
    const { token, headers, ...resto } = opcoes
    const resposta = await fetch(`${base}${caminho}`, {
        ...resto,
        headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
    })
    const texto = await resposta.text()
    return { status: resposta.status, corpo: texto ? (JSON.parse(texto) as Record<string, unknown>) : null }
}

const entrar = async () => {
    const { corpo } = await requisitar('/api/autenticacao/entrar', {
        method: 'POST',
        body: JSON.stringify({ usuario: 'admin', senha: SENHA }),
    })
    return String(corpo?.token)
}

beforeAll(async () => {
    const ambiente = carregarAmbiente({
        MONGODB_URI: 'mongodb://localhost:27017/teste',
        ADMIN_USUARIO: 'admin',
        ADMIN_SENHA_HASH: bcrypt.hashSync(SENHA, 4),
        JWT_SEGREDO: 'segredo-de-teste-com-mais-de-32-caracteres',
    })
    servidor = criarApp(ambiente).listen(0)
    base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`
})

afterAll(() => {
    servidor.close()
})

describe('saúde e rotas desconhecidas', () => {
    it('responde ok em /api/saude', async () => {
        const { status, corpo } = await requisitar('/api/saude')
        expect(status).toBe(200)
        expect(corpo).toEqual({ status: 'ok' })
    })

    it('retorna 404 para rota inexistente', async () => {
        const { status } = await requisitar('/api/nada')
        expect(status).toBe(404)
    })
})

describe('autenticação', () => {
    it('rejeita credenciais inválidas', async () => {
        const { status } = await requisitar('/api/autenticacao/entrar', {
            method: 'POST',
            body: JSON.stringify({ usuario: 'admin', senha: 'errada' }),
        })
        expect(status).toBe(401)
    })

    it('valida o corpo do login', async () => {
        const { status } = await requisitar('/api/autenticacao/entrar', { method: 'POST', body: JSON.stringify({}) })
        expect(status).toBe(400)
    })

    it('retorna token com credenciais corretas', async () => {
        expect((await entrar()).length).toBeGreaterThan(20)
    })
})

describe('proteção das rotas de escrita', () => {
    it.each([
        ['POST', '/api/projetos'],
        ['PUT', '/api/projetos/64b64b64b64b64b64b64b64b'],
        ['DELETE', '/api/experiencias/64b64b64b64b64b64b64b64b'],
        ['POST', '/api/habilidades'],
    ])('exige autenticação em %s %s', async (metodo, caminho) => {
        const { status } = await requisitar(caminho, { method: metodo, body: JSON.stringify({}) })
        expect(status).toBe(401)
    })

    it('rejeita token inválido', async () => {
        const { status } = await requisitar('/api/projetos', { method: 'POST', token: 'invalido', body: '{}' })
        expect(status).toBe(401)
    })
})

describe('validação de entrada (admin autenticado)', () => {
    it('retorna 400 com detalhes para projeto inválido', async () => {
        const token = await entrar()
        const { status, corpo } = await requisitar('/api/projetos', {
            method: 'POST',
            token,
            body: JSON.stringify({ nome: '', ano: 1800 }),
        })
        expect(status).toBe(400)
        expect(Array.isArray(corpo?.detalhes)).toBe(true)
    })

    it('rejeita categoria de habilidade fora da lista', async () => {
        const token = await entrar()
        const { status } = await requisitar('/api/habilidades', {
            method: 'POST',
            token,
            body: JSON.stringify({ nome: 'X', categoria: 'Inexistente' }),
        })
        expect(status).toBe(400)
    })

    it('rejeita identificador inválido', async () => {
        const token = await entrar()
        const { status } = await requisitar('/api/projetos/abc', { method: 'DELETE', token })
        expect(status).toBe(400)
    })
})

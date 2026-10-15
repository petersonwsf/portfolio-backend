import bcrypt from 'bcryptjs'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { criarApp } from '../src/app'
import { carregarAmbiente } from '../src/config/env'
import type { Armazenamento } from '../src/servicos/armazenamento'

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

let tokenEmCache: string | null = null

// reutiliza o token: o login tem limite de tentativas por IP
const entrar = async () => {
    if (tokenEmCache) return tokenEmCache
    const { corpo } = await requisitar('/api/autenticacao/entrar', {
        method: 'POST',
        body: JSON.stringify({ usuario: 'admin', senha: SENHA }),
    })
    tokenEmCache = String(corpo?.token)
    return tokenEmCache
}

const enviarArquivo = async (conteudo: Uint8Array, pasta: string, token?: string) => {
    const formulario = new FormData()
    formulario.append('pasta', pasta)
    formulario.append('arquivo', new Blob([conteudo]), 'arquivo.bin')
    const resposta = await fetch(`${base}/api/uploads`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: formulario,
    })
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> }
}

beforeAll(async () => {
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
        enviarImagem: async (_arquivo, extensao, _tipo, pasta) =>
            `http://localhost:9000/portfolio/${pasta}/teste.${extensao}`,
        prepararBucket: async () => undefined,
    }
    servidor = criarApp(ambiente, armazenamentoFalso).listen(0)
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
        ['GET', '/api/habilidades/catalogo'],
        ['PATCH', '/api/habilidades/64b64b64b64b64b64b64b64b/dominada'],
    ])('exige autenticação em %s %s', async (metodo, caminho) => {
        const { status } = await requisitar(caminho, { method: metodo, body: metodo === 'GET' ? undefined : '{}' })
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

    it('rejeita tecnologias que não são identificadores', async () => {
        const token = await entrar()
        const { status } = await requisitar('/api/projetos', {
            method: 'POST',
            token,
            body: JSON.stringify({
                nome: 'X',
                categoria: 'Jogo',
                ano: 2024,
                descricao: 'Descrição',
                tecnologias: ['React'],
            }),
        })
        expect(status).toBe(400)
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

    it('exige booleano ao marcar habilidade como dominada', async () => {
        const token = await entrar()
        const { status } = await requisitar('/api/habilidades/64b64b64b64b64b64b64b64b/dominada', {
            method: 'PATCH',
            token,
            body: JSON.stringify({ dominada: 'sim' }),
        })
        expect(status).toBe(400)
    })

    it('rejeita identificador inválido', async () => {
        const token = await entrar()
        const { status } = await requisitar('/api/projetos/abc', { method: 'DELETE', token })
        expect(status).toBe(400)
    })
})

describe('upload de imagens', () => {
    const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

    it('exige autenticação', async () => {
        const { status } = await enviarArquivo(PNG, 'projetos')
        expect(status).toBe(401)
    })

    it('aceita PNG e devolve a URL pública', async () => {
        const token = await entrar()
        const { status, corpo } = await enviarArquivo(PNG, 'projetos', token)
        expect(status).toBe(201)
        expect(String(corpo.url)).toBe('http://localhost:9000/portfolio/projetos/teste.png')
    })

    it('recusa arquivos que não são imagens suportadas (ex.: SVG)', async () => {
        const token = await entrar()
        const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
        const { status } = await enviarArquivo(svg, 'projetos', token)
        expect(status).toBe(415)
    })

    it('recusa pasta inválida', async () => {
        const token = await entrar()
        const { status } = await enviarArquivo(PNG, '../fora', token)
        expect(status).toBe(400)
    })
})

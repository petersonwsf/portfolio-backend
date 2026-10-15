import { type RequestHandler, Router } from 'express'
import { isValidObjectId, type Model } from 'mongoose'
import type { ZodType } from 'zod'
import { validarCorpo } from '../middlewares/validar'
import { ErroHttp } from '../utils/erros'

const CAMPOS_INTERNOS = new Set(['_id', '__v', 'createdAt', 'updatedAt'])

interface OpcoesCrud<T> {
    modelo: Model<T>
    esquema: ZodType<unknown>
    nomeSingular: string
    autenticar: RequestHandler
    /** Filtro aplicado na listagem pública (ex.: apenas habilidades dominadas). */
    filtroListagem?: Record<string, unknown>
    /** Campo de referência a popular nas respostas (ex.: tecnologias → habilidades). */
    popular?: { caminho: string; selecionar: string }
    /** Validação extra (regras de negócio) executada após o esquema, antes de gravar. */
    validarExtra?: (corpo: Record<string, unknown>) => Promise<void>
}

/**
 * Cria as rotas de um recurso de conteúdo:
 * leitura pública (GET) e escrita protegida (POST/PUT/DELETE exigem admin autenticado).
 */
export function criarRotasCrud<T>({
    modelo,
    esquema,
    nomeSingular,
    autenticar,
    filtroListagem = {},
    popular,
    validarExtra,
}: OpcoesCrud<T>): Router {
    const roteador = Router()

    const exigirIdValido: RequestHandler = (req, _res, next) => {
        if (!isValidObjectId(req.params.id)) {
            next(new ErroHttp(400, 'Identificador inválido'))
            return
        }
        next()
    }

    const regrasDeNegocio: RequestHandler = async (req, _res, next) => {
        try {
            await validarExtra?.(req.body as Record<string, unknown>)
            next()
        } catch (erro) {
            next(erro)
        }
    }

    roteador.get('/', async (_req, res) => {
        const consulta = modelo.find(filtroListagem).sort({ createdAt: 1 })
        if (popular) consulta.populate(popular.caminho, popular.selecionar)
        res.json(await consulta)
    })

    roteador.get('/:id', exigirIdValido, async (req, res) => {
        const consulta = modelo.findById(req.params.id)
        if (popular) consulta.populate(popular.caminho, popular.selecionar)
        const item = await consulta
        if (!item) throw new ErroHttp(404, `${nomeSingular} não encontrado(a)`)
        res.json(item)
    })

    roteador.post('/', autenticar, validarCorpo(esquema), regrasDeNegocio, async (req, res) => {
        const criado = await modelo.create(req.body as T)
        if (popular) await modelo.populate(criado, { path: popular.caminho, select: popular.selecionar })
        res.status(201).json(criado)
    })

    roteador.put('/:id', autenticar, exigirIdValido, validarCorpo(esquema), regrasDeNegocio, async (req, res) => {
        const item = await modelo.findById(req.params.id)
        if (!item) throw new ErroHttp(404, `${nomeSingular} não encontrado(a)`)

        // substituição completa: campos ausentes no corpo são removidos (createdAt é preservado)
        const dados = req.body as Record<string, unknown>
        for (const campo of Object.keys(modelo.schema.paths)) {
            if (CAMPOS_INTERNOS.has(campo)) continue
            item.set(campo, dados[campo])
        }
        await item.save()
        if (popular) await modelo.populate(item, { path: popular.caminho, select: popular.selecionar })
        res.json(item)
    })

    roteador.delete('/:id', autenticar, exigirIdValido, async (req, res) => {
        const removido = await modelo.findByIdAndDelete(req.params.id)
        if (!removido) throw new ErroHttp(404, `${nomeSingular} não encontrado(a)`)
        res.status(204).send()
    })

    return roteador
}

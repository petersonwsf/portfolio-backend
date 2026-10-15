import { type RequestHandler, Router } from 'express'
import { isValidObjectId, type Model } from 'mongoose'
import type { ZodType } from 'zod'
import { validarCorpo } from '../middlewares/validar'
import { ErroHttp } from '../utils/erros'

const CAMPOS_INTERNOS = new Set(['_id', '__v', 'createdAt', 'updatedAt'])

interface OpcoesCrud<T> {
    modelo: Model<T>
    esquema: ZodType<T>
    nomeSingular: string
    autenticar: RequestHandler
}

/**
 * Cria as rotas de um recurso de conteúdo:
 * leitura pública (GET) e escrita protegida (POST/PUT/DELETE exigem admin autenticado).
 */
export function criarRotasCrud<T>({ modelo, esquema, nomeSingular, autenticar }: OpcoesCrud<T>): Router {
    const roteador = Router()

    const exigirIdValido: RequestHandler = (req, _res, next) => {
        if (!isValidObjectId(req.params.id)) {
            next(new ErroHttp(400, 'Identificador inválido'))
            return
        }
        next()
    }

    roteador.get('/', async (_req, res) => {
        const itens = await modelo.find().sort({ ordem: 1, createdAt: 1 })
        res.json(itens)
    })

    roteador.get('/:id', exigirIdValido, async (req, res) => {
        const item = await modelo.findById(req.params.id)
        if (!item) throw new ErroHttp(404, `${nomeSingular} não encontrado(a)`)
        res.json(item)
    })

    roteador.post('/', autenticar, validarCorpo(esquema), async (req, res) => {
        const criado = await modelo.create(req.body as T)
        res.status(201).json(criado)
    })

    roteador.put('/:id', autenticar, exigirIdValido, validarCorpo(esquema), async (req, res) => {
        const item = await modelo.findById(req.params.id)
        if (!item) throw new ErroHttp(404, `${nomeSingular} não encontrado(a)`)

        // substituição completa: campos ausentes no corpo são removidos (createdAt é preservado)
        const dados = req.body as Record<string, unknown>
        for (const campo of Object.keys(modelo.schema.paths)) {
            if (CAMPOS_INTERNOS.has(campo)) continue
            item.set(campo, dados[campo])
        }
        await item.save()
        res.json(item)
    })

    roteador.delete('/:id', autenticar, exigirIdValido, async (req, res) => {
        const removido = await modelo.findByIdAndDelete(req.params.id)
        if (!removido) throw new ErroHttp(404, `${nomeSingular} não encontrado(a)`)
        res.status(204).send()
    })

    return roteador
}

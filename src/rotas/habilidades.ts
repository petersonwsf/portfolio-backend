import { type RequestHandler, Router } from 'express'
import { isValidObjectId } from 'mongoose'
import { z } from 'zod'
import { esquemaHabilidade } from '../esquemas/conteudo'
import { validarCorpo } from '../middlewares/validar'
import { Habilidade } from '../modelos/Habilidade'
import { ErroHttp } from '../utils/erros'
import { criarRotasCrud } from './criarRotasCrud'

const esquemaDominada = z.object({ dominada: z.boolean() })

/**
 * Habilidades/tecnologias:
 * - GET público devolve apenas as que o dono domina;
 * - `/catalogo` (admin) lista o catálogo completo para marcar o que se domina.
 */
export function criarRotasHabilidades(autenticar: RequestHandler): Router {
    const roteador = Router()

    roteador.get('/catalogo', autenticar, async (_req, res) => {
        res.json(await Habilidade.find().sort({ categoria: 1, nome: 1 }))
    })

    roteador.patch('/:id/dominada', autenticar, validarCorpo(esquemaDominada), async (req, res) => {
        if (!isValidObjectId(req.params.id)) throw new ErroHttp(400, 'Identificador inválido')
        const { dominada } = req.body as z.infer<typeof esquemaDominada>
        const habilidade = await Habilidade.findByIdAndUpdate(req.params.id, { dominada }, { new: true })
        if (!habilidade) throw new ErroHttp(404, 'Habilidade não encontrada')
        res.json(habilidade)
    })

    roteador.use(
        criarRotasCrud({
            modelo: Habilidade,
            esquema: esquemaHabilidade,
            nomeSingular: 'Habilidade',
            autenticar,
            filtroListagem: { dominada: true },
        })
    )

    return roteador
}

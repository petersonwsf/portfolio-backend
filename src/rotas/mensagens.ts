import { type RequestHandler, Router } from 'express'
import { isValidObjectId } from 'mongoose'
import { z } from 'zod'
import { validarCorpo } from '../middlewares/validar'
import { Mensagem } from '../modelos/Mensagem'
import { ErroHttp } from '../utils/erros'

const esquemaLeitura = z.object({ lida: z.boolean() })

/** Mensagens recebidas pelo formulário de contato: todas as rotas são exclusivas do admin. */
export function criarRotasMensagens(autenticar: RequestHandler): Router {
    const roteador = Router()
    roteador.use(autenticar)

    roteador.param('id', (_req, _res, next, id: string) => {
        if (!isValidObjectId(id)) {
            next(new ErroHttp(400, 'Identificador inválido'))
            return
        }
        next()
    })

    roteador.get('/', async (_req, res) => {
        res.json(await Mensagem.find().sort({ createdAt: -1 }))
    })

    roteador.patch('/:id', validarCorpo(esquemaLeitura), async (req, res) => {
        const { lida } = req.body as z.infer<typeof esquemaLeitura>
        const mensagem = await Mensagem.findByIdAndUpdate(req.params.id, { lida }, { new: true })
        if (!mensagem) throw new ErroHttp(404, 'Mensagem não encontrada')
        res.json(mensagem)
    })

    roteador.delete('/:id', async (req, res) => {
        const removida = await Mensagem.findByIdAndDelete(req.params.id)
        if (!removida) throw new ErroHttp(404, 'Mensagem não encontrada')
        res.status(204).send()
    })

    return roteador
}

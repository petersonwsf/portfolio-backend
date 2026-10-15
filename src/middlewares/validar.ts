import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'
import { ErroHttp } from '../utils/erros'

/** Valida `req.body` com o esquema informado e substitui pelo resultado já tratado. */
export function validarCorpo<T>(esquema: ZodType<T>): RequestHandler {
    return (req, _res, next) => {
        const resultado = esquema.safeParse(req.body)
        if (!resultado.success) {
            const detalhes = resultado.error.issues.map((item) => ({
                campo: item.path.join('.'),
                mensagem: item.message,
            }))
            next(new ErroHttp(400, 'Dados inválidos', detalhes))
            return
        }
        req.body = resultado.data
        next()
    }
}
